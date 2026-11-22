export default function ConnectionBanner({ show }) {
  if (!show) return null;
  return (
    <div className="rounded-xl p-3 text-xs md:text-sm font-bold text-center border shadow-sm bg-amber-50 border-amber-200 text-amber-700">
      <i className="fas fa-triangle-exclamation mr-2" />
      Backend connection lost. Start the Laravel API and verify MySQL configuration before continuing.
    </div>
  );
}
