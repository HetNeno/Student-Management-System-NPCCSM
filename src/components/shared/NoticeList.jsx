const PRIORITY = {
  urgent: { label: 'Urgent', cls: 'bg-rose-50 text-rose-700 ring-rose-200', icon: 'fa-solid fa-circle-exclamation' },
  important: { label: 'Important', cls: 'bg-amber-50 text-amber-700 ring-amber-200', icon: 'fa-solid fa-flag' },
  normal: { label: 'Notice', cls: 'bg-slate-100 text-slate-600 ring-slate-200', icon: 'fa-regular fa-bell' },
};

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Notices published by faculty / the principal.
 * `state` = { loading, error, items }. Optional `onDelete(notice)` for staff.
 */
export default function NoticeList({ state, limit, compact = false, onDelete }) {
  if (state.loading) return <p className="py-4 text-center text-xs text-slate-400" role="status">Loading notices…</p>;
  if (state.error) return <p className="py-4 text-center text-xs text-rose-600" role="alert">{state.error}</p>;
  if (!state.items.length) {
    return (
      <div className="py-6 text-center">
        <i className="fa-regular fa-bell-slash text-lg text-slate-300" />
        <p className="mt-2 text-xs text-slate-500">No notices right now.</p>
      </div>
    );
  }

  const items = limit ? state.items.slice(0, limit) : state.items;
  return (
    <ul className="space-y-2.5">
      {items.map((n, i) => {
        const p = PRIORITY[n.priority] || PRIORITY.normal;
        return (
          <li key={n.id} className="list-row-in rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${p.cls}`}>
                <i className={`${p.icon} mr-1`} />{p.label}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {formatDate(n.created_at)}
                {n.semester ? ` · Semester ${n.semester}` : ' · All semesters'}
                {n.subject_code ? ` · ${n.subject_code}` : ''}
              </span>
              {onDelete && n.can_delete && (
                <button type="button" onClick={() => onDelete(n)} className="ml-auto text-[11px] font-bold text-rose-600 hover:text-rose-800">Delete</button>
              )}
            </div>
            <p className="mt-1.5 text-sm font-bold text-slate-800">{n.title}</p>
            <p className={`mt-1 whitespace-pre-line text-xs leading-5 text-slate-600 ${compact ? 'line-clamp-2' : ''}`}>{n.body}</p>
            {!compact && n.posted_by && <p className="mt-1.5 text-[10px] font-semibold text-slate-400">— {n.posted_by}</p>}
          </li>
        );
      })}
    </ul>
  );
}
