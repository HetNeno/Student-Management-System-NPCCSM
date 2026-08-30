export default function EmptyState({
  icon = 'fas fa-inbox',
  title = 'Nothing here yet',
  description = 'Data will appear here once it is available.',
  action,
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <i className={`${icon} text-2xl`} />
      </div>
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-slate-500">{description}</p>
      {action && onAction && (
        <button onClick={onAction} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors">
          {actionLabel || action}
        </button>
      )}
    </div>
  );
}
