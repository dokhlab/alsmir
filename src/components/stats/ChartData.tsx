// ─── Screen-reader table with the exact numbers behind a chart ───────────────
export function ChartData({ id, rows }: { id: string; rows: { name: string | number; value: number }[] }) {
  return (
    // Wrapper keeps the visually hidden table from widening the page on phones.
    <div className="relative h-0 overflow-hidden">
      <table className="sr-only" data-chart={id}>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.name)}><th>{r.name}</th><td>{r.value}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
