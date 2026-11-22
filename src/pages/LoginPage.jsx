import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/shared/BrandLogo';

const ROLES = [
  {
    id: 'student',
    label: 'Student',
    path: '/student',
    icon: 'fas fa-user-graduate',
    color: '#3B82F6',
    desc: 'Track covered topics and exam-ready notes',
  },
  {
    id: 'teacher',
    label: 'Faculty',
    path: '/teacher',
    icon: 'fas fa-chalkboard-teacher',
    color: '#10B981',
    desc: 'Publish lectures, notes, and completion updates',
  },
  {
    id: 'principal',
    label: 'Principal',
    path: '/principal',
    icon: 'fas fa-user-tie',
    color: '#8B5CF6',
    desc: 'Monitor semester-wise academic delivery',
  },
];

/* Wave SVG components for background */
function LoginWaveBackground() {
  return (
    <div className="wave-bg">
      {/* Animated wave blobs */}
      <div className="wave-blob wave-blob-1" />
      <div className="wave-blob wave-blob-2" />
      <div className="wave-blob wave-blob-3" />

      {/* SVG Wave layers */}
      <div className="wave-layer wave-layer-1" style={{ bottom: '-5%', opacity: 0.06 }}>
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          <path fill="#A52A2A" d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,170.7C960,181,1056,171,1152,154.7C1248,139,1344,117,1392,106.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>
      <div className="wave-layer wave-layer-2" style={{ bottom: '-5%', opacity: 0.04 }}>
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          <path fill="#B24848" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,202.7C1248,181,1344,171,1392,165.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>
      <div className="wave-layer wave-layer-3" style={{ bottom: '-5%', opacity: 0.03 }}>
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          <path fill="#C46060" d="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,234.7C672,256,768,288,864,282.7C960,277,1056,235,1152,213.3C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeRole, setActiveRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const role = params.get('role');
    if (ROLES.some((item) => item.id === role)) {
      setActiveRole(role);
    }
  }, [location.search]);

  useEffect(() => {
    if (user) {
      const roleTarget = ROLES.find((r) => r.id === user.role)?.path || '/student';
      navigate(roleTarget, { replace: true });
    }
  }, [user, navigate]);

  const selectedRoleConfig = ROLES.find((r) => r.id === activeRole) || ROLES[0];

  const handleRoleChange = (roleId) => {
    setActiveRole(roleId);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      // The role tabs only change the page's hints. The account's real role
      // comes from the server and decides the dashboard.
      const result = await login({ email, password, remember });
      if (!result.success) {
        setErrorMsg(result.error);
      } else {
        const from = location.state?.from?.pathname;
        const home = result.redirect || '/student';
        navigate(from && from.startsWith(home) ? from : home, { replace: true });
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'linear-gradient(180deg, #FFF8F7 0%, #FFFFFF 40%, #FFF0EF 100%)' }}>
      {/* Wave Background with blur effect */}
      <LoginWaveBackground />

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div
          className={`w-full max-w-5xl grid gap-10 lg:grid-cols-[1fr_1fr] transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Left Side - Branding */}
          <div className="flex flex-col justify-center space-y-8">
            {/* Logo + Brand */}
            <div
              className={`transition-all duration-700 delay-100 ${
                mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              }`}
            >
              <Link to="/" className="mb-6 inline-block" aria-label="NPCCSM portal home">
                <BrandLogo className="h-14 sm:h-16" framed />
              </Link>
            </div>

            {/* Main Heading */}
            <div
              className={`transition-all duration-700 delay-200 ${
                mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              }`}
            >
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight" style={{ color: '#1E293B' }}>
                Welcome Back
              </h1>
              <p className="mt-4 text-lg leading-relaxed max-w-md" style={{ color: '#475569' }}>
                Your intelligent academic companion. Track syllabus coverage, manage lectures, and accelerate your learning journey.
              </p>
            </div>

            {/* Stats */}
            <div
              className={`grid gap-4 sm:grid-cols-3 transition-all duration-700 delay-300 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {[
                { icon: 'fas fa-users', label: '3 Roles', sub: 'Student, Faculty, Admin' },
                { icon: 'fas fa-layer-group', label: '6 Semesters', sub: 'Complete BCA Curriculum' },
                { icon: 'fas fa-bolt', label: 'AI Powered', sub: 'Smart Career Guidance' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="group rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                  style={{ borderColor: 'rgba(178, 72, 72, 0.12)' }}
                >
                  <div
                    className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-white"
                    style={{ background: 'linear-gradient(135deg, #B24848, #C46060)' }}
                  >
                    <i className={`${stat.icon} text-sm`} />
                  </div>
                  <div className="text-lg font-bold" style={{ color: '#1E293B' }}>{stat.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Login Card */}
          <div
            className={`flex items-center justify-center transition-all duration-700 delay-400 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="w-full max-w-md">
              <div
                className="rounded-3xl border bg-white p-8"
                style={{
                  boxShadow: '0 20px 40px -12px rgba(165, 42, 42, 0.15), 0 4px 6px -4px rgba(0,0,0,0.04)',
                  borderColor: 'rgba(178, 72, 72, 0.15)',
                }}
              >
                {/* Card Header */}
                <div className="mb-8">
                  <div
                    className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white mb-4 shadow-md"
                    style={{ background: 'linear-gradient(135deg, #A52A2A, #B24848)' }}
                  >
                    <i className="fas fa-user text-lg" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#1E293B' }}>Sign In</h2>
                  <p className="mt-1.5 text-sm" style={{ color: '#94A3B8' }}>Enter your credentials to continue</p>
                </div>

                {/* Role Selector */}
                <div className="mb-6 grid grid-cols-3 gap-2" role="group" aria-label="Choose your portal">
                  {ROLES.map((role) => {
                    const isActive = role.id === activeRole;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => handleRoleChange(role.id)}
                        className={`group rounded-xl border-2 p-3 text-center transition-all duration-200 ${
                          isActive
                            ? 'border-current shadow-sm'
                            : 'hover:border-opacity-50'
                        }`}
                        style={isActive ? {
                          borderColor: role.color,
                          background: `${role.color}10`,
                          boxShadow: `0 0 0 3px ${role.color}15`,
                        } : {
                          borderColor: '#E2E8F0',
                          background: '#FFFFFF',
                        }}
                      >
                        <div
                          className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-white text-sm transition-all duration-200 ${
                            isActive ? 'shadow-md scale-105' : 'group-hover:scale-105'
                          }`}
                          style={{ background: `linear-gradient(135deg, ${role.color}, ${role.color}dd)` }}
                        >
                          <i className={`${role.icon}`} />
                        </div>
                        <div className={`text-xs font-semibold ${isActive ? '' : ''}`}
                          style={{ color: isActive ? role.color : '#94A3B8' }}>
                          {role.label}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!errorMsg && (location.state?.error || location.state?.message) && (
                  <div role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <i className="fas fa-circle-info mt-0.5" />
                    <span>{location.state.error || location.state.message}</span>
                  </div>
                )}

                {/* Error Message */}
                {errorMsg && (
                  <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" style={{ animation: 'shake 0.5s ease-in-out' }}>
                    <i className="fas fa-exclamation-circle mt-0.5 text-red-500" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div>
                    <label htmlFor="login-email" className="mb-2 block text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>
                      Email address
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center" style={{ color: '#94A3B8' }}>
                        <i className="fas fa-envelope text-sm" />
                      </span>
                      <input
                        id="login-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={`${selectedRoleConfig.label.toLowerCase()}@example.com`}
                        className="w-full rounded-xl border py-3.5 pl-11 pr-4 text-sm outline-none transition-all duration-200"
                        style={{
                          background: '#F8FAFC',
                          borderColor: '#E2E8F0',
                          color: '#1E293B',
                        }}
                        onFocus={(e) => {
                          e.target.style.background = '#FFFFFF';
                          e.target.style.borderColor = '#D48080';
                          e.target.style.boxShadow = '0 0 0 3px rgba(178, 72, 72, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.background = '#F8FAFC';
                          e.target.style.borderColor = '#E2E8F0';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>
                      Password
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center" style={{ color: '#94A3B8' }}>
                        <i className="fas fa-lock text-sm" />
                      </span>
                      <input
                        id="login-password"
                        aria-label="Password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full rounded-xl border py-3.5 pl-11 pr-11 text-sm outline-none transition-all duration-200"
                        style={{
                          background: '#F8FAFC',
                          borderColor: '#E2E8F0',
                          color: '#1E293B',
                        }}
                        onFocus={(e) => {
                          e.target.style.background = '#FFFFFF';
                          e.target.style.borderColor = '#D48080';
                          e.target.style.boxShadow = '0 0 0 3px rgba(178, 72, 72, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.background = '#F8FAFC';
                          e.target.style.borderColor = '#E2E8F0';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-4 flex items-center transition-colors hover:text-opacity-80"
                        style={{ color: '#94A3B8' }}
                      >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-[#A52A2A]"
                    />
                    Keep me signed in on this device
                  </label>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="group relative w-full overflow-hidden rounded-xl py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:translate-y-[-1px] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #A52A2A, #B24848)' }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {submitting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Sign In
                          <i className="fas fa-arrow-right text-xs transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </span>
                  </button>
                </form>

                <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
                  {activeRole === 'student' ? (
                    <>
                      New student?{' '}
                      <Link to="/signup" className="font-bold text-[#A52A2A] hover:underline">
                        Create your account
                      </Link>
                    </>
                  ) : (
                    <span>
                      {selectedRoleConfig.label} accounts are created by the principal. Contact the college office if you need access.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
