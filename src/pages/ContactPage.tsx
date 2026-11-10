import { useState } from "react";
import { Check, Loader2, Mail, AlertTriangle, Handshake, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// Must match CONTACT_TOPICS in server.mjs. Recipients are configured on the server
// only, so no email address appears on the site.
const TOPICS = [
  { value: "Collaboration", icon: Handshake, desc: "Questions about contributing data, collaborating with ALSmiR, or using the resource in your research." },
  { value: "General question", icon: Mail, desc: "Questions about ALSmiR, its content, or how to use it." },
  { value: "Technical problem with the website", icon: AlertTriangle, desc: "Something on the website is not working as expected." },
  { value: "Data issue (missing or inaccurate record)", icon: Database, desc: "A record is inaccurate or a relevant study is missing. Please include the publication DOI, miRNA species, and a short description of the issue." },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", topic: "", message: "" });
  const [website, setWebsite] = useState(""); // honeypot, hidden from people
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return toast.error("Please enter a valid email address.");
    if (!form.topic) return toast.error("Please choose a topic.");
    if (form.message.trim().length < 10) return toast.error("Please write a message (at least 10 characters).");
    setSending(true);
    try {
      const resp = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.ok) throw new Error(data.error || "The message could not be sent.");
      setDone(data.id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="container-page py-12">
        <div className="max-w-xl mx-auto card-academic p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-success/10 text-success flex items-center justify-center">
            <Check className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Message sent</h1>
          <p className="mt-2 text-muted-foreground">
            Thank you. Your reference is <span className="font-mono font-medium text-foreground">{done}</span>. The ALSmiR
            team will reply to {form.email}.
          </p>
          <Button className="mt-6" variant="outline" onClick={() => { setDone(null); setForm({ name: "", email: "", topic: "", message: "" }); }}>
            Send another message
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-12 md:py-16">
      <div className="max-w-5xl mx-auto space-y-10">
        <header>
          <h1 className="text-3xl font-semibold">Contact</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Questions, corrections or collaboration: send us a message and the ALSmiR team will reply by email.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <ul className="space-y-4">
            {TOPICS.map(({ value, icon: Icon, desc }) => (
              <li key={value} className="flex gap-3">
                <span className="h-9 w-9 shrink-0 rounded-md bg-secondary text-primary-dark inline-flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium">{value}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <form onSubmit={send} className="card-academic p-6 space-y-4" noValidate>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)}
              className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="c-name" className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
                <Input id="c-name" className="mt-1" value={form.name} onChange={(e) => set("name")(e.target.value)} autoComplete="name" />
              </div>
              <div>
                <label htmlFor="c-email" className="text-sm font-medium">Your email <span className="text-destructive">*</span></label>
                <Input id="c-email" type="email" className="mt-1" value={form.email} onChange={(e) => set("email")(e.target.value)} autoComplete="email" />
              </div>
            </div>
            <div>
              <label htmlFor="c-topic" className="text-sm font-medium">Topic <span className="text-destructive">*</span></label>
              <Select value={form.topic} onValueChange={set("topic")}>
                <SelectTrigger id="c-topic" className="mt-1"><SelectValue placeholder="Choose a topic" /></SelectTrigger>
                <SelectContent>
                  {TOPICS.map((t) => <SelectItem key={t.value} value={t.value}>{t.value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="c-message" className="text-sm font-medium">Message <span className="text-destructive">*</span></label>
              <Textarea id="c-message" className="mt-1 min-h-[160px]" value={form.message} onChange={(e) => set("message")(e.target.value)} maxLength={5000} />
              <p className="mt-1 text-xs text-muted-foreground text-right">{form.message.length} / 5000</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Your name and email are used only to reply to your message and are never published.
            </p>
            <Button type="submit" variant="hero" disabled={sending}>
              {sending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Sending…</> : "Send message"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
