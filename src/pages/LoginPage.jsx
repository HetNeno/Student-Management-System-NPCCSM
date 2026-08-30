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
    color: 'from-cyan-400 to-blue-500',
    border: 'border-cyan-300/50',
    bg: 'bg-cyan-500/10',
    desc: 'Track covered topics and exam-ready notes',
    defaultUser: 'student',
    defaultPass: 'student123',
  },
  {
    id: 'teacher',
    label: 'Faculty',
    path: '/teacher',
    icon: 'fas fa-chalkboard-teacher',
    color: 'from-emerald-400 to-teal-500',
    border: 'border-emerald-300/50',
    bg: 'bg-emerald-500/10',
    desc: 'Publish lectures, notes, and completion updates',
    defaultUser: 'teacher',
    defaultPass: 'teacher123',
  },
  {
    id: 'principal',
    label: 'Principal',
    path: '/principal',
    icon: 'fas fa-user-tie',
    color: 'from-violet-400 to-indigo-500',
    border: 'border-violet-300/50',
    bg: 'bg-violet-500/10',
    desc: 'Monitor semester-wise academic delivery and coverage',
    defaultUser: 'principal',
    defaultPass: 'principal123',
  },
];

function FloatingOrbs() {
  const orbs = [
    { size: 300, x: '10%', y: '20%', color: 'bg-cyan-500', duration: 25 },
    { size: 250, x: '70%', y: '60%', color: 'bg-violet-500', duration: 30 },
    { size: 200, x: '50%', y: '80%', color: 'bg-indigo-500', duration: 20 },
    { size: 350, x: '80%', y: '10%', color: 'bg-blue-500', duration: 35 },
    { size: 180, x: '20%', y: '70%', color: 'bg-teal-500', duration: 28 },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${orb.color} opacity-20 blur-3xl`}
          style={{
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            left: orb.x,
            top: orb.y,
            animation: `floatOrb ${orb.duration}s ease-in-out infinite alternate`,
            animationDelay: `${i * 2}s`,
          }}
        />
      ))}
    </div>
  );
}

function ParticleField() {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white/40"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.x}%`,
            top: `${p.y}%`,
            animation: `particleFloat ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      const roleTarget = ROLES.find((r) => r.id === user.role)?.path || '/student';
      navigate(roleTarget, { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
        setMousePos({ x, y });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
      await login({
        username,
        password,
        role: activeRole,
      });
      // Navigation handled by useEffect when user updates
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Animated Background */}
      <FloatingOrbs />
      <ParticleField />

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div
          className={`w-full max-w-6xl grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr] transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Left Side - Branding */}
          <div className="space-y-8">
            <div
              className={`inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-md transition-all duration-500 delay-100 ${
                mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Academic Command Center
            </div>

            <div
              className={`space-y-6 transition-all duration-700 delay-200 ${
                mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              }`}
            >
              <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 text-4xl text-white shadow-2xl shadow-cyan-500/50">
                <i className="fas fa-graduation-cap" />
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 opacity-75 blur-xl" />
              </div>

              <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
                Welcome to{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                  NPCCSM
                </span>
              </h1>

              <p className="max-w-lg text-lg text-slate-300 sm:text-xl">
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
                { icon: 'fas fa-users', label: '3 Roles', value: 'Student, Faculty, Admin' },
                { icon: 'fas fa-layer-group', label: '6 Semesters', value: 'Complete BCA Curriculum' },
                { icon: 'fas fa-bolt', label: 'AI Powered', value: 'Smart Career Guidance' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:scale-105"
                >
                  <div className="relative z-10">
                    <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-cyan-300">
                      <i className={`${stat.icon} text-sm`} />
                    </div>
                    <div className="text-2xl font-black text-white">{stat.label}</div>
                    <div className="text-xs text-slate-400">{stat.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Login Card */}
          <div
            ref={cardRef}
            className={`relative mx-auto w-full max-w-md transition-all duration-700 delay-400 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{
              transform: `perspective(1000px) rotateY(${mousePos.x * 2}deg) rotateX(${-mousePos.y * 2}deg)`,
            }}
          >
            {/* Glow Effect */}
            <div
              className={`absolute -inset-1 rounded-3xl bg-gradient-to-r ${selectedRoleConfig.color} opacity-30 blur-2xl transition-all duration-500`}
            />

            {/* Card */}
            <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
              {/* Card Shine */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-500"
                style={{
                  background: `radial-gradient(circle at ${(mousePos.x + 1) * 50}% ${(mousePos.y + 1) * 50}%, rgba(255,255,255,0.1), transparent 50%)`,
                  opacity: Math.abs(mousePos.x) + Math.abs(mousePos.y) > 0.1 ? 1 : 0,
                }}
              />

              {/* Header */}
              <div className="relative mb-8">
                <div
                  className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${selectedRoleConfig.color} text-white shadow-lg transition-all duration-500`}
                >
                  <i className={`${selectedRoleConfig.icon} text-xl`} />
                </div>
                <h2 className="text-3xl font-black text-white">Sign In</h2>
                <p className="mt-1 text-sm text-slate-400">Enter your credentials to continue</p>
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
                      className={`group relative overflow-hidden rounded-xl border-2 p-3 text-center transition-all duration-300 ${
                        isActive
                          ? `${role.border} ${role.bg} scale-105`
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div
                        className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${role.color} text-white transition-all duration-300 ${
                          isActive ? 'scale-110 rotate-3' : 'group-hover:scale-110'
                        }`}
                      >
                        <i className={`${role.icon} text-sm`} />
                      </div>
                      <div className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                        {role.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-500/50 bg-rose-500/10 p-4 text-sm text-rose-300 backdrop-blur-md animate-[shake_0.5s_ease-in-out]">
                  <i className="fas fa-exclamation-circle mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Demo Mode Notice */}
              {!isSupabaseConfigured && (
                <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 backdrop-blur-md">
                  <span className="flex items-center gap-2">
                    <i className="fas fa-flask" />
                    Demo Mode Active
                  </span>
                  <button
                    type="button"
                    onClick={handleQuickFill}
                    className="rounded-lg bg-amber-500/20 px-3 py-1 font-bold uppercase tracking-wider text-amber-200 transition-all hover:bg-amber-500/30 hover:scale-105"
                  >
                    Auto Fill
                  </button>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username Input */}
                <div className="group">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Username
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500 transition-colors group-focus-within:text-cyan-400">
                      <i className="fas fa-user" />
                    </span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={`${selectedRoleConfig.label} username`}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all duration-300 focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/20"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="group">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Password
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500 transition-colors group-focus-within:text-cyan-400">
                      <i className="fas fa-lock" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-11 text-sm text-white placeholder-slate-500 outline-none transition-all duration-300 focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-4 flex items-center text-slate-500 transition-colors hover:text-white"
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className={`group relative w-full overflow-hidden rounded-xl bg-gradient-to-r ${selectedRoleConfig.color} py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
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
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>
              </form>

              {/* Footer */}
              <div className="mt-6 text-center">
                <p className="text-xs text-slate-500">
                  Demo: <span className="text-cyan-400">student</span> / <span className="text-cyan-400">student123</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes floatOrb {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(30px, -30px) scale(1.1); }
        }

        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { transform: translateY(-100px) translateX(20px); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
