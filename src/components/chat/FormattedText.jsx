/**
 * Renders the assistant's plain-text answer with a small, safe subset of
 * formatting. No HTML is ever injected: everything becomes React elements.
 *  - "- " / "* " lines  -> bullet list
 *  - "1. " lines        -> numbered list
 *  - **bold**           -> <strong>
 *  - [1], [2] citations -> small source chips
 *  - "Correction:" / "General explanation:" lines get a highlighted label
 */
function inline(text, keyPrefix) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\[\d+\])/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={`${keyPrefix}-b${i++}`} className="font-bold text-stone-900">{token.slice(2, -2)}</strong>);
    } else {
      parts.push(
        <sup key={`${keyPrefix}-c${i++}`} className="mx-0.5 rounded bg-[#8B2635]/10 px-1 text-[9px] font-black text-[#8B2635]">
          {token.slice(1, -1)}
        </sup>
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const LABELS = [
  { re: /^correction:\s*/i, label: 'Correction', cls: 'bg-amber-100 text-amber-800' },
  { re: /^general explanation:\s*/i, label: 'General explanation', cls: 'bg-sky-100 text-sky-800' },
];

export default function FormattedText({ text }) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let list = null;

  const flush = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);

    if (bullet || numbered) {
      const type = bullet ? 'ul' : 'ol';
      if (!list || list.type !== type) {
        flush();
        list = { type, items: [] };
      }
      list.items.push(bullet ? bullet[1] : numbered[2]);
      return;
    }
    flush();
    if (!line.trim()) {
      blocks.push({ type: 'gap', key: idx });
      return;
    }
    const label = LABELS.find((l) => l.re.test(line.trim()));
    blocks.push({ type: 'p', text: label ? line.trim().replace(label.re, '') : line, label });
  });
  flush();

  return (
    <div className="space-y-1.5">
      {blocks.map((b, i) => {
        if (b.type === 'gap') return <div key={`g${i}`} className="h-1" />;
        if (b.type === 'ul' || b.type === 'ol') {
          const Tag = b.type;
          return (
            <Tag key={`l${i}`} className={`space-y-1 pl-5 ${b.type === 'ul' ? 'list-disc' : 'list-decimal'} marker:text-[#8B2635]/60`}>
              {b.items.map((item, j) => <li key={j}>{inline(item, `${i}-${j}`)}</li>)}
            </Tag>
          );
        }
        return (
          <p key={`p${i}`}>
            {b.label && <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${b.label.cls}`}>{b.label.label}</span>}
            {inline(b.text, `p${i}`)}
          </p>
        );
      })}
    </div>
  );
}
