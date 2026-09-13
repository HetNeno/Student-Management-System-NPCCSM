export default function ConnectionBanner({ show }) {
  if (!show) return null;
  return (
    <div className="rounded-xl p-3 text-xs md:text-sm font-bold text-center border shadow-sm bg-amber-50 border-amber-200 text-amber-700">
      <i className="fas fa-triangle-exclamation mr-2" />
      Running in offline mode (saved to this browser only) — start the PostgreSQL backend server to sync across devices.{' '}
      See <code className="font-mono bg-amber-100 px-1 rounded">server/.env.example</code> for setup.
    </div>
  );
}
