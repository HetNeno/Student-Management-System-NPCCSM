import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, DASHBOARD_BY_ROLE } from '../../context/AuthContext';

/**
 * UX guard only. The Laravel API enforces authentication and roles on every
 * request, so bypassing this component exposes no data.
 */
export default function ProtectedRoute({ allowedRole, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#B24848] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location, message: 'Please sign in to continue.' }} replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    // Signed in, but this is another role's portal: send them to their own.
    return <Navigate to={DASHBOARD_BY_ROLE[user.role] || '/'} replace />;
  }

  return children;
}
