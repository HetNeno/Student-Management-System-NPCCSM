import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';

const ROLES = [
  {
    id: 'student',
    label: 'Student',
    path: '/student',
    icon: 'fas fa-user-graduate',
    color: '#3B82F6',
    desc: 'Track covered topics and exam-ready notes',
    defaultUser: 'student',
    defaultPass: 'student123',
  },
  {
    id: 'teacher',
    label: 'Faculty',
    path: '/teacher',
    icon: 'fas fa-chalkboard-teacher',
    color: '#10B981',
    desc: 'Publish lectures, notes, and completion updates',
    defaultUser: 'teacher',
    defaultPass: 'teacher123',
  },
  {
    id: 'principal',
    label: 'Principal',
    path: '/principal',
    icon: 'fas fa-user-tie',
    color: '#8B5CF6',
    desc: 'Monitor semester-wise academic delivery',
    defaultUser: 'principal',
    defaultPass: 'principal123',
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeRole, setActiveRole] = useState('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => { setMounted(true); }, []);

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

  const handleQuickFill = () => {
    setUsername(selectedRoleConfig.defaultUser);
    setPassword(selectedRoleConfig.defaultPass);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await login({ username, password, role: activeRole });
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Subtle decorative shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-30"
          style={{ background: `radial-gradient(circle, ${selectedRoleConfig.color}15, transparent 70%)` }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${selectedRoleConfig.color}20, transparent 70%)` }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div
          className={`w-full max-w-5xl grid gap-10 lg:grid-cols-[1fr_1fr] transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Left Side - Branding */}
          <div className="flex flex-col justify-center space-y-8">
            {/* Logo */}
            <div
              className={`transition-all duration-700 delay-100 ${
                mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              }`}
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${selectedRoleConfig.color}, ${selectedRoleConfig.color}dd)` }}>
                  <i className="fas fa-graduation-cap text-2xl text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">NPCCSM</h2>
                  <p className="text-xs font-medium text-slate-500 tracking-wide">Academic Command Center</p>
                </div>
              </div>
            </div>

            {/* Main Heading */}
            <div
              className={`transition-all duration-700 delay-200 ${
                mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              }`}
            >
              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
                Welcome Back
              </h1>
              <p className="mt-4 text-lg text-slate-600 leading-relaxed max-w-md">
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
                  className="group rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5"
                >
                  <div
                    className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-white"
                    style={{ background: `linear-gradient(135deg, ${selectedRoleConfig.color}dd, ${selectedRoleConfig.color})` }}
                  >
                    <i className={`${stat.icon} text-sm`} />
                  </div>
                  <div className="text-lg font-bold text-slate-800">{stat.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{stat.sub}</div>
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
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50">
                {/* Card Header */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In</h2>
                  <p className="mt-1.5 text-sm text-slate-500">Enter your credentials to continue</p>
                </div>

                {/* Role Selector */}
                <div className="mb-6 grid grid-cols-3 gap-2">
                  {ROLES.map((role) => {
                    const isActive = role.id === activeRole;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleRoleChange(role.id)}
                        className={`group rounded-xl border-2 p-3 text-center transition-all duration-200 ${
                          isActive
                            ? 'border-slate-300 bg-slate-50 shadow-sm'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <div
                          className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-white text-sm transition-all duration-200 ${
                            isActive ? 'shadow-md scale-105' : 'group-hover:scale-105'
                          }`}
                          style={{ background: `linear-gradient(135deg, ${role.color}, ${role.color}dd)` }}
                        >
                          <i className={`${role.icon}`} />
                        </div>
                        <div className={`text-xs font-semibold ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                          {role.label}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Error Message */}
                {errorMsg && (
                  <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 animate-[shake_0.5s_ease-in-out]">
                    <i className="fas fa-exclamation-circle mt-0.5 text-red-500" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Demo Mode Notice */}
                {!isSupabaseConfigured && (
                  <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    <span className="flex items-center gap-2">
                      <i className="fas fa-flask text-amber-600" />
                      Demo Mode Active
                    </span>
                    <button
                      type="button"
                      onClick={handleQuickFill}
                      className="rounded-lg bg-amber-100 px-3 py-1 font-bold uppercase tracking-wider text-amber-700 transition-all hover:bg-amber-200 hover:scale-105"
                    >
                      Auto Fill
                    </button>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Username Input */}
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Username
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                        <i className="fas fa-user text-sm" />
                      </span>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={`${selectedRoleConfig.label} username`}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Password
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                        <i className="fas fa-lock text-sm" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-11 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-4 flex items-center text-slate-400 transition-colors hover:text-slate-600"
                      >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="group relative w-full overflow-hidden rounded-xl py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:translate-y-[-1px] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: `linear-gradient(135deg, ${selectedRoleConfig.color}, ${selectedRoleConfig.color}dd)` }}
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

                {/* Footer */}
                <div className="mt-6 text-center">
                  <p className="text-xs text-slate-400">
                    Demo: <span className="font-medium text-slate-600">student</span> / <span className="font-medium text-slate-600">student123</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
