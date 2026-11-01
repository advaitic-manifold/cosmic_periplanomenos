import { useEffect, useMemo, useRef, useState } from 'react';

type Cmd = { label: string; run: () => void };

export default function CommandPalette({ base }: { base: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const go = (path: string) => () => { location.href = `${base}${path}`; };
  const quality = (n: number) => () => dispatchEvent(new CustomEvent('universe:quality', { detail: n }));
  const cmds: Cmd[] = useMemo(() => [
    { label: 'Go home', run: go('') }, { label: 'Research', run: go('#research') },
    { label: 'Open COSMIC SENTINEL', run: go('cosmic-sentinel/') }, { label: 'Publications', run: go('#publications') },
    { label: 'Projects', run: go('#projects') }, { label: 'Timeline', run: go('#timeline') },
    { label: 'CV', run: go('#cv') }, { label: 'Contact', run: go('#contact') },
    { label: 'Quality: ultra', run: quality(0) }, { label: 'Quality: balanced', run: quality(2) }, { label: 'Quality: low (performance mode)', run: quality(3) },
  ], [base]);
  const shown = cmds.filter(c => c.label.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape') setOpen(false);
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, []);
  useEffect(() => { if (open) { setQ(''); input.current?.focus(); } }, [open]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Command palette" onClick={() => setOpen(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 20, background: '#000a', display: 'grid', placeItems: 'start center', paddingTop: '15vh' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(32rem, 92vw)', background: '#080c16', border: '1px solid var(--line)', padding: '1rem' }}>
        <input ref={input} value={q} onChange={e => setQ(e.target.value)} placeholder="Command…" aria-label="Search commands"
          onKeyDown={e => { if (e.key === 'Enter' && shown[0]) { shown[0].run(); setOpen(false); } }}
          style={{ width: '100%', background: 'transparent', color: 'inherit', border: 0, borderBottom: '1px solid var(--line)', padding: '.5rem', font: '14px ui-monospace, monospace' }} />
        <ul className="plain" style={{ margin: '.6rem 0 0' }}>
          {shown.map(c => (<li key={c.label}><button style={{ width: '100%', textAlign: 'left', border: 0 }} onClick={() => { c.run(); setOpen(false); }}>{c.label}</button></li>))}
        </ul>
      </div>
    </div>
  );
}
