import { Link } from 'react-router-dom';

const roles = [
  {
    role: 'student',
    title: 'Student',
    description: 'Track syllabus coverage, learning resources, projects, and career guidance.',
    icon: 'fas fa-user-graduate',
    color: '#2563EB',
  },
  {
    role: 'teacher',
    title: 'Faculty',
    description: 'Publish lecture progress, add mandatory notes, and review submission history.',
    icon: 'fas fa-chalkboard-teacher',
    color: '#059669',
  },
  {
    role: 'principal',
    title: 'Principal',
    description: 'Monitor semester delivery and identify coverage gaps across the institution.',
    icon: 'fas fa-user-tie',
    color: '#7C3AED',
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-b from-[#FFF9F8] via-white to-[#FFF3F2]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10" aria-label="Main navigation">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#9F2929] to-[#B64B4B] text-white shadow-lg">
            <i className="fas fa-graduation-cap" />
          </span>
          <span>
            <strong className="block text-lg leading-none text-slate-900">NPCCSM</strong>
            <small className="mt-1 block text-xs text-slate-500">Academic Portal</small>
          </span>
        </Link>
        <Link to="/login" className="rounded-xl bg-[#A52A2A] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5">
          Portal Login
        </Link>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.08fr_.92fr] lg:px-10 lg:py-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#9F2929] shadow-sm">
            <i className="fas fa-shield-halved" />
            Secure role-based campus portal
          </div>
          <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
            One portal for smarter <span className="text-[#A52A2A]">academic delivery</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Track curriculum coverage, publish lecture updates, monitor institutional progress, and use academic AI guidance in one secure platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" className="rounded-xl bg-[#A52A2A] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5">
              Enter your portal <i className="fas fa-arrow-right ml-2" />
            </Link>
            <a href="#roles" className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5">
              Explore roles
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-10 rounded-full bg-red-100/60 blur-3xl" />
          <div className="relative rounded-[2rem] border border-red-100 bg-white p-5 shadow-[0_30px_80px_-30px_rgba(127,29,29,.35)]">
            <div className="rounded-2xl bg-slate-950 p-5 text-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Semester overview</span>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">Live</span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[['Students','3 Roles'],['Curriculum','6 Semesters'],['Assistant','AI RAG']].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="mt-2 text-sm font-bold">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="roles" className="border-t border-red-100/70 bg-white/70">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#A52A2A]">Choose your workspace</p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900">Purpose-built for every role</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {roles.map((item) => (
              <Link key={item.role} to={`/login?role=${item.role}`} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md" style={{ background: item.color }}>
                  <i className={item.icon} />
                </span>
                <h3 className="mt-5 text-xl font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 min-h-14 text-sm leading-6 text-slate-500">{item.description}</p>
                <span className="mt-5 inline-flex items-center text-sm font-bold" style={{ color: item.color }}>
                  Open login <i className="fas fa-arrow-right ml-2 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
