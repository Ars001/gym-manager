// Searchable member picker (typeahead combobox).
// WHY: a plain <select> of every member is unusable once a gym has dozens/
// hundreds of them. Here you type a name/email and pick from filtered matches.

import { useState, useRef } from 'react';

export default function MemberPicker({ members, value, onChange, placeholder = 'Search member by name…' }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const blurTimer = useRef(null);

  const selected = members.find((m) => m.id === value);
  const query = q.trim().toLowerCase();
  const list = members
    .filter((m) =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(query) ||
      (m.email || '').toLowerCase().includes(query))
    .slice(0, 8);

  function choose(m) {
    onChange(m.id);
    setQ(`${m.first_name} ${m.last_name}`);
    setOpen(false);
  }
  function clear() {
    onChange('');
    setQ('');
    setOpen(true);
  }

  // When not actively searching, show the selected member's name.
  const inputVal = open ? q : (selected ? `${selected.first_name} ${selected.last_name}` : q);

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={inputVal}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); if (selected) setQ(''); }}
        onChange={(e) => { setQ(e.target.value); if (value) onChange(''); setOpen(true); }}
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150); }}
      />
      {selected && !open && (
        <button type="button" onClick={clear} aria-label="Clear selection"
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
            width: 'auto', padding: 0, fontSize: 18, lineHeight: 1 }}>×</button>
      )}
      {open && list.length > 0 && (
        <div onMouseDown={() => clearTimeout(blurTimer.current)}
          style={{ position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0, marginTop: 4,
            background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 10,
            boxShadow: 'var(--shadow)', maxHeight: 260, overflowY: 'auto' }}>
          {list.map((m) => (
            <div key={m.id} onClick={() => choose(m)}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13.5 }}>
              {m.first_name} {m.last_name}
              {m.email ? <span className="muted"> · {m.email}</span> : null}
            </div>
          ))}
        </div>
      )}
      {open && query && list.length === 0 && (
        <div style={{ position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 10,
          boxShadow: 'var(--shadow)', padding: '9px 12px' }} className="muted">No matches.</div>
      )}
    </div>
  );
}
