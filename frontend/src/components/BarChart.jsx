// Minimal dependency-free vertical bar chart (CSS bars) for small time series.
// data: [{ label, value }]. Optional `format` maps a value to its display label.
export default function BarChart({ data, format }) {
  if (!data || data.length === 0) return <p className="muted" style={{ margin: 0 }}>No data yet.</p>;
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150, paddingTop: 6 }}>
      {data.map((d, i) => {
        const v = Number(d.value) || 0;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{format ? format(v) : v}</div>
            <div style={{
              width: '80%', background: 'var(--color-primary)', borderRadius: '6px 6px 0 0',
              height: `${Math.round((v / max) * 100)}%`, minHeight: v > 0 ? 4 : 0,
            }} />
            <div className="muted" style={{ fontSize: 10.5, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}
