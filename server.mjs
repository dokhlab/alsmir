// ALSmiR web server: serves the built site (dist/) and receives data submissions.
//
// POST /api/submit  saves the submission to SUBMISSIONS_DIR/<id>/ and emails it to
//                   ALSMIR_SUBMISSION_EMAIL through Resend.
// GET  /api/health  liveness check.
//
// Environment: PORT, STATIC_DIR, SUBMISSIONS_DIR, ALSMIR_SUBMISSION_EMAIL,
//              RESEND_API_KEY, RESEND_FROM_EMAIL (secrets come from confs/dokhlab.env).
// Node 20 standard library only.
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

const PORT = Number(process.env.PORT || 3000);
const STATIC_DIR = path.resolve(process.env.STATIC_DIR || "dist");
const SUBMISSIONS_DIR = process.env.SUBMISSIONS_DIR || "/submissions";
const NOTIFY_EMAIL = process.env.ALSMIR_SUBMISSION_EMAIL || "";
// Contact-form recipients (comma-separated). Kept in server settings only, never in the website code.
const CONTACT_EMAILS = (process.env.ALSMIR_CONTACT_EMAIL || "").split(",").map((e) => e.trim()).filter(Boolean);
const MESSAGES_DIR = process.env.ALSMIR_MESSAGES_DIR || "/messages";
const CONTACT_TOPICS = ["General question", "Data issue (missing or inaccurate record)", "Collaboration", "Technical problem with the website"];
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "";

const MAX_BODY_BYTES = 15 * 1024 * 1024;     // JSON body incl. base64 attachment
const MAX_FILE_BYTES = 10 * 1024 * 1024;     // decoded attachment
const ALLOWED_FILE_EXT = new Set([".csv", ".tsv", ".txt", ".xls", ".xlsx"]);
const HOUR = 60 * 60 * 1000;
const RATE_LIMIT = {
  acceptedPerIp: 5,        // saved submissions per visitor per hour
  attemptsPerIp: 30,       // any POST to /api/submit per visitor per hour (incl. failed validation)
  acceptedPerDay: 50,      // saved submissions for the whole site per 24 h (protects the inbox and email quota)
  messagesPerIp: 5,        // contact messages per visitor per hour
  messagesPerDay: 100,     // contact messages for the whole site per 24 h
};

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2",
};

const log = (...a) => console.log(new Date().toISOString(), ...a);

// Saved submissions stay editable by the html group (curators can move or delete them).
process.umask(0o002);

const badRequest = (status = 400, message = "Bad request") => Object.assign(new Error(message), { status });

/** Path of a request URL. Malformed URLs (e.g. "//", bad %-encoding) are a 400, never a crash. */
function requestPath(req) {
  try {
    return new URL(String(req.url || "/").replace(/^\/+/, "/"), "http://x").pathname;
  } catch {
    throw badRequest();
  }
}

// ── Static site (single-page app: unknown paths fall back to index.html) ─────
async function serveStatic(req, res) {
  let urlPath;
  try { urlPath = decodeURIComponent(requestPath(req)); } catch { throw badRequest(); }
  let file = path.join(STATIC_DIR, path.normalize(urlPath));
  if (!file.startsWith(STATIC_DIR)) return send(res, 403, "Forbidden");
  let info = await stat(file).catch(() => null);
  if (info?.isDirectory()) { file = path.join(file, "index.html"); info = await stat(file).catch(() => null); }
  if (!info) { file = path.join(STATIC_DIR, "index.html"); info = await stat(file).catch(() => null); }
  if (!info) return send(res, 404, "Not found");
  const ext = path.extname(file);
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Content-Length": info.size,
    "Cache-Control": file.includes(`${path.sep}assets${path.sep}`) ? "public, max-age=31536000, immutable" : "no-cache",
  });
  if (req.method === "HEAD") return res.end();
  createReadStream(file).pipe(res);
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}
const sendJson = (res, status, obj) => send(res, status, JSON.stringify(obj), "application/json");

// ── Submissions ──────────────────────────────────────────────────────────────
// Sliding-window counters kept in memory: visitor -> timestamps (pruned below).
const attempts = new Map();
const accepted = new Map();
const acceptedSite = [];
const messages = new Map();
const messagesSite = [];

const within = (times, ms) => times.filter((t) => Date.now() - t < ms);
function count(map, key, ms) {
  const times = within(map.get(key) || [], ms);
  map.set(key, times);
  return times.length;
}
function remember(map, key) { map.set(key, [...(map.get(key) || []), Date.now()]); }

setInterval(() => {
  for (const map of [attempts, accepted, messages]) {
    for (const [key, times] of map) {
      const kept = within(times, HOUR);
      if (kept.length) map.set(key, kept); else map.delete(key);
    }
  }
  acceptedSite.splice(0, acceptedSite.length, ...within(acceptedSite, 24 * HOUR));
  messagesSite.splice(0, messagesSite.length, ...within(messagesSite, 24 * HOUR));
}, 10 * 60 * 1000).unref();

/**
 * The visitor's address. Traffic arrives through Cloudflare, which sets CF-Connecting-IP
 * itself; unlike X-Forwarded-For, visitors cannot add their own value to it.
 */
function clientIp(req) {
  return String(req.headers["cf-connecting-ip"] || req.headers["x-real-ip"] || req.socket.remoteAddress || "unknown").trim();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) { reject(Object.assign(new Error("Submission is too large."), { status: 413 })); req.destroy(); }
      else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const str = (v, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Validate and normalise the posted form. Throws { status: 400 } with a readable message. */
function validate(body) {
  const fail = (m) => { throw Object.assign(new Error(m), { status: 400 }); };
  const s = body.submitter || {}, p = body.publication || {};
  const submitter = { name: str(s.name, 200), email: str(s.email, 200), affiliation: str(s.affiliation, 300) };
  if (!submitter.name) fail("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitter.email)) fail("Please enter a valid email address.");
  const publication = { title: str(p.title, 500), doi: str(p.doi, 300), year: str(p.year, 10), location: str(p.location, 200) };
  if (!publication.title) fail("Please enter the study title.");
  if (!publication.doi) fail("Please enter the DOI.");
  // Publication -> Cohort -> Biospecimen/sample -> Comparison/subgroup -> miRNA result: each result names its cohort.
  const rawCohorts = Array.isArray(body.cohorts) ? body.cohorts : [];
  if (rawCohorts.length < 1) fail("Please enter at least one cohort.");
  if (rawCohorts.length > MAX_COHORTS) fail(`Please enter at most ${MAX_COHORTS} cohorts.`);
  const cohorts = rawCohorts.map((c, i) => ({
    cohort: i + 1,
    fields: Object.fromEntries(Object.entries(c && typeof c === "object" ? c : {})
      .filter(([k]) => k !== "cohort").slice(0, 50).map(([k, v]) => [str(k, 50), str(v, 500)])),
  }));
  const results = (Array.isArray(body.results) ? body.results : []).slice(0, 2000).map((r, i) => {
    const o = r && typeof r === "object" ? r : {};
    const row = {
      cohort: str(o.cohort, 5), microRNA: str(o.microRNA, 300), direction: str(o.direction, 50), alsGroup: str(o.alsGroup, 300),
      comparison: str(o.comparison, 300), foldChange: str(o.foldChange, 300), statistic: str(o.statistic, 300), notes: str(o.notes, 1000),
    };
    const where = `miRNA result ${i + 1}`;
    const n = Number(row.cohort);
    if (!Number.isInteger(n) || n < 1 || n > cohorts.length) fail(`${where}: please choose the cohort.`);
    if (!row.microRNA) fail(`${where}: please enter the miRNA.`);
    if (!DIRECTIONS.has(row.direction)) fail(`${where}: please choose the expression direction.`);
    if (!row.comparison) fail(`${where}: please describe the comparison.`);
    return row;
  });
  if (results.length === 0) fail("Please add at least one miRNA result.");
  if (body.declaration !== true) fail("Please confirm the data sharing declaration.");

  let attachment = null;
  if (body.attachment && body.attachment.content) {
    const name = path.basename(str(body.attachment.name, 200)).replace(/[^\w.\- ]+/g, "_") || "supplementary";
    if (!ALLOWED_FILE_EXT.has(path.extname(name).toLowerCase())) fail("The supplementary file must be CSV, TSV, TXT, XLS or XLSX.");
    const buf = Buffer.from(String(body.attachment.content), "base64");
    if (buf.length > MAX_FILE_BYTES) fail("The supplementary file must be 10 MB or smaller.");
    attachment = { name, buf };
  }
  return { submitter, publication, cohorts, results, notes: str(body.notes, 5000), attachment };
}

const MAX_COHORTS = 20;
const DIRECTIONS = new Set(["Upregulated", "Downregulated", "No significant change"]);
/** Labels for the cohort fields in the email, in form order. */
const COHORT_LABELS = {
  tissue: "Biospecimen/tissue (as reported)", method: "Method", form: "Form of ALS at population level",
  diagnosis: "Diagnosis criteria", mutations: "Mutations reported", alsN: "ALS patients (total)",
  sexFemale: "ALS patients — female", sexMale: "ALS patients — male", onset: "Site of onset", ageOnset: "Age at onset",
  ageStudy: "Age at study", diseaseDuration: "Disease duration", alsfrs: "ALSFRS / ALSFRS-R", treatment: "Therapeutic treatment",
  controlType: "Type of control", controlN: "Controls (total)", controlSexFemale: "Controls — female",
  controlSexMale: "Controls — male", controlAgeStudy: "Controls — age at study",
};

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

async function sendEmail(record, attachment) {
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL || !NOTIFY_EMAIL) throw new Error("Email is not configured");
  const { id, submitter, publication, cohorts } = record;
  const row = (k, v) => `<tr><td style="padding:2px 12px 2px 0;color:#555">${esc(k)}</td><td>${esc(v) || "—"}</td></tr>`;
  const nResults = cohorts.reduce((n, c) => n + c.results.length, 0);
  const th = (t) => `<th style="text-align:left;padding:3px 8px;border-bottom:1px solid #ccc">${esc(t)}</th>`;
  const td = (t) => `<td style="padding:3px 8px;border-bottom:1px solid #eee">${esc(t) || "—"}</td>`;
  const cohortHtml = cohorts.map((c) => `
    <h3 style="font-family:sans-serif;margin:18px 0 6px">Cohort ${c.cohort}</h3>
    <table style="font-family:sans-serif;font-size:14px">
      ${Object.entries(COHORT_LABELS).map(([k, label]) => row(label, c.fields[k])).join("")}
    </table>
    <p style="font-family:sans-serif;font-size:14px;margin:8px 0 4px"><b>miRNA results from Cohort ${c.cohort}</b> (${c.results.length})</p>
    ${c.results.length ? `<table style="font-family:sans-serif;font-size:13px;border-collapse:collapse">
      <tr>${["miRNA", "Expression direction", "ALS group/subgroup", "Comparison", "Fold change", "Statistical result", "Notes"].map(th).join("")}</tr>
      ${c.results.map((r) => `<tr>${[r.microRNA, r.direction, r.alsGroup, r.comparison, r.foldChange, r.statistic, r.notes].map(td).join("")}</tr>`).join("")}
    </table>` : ""}`).join("");
  const html = `
    <h2 style="font-family:sans-serif">New ALSmiR data submission</h2>
    <p style="font-family:sans-serif">Submission <b>${esc(id)}</b>, received ${esc(record.receivedAt)}.
      Saved on the server in <code>storage/alsmir/submissions/${esc(id)}/</code>.</p>
    <table style="font-family:sans-serif;font-size:14px">
      ${row("Name", submitter.name)}${row("Email", submitter.email)}${row("Affiliation", submitter.affiliation)}
      ${row("Study title", publication.title)}${row("DOI", publication.doi)}
      ${row("Year", publication.year)}${row("Location of study", publication.location)}
      ${row("Cohorts", cohorts.length)}${row("miRNA results", nResults)}${row("Supplementary file", attachment ? attachment.name : "")}
      ${row("Notes", record.notes)}
    </table>
    ${cohortHtml}
    <p style="font-family:sans-serif">The full submission is attached as JSON. Reply to this email to contact the submitter.</p>`;
  const attachments = [{ filename: `${id}.json`, content: Buffer.from(JSON.stringify(record, null, 2)).toString("base64") }];
  if (attachment) attachments.push({ filename: attachment.name, content: attachment.buf.toString("base64") });
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [NOTIFY_EMAIL],
      reply_to: submitter.email,
      subject: `ALSmiR data submission ${id}: ${publication.title}`.slice(0, 200),
      html,
      attachments,
    }),
  });
  if (!resp.ok) throw new Error(`Resend ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
}

const newId = (now) => `SUB-${now.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15)}-${randomBytes(6).toString("hex")}`;
const tooMany = (res) => sendJson(res, 429, { ok: false, error: "Too many requests right now. Please try again later." });

async function handleSubmit(req, res) {
  const ip = clientIp(req);
  try {
    if (count(attempts, ip, HOUR) >= RATE_LIMIT.attemptsPerIp) return tooMany(res);
    remember(attempts, ip);
    let body;
    try { body = JSON.parse(await readBody(req)); } catch (e) { if (e.status) throw e; return sendJson(res, 400, { ok: false, error: "Invalid submission." }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return sendJson(res, 400, { ok: false, error: "Invalid submission." });
    // Honeypot: bots fill the hidden field. Reply like a real submission and drop it.
    if (str(body.website)) return sendJson(res, 200, { ok: true, id: newId(new Date()), emailed: true });
    const data = validate(body);
    if (count(accepted, ip, HOUR) >= RATE_LIMIT.acceptedPerIp || within(acceptedSite, 24 * HOUR).length >= RATE_LIMIT.acceptedPerDay) {
      log("submission refused: rate limit", ip);
      return tooMany(res);
    }

    const now = new Date();
    const id = newId(now);
    const dir = path.join(SUBMISSIONS_DIR, id);
    await mkdir(dir); // fails rather than merging if the ID already exists
    remember(accepted, ip);
    acceptedSite.push(Date.now());
    const record = {
      id, receivedAt: now.toISOString(), submitter: data.submitter, publication: data.publication,
      // Each cohort carries its own results, so every result stays traceable to its cohort and comparison.
      cohorts: data.cohorts.map((c) => ({ ...c, results: data.results.filter((r) => Number(r.cohort) === c.cohort).map(({ cohort, ...r }) => r) })),
      notes: data.notes,
      attachment: data.attachment ? `upload-${data.attachment.name}` : null, client: { ip, userAgent: str(req.headers["user-agent"], 300) },
    };
    if (data.attachment) await writeFile(path.join(dir, `upload-${data.attachment.name}`), data.attachment.buf);
    await writeFile(path.join(dir, "submission.json"), JSON.stringify(record, null, 2));
    log("submission saved", id, `${data.cohorts.length} cohorts, ${data.results.length} results`, data.attachment ? `file ${data.attachment.name}` : "");

    let emailed = true;
    try { await sendEmail(record, data.attachment); log("submission emailed", id, "->", NOTIFY_EMAIL); }
    catch (e) { emailed = false; log("EMAIL FAILED", id, e.message); await writeFile(path.join(dir, "EMAIL_FAILED.txt"), `${e.message}\n`); }
    return sendJson(res, 200, { ok: true, id, emailed });
  } catch (e) {
    if (e.status) return sendJson(res, e.status, { ok: false, error: e.message });
    log("SUBMISSION ERROR", e);
    return sendJson(res, 500, { ok: false, error: "The submission could not be saved. Please try again later or use the contact form." });
  }
}

// ── Contact form ─────────────────────────────────────────────────────────────
async function sendResend(payload) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Resend ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
}

async function handleContact(req, res) {
  const ip = clientIp(req);
  try {
    if (count(attempts, ip, HOUR) >= RATE_LIMIT.attemptsPerIp) return tooMany(res);
    remember(attempts, ip);
    let body;
    try { body = JSON.parse(await readBody(req)); } catch (e) { if (e.status) throw e; return sendJson(res, 400, { ok: false, error: "Invalid message." }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return sendJson(res, 400, { ok: false, error: "Invalid message." });
    if (str(body.website)) return sendJson(res, 200, { ok: true, id: newId(new Date()).replace("SUB-", "MSG-") });

    const msg = { name: str(body.name, 200), email: str(body.email, 200), topic: str(body.topic, 100), message: str(body.message, 5000) };
    if (!msg.name) return sendJson(res, 400, { ok: false, error: "Please enter your name." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.email)) return sendJson(res, 400, { ok: false, error: "Please enter a valid email address." });
    if (!CONTACT_TOPICS.includes(msg.topic)) return sendJson(res, 400, { ok: false, error: "Please choose a topic." });
    if (msg.message.length < 10) return sendJson(res, 400, { ok: false, error: "Please write a message (at least 10 characters)." });
    if (count(messages, ip, HOUR) >= RATE_LIMIT.messagesPerIp || within(messagesSite, 24 * HOUR).length >= RATE_LIMIT.messagesPerDay) {
      log("message refused: rate limit", ip);
      return tooMany(res);
    }
    remember(messages, ip);
    messagesSite.push(Date.now());

    const now = new Date();
    const id = newId(now).replace("SUB-", "MSG-");
    const record = { id, receivedAt: now.toISOString(), ...msg, client: { ip, userAgent: str(req.headers["user-agent"], 300) } };
    await mkdir(MESSAGES_DIR, { recursive: true });
    await writeFile(path.join(MESSAGES_DIR, `${id}.json`), JSON.stringify(record, null, 2), { flag: "wx" });
    log("message saved", id, msg.topic);

    let emailed = true;
    try {
      if (!RESEND_API_KEY || !RESEND_FROM_EMAIL || CONTACT_EMAILS.length === 0) throw new Error("Email is not configured");
      await sendResend({
        from: RESEND_FROM_EMAIL,
        to: CONTACT_EMAILS,
        reply_to: msg.email,
        subject: `ALSmiR contact: ${msg.topic} (${id})`.slice(0, 200),
        html: `<h2 style="font-family:sans-serif">ALSmiR contact message</h2>
          <table style="font-family:sans-serif;font-size:14px">
            <tr><td style="padding:2px 12px 2px 0;color:#555">From</td><td>${esc(msg.name)} &lt;${esc(msg.email)}&gt;</td></tr>
            <tr><td style="padding:2px 12px 2px 0;color:#555">Topic</td><td>${esc(msg.topic)}</td></tr>
            <tr><td style="padding:2px 12px 2px 0;color:#555">Reference</td><td>${esc(id)}, ${esc(record.receivedAt)}</td></tr>
          </table>
          <p style="font-family:sans-serif;white-space:pre-wrap;border-left:3px solid #ccc;padding-left:10px">${esc(msg.message)}</p>
          <p style="font-family:sans-serif;color:#555">Reply to this email to answer the sender.</p>`,
        text: `ALSmiR contact message\nFrom: ${msg.name} <${msg.email}>\nTopic: ${msg.topic}\nReference: ${id}\n\n${msg.message}\n`,
      });
      log("message emailed", id, "->", CONTACT_EMAILS.join(", "));
    } catch (e) {
      emailed = false;
      log("MESSAGE EMAIL FAILED", id, e.message);
      await writeFile(path.join(MESSAGES_DIR, `${id}.EMAIL_FAILED.txt`), `${e.message}\n`);
    }
    return sendJson(res, 200, { ok: true, id, emailed });
  } catch (e) {
    if (e.status) return sendJson(res, e.status, { ok: false, error: e.message });
    log("MESSAGE ERROR", e);
    return sendJson(res, 500, { ok: false, error: "The message could not be sent. Please try again later." });
  }
}

function fail(res, e) {
  if (res.headersSent) return res.destroy();
  if (e?.status) return send(res, e.status, e.message);
  log("request error", e);
  return send(res, 500, "Error");
}

// Last line of defence: log anything that slips through, then let Docker restart cleanly.
process.on("uncaughtException", (e) => { log("FATAL uncaught exception", e); process.exit(1); });
process.on("unhandledRejection", (e) => { log("unhandled rejection", e); });

createServer((req, res) => {
  try {
    const pathname = requestPath(req);
    if (pathname === "/api/submit") return req.method === "POST" ? handleSubmit(req, res) : sendJson(res, 405, { ok: false, error: "Use POST" });
    if (pathname === "/api/contact") return req.method === "POST" ? handleContact(req, res) : sendJson(res, 405, { ok: false, error: "Use POST" });
    if (pathname === "/api/health") return sendJson(res, 200, { ok: true });
    if (req.method === "GET" || req.method === "HEAD") return serveStatic(req, res).catch((e) => fail(res, e));
    return send(res, 405, "Method not allowed");
  } catch (e) {
    return fail(res, e);
  }
}).listen(PORT, () => log(`ALSmiR server on :${PORT}, static ${STATIC_DIR}, submissions ${SUBMISSIONS_DIR}, notify ${NOTIFY_EMAIL || "(none)"}, contact messages ${MESSAGES_DIR} -> ${CONTACT_EMAILS.length} recipient(s)`));
