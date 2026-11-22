import { Link } from 'react-router-dom';
import BrandLogo from '../components/shared/BrandLogo';
import { useAuth, DASHBOARD_BY_ROLE } from '../context/AuthContext';

// Portal features describe what this application actually does.
const PORTALS = [
  {
    role: 'student',
    title: 'Student Portal',
    icon: 'fas fa-user-graduate',
    color: '#2563EB',
    points: ['Semester-wise syllabus coverage', 'Project list with milestone tracking', 'Nova AI career & learning advisor'],
    cta: 'Student sign in',
  },
  {
    role: 'teacher',
    title: 'Teacher Portal',
    icon: 'fas fa-chalkboard-teacher',
    color: '#059669',
    points: ['Publish lecture coverage with topic notes', 'Publish and manage student projects', 'Follow student project progress'],
    cta: 'Teacher sign in',
  },
  {
    role: 'principal',
    title: 'Principal Portal',
    icon: 'fas fa-user-tie',
    color: '#7C3AED',
    points: ['Semester-wise coverage oversight', 'Subjects below 60% coverage', 'Teacher accounts and AI knowledge base'],
    cta: 'Principal sign in',
  },
];

// Source: npccsmbca.in (home and About pages), quoted or closely paraphrased.
const ACTIVITIES = ['Technical seminars', 'Workshops', 'Hackathons', 'Coding competitions', 'Research presentations', 'Cultural events', 'Sports', 'Community initiatives'];

export default function LandingPage() {
  const { user } = useAuth();
  const dashboard = user ? DASHBOARD_BY_ROLE[user.role] : null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-[#FFF9F8] via-white to-[#FFF3F2] text-slate-800">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-red-100/70 bg-white/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10" aria-label="Main navigation">
          <Link to="/" aria-label="NPCCSM portal home" className="min-w-0">
            <BrandLogo className="h-10 sm:h-12" />
          </Link>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <a href="#portals" className="hidden rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition hover:text-[#A52A2A] md:inline">Portals</a>
            <a href="#about" className="hidden rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition hover:text-[#A52A2A] md:inline">About</a>
            {dashboard ? (
              <Link to={dashboard} className="btn-press rounded-xl bg-[#A52A2A] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5">
                My dashboard
              </Link>
            ) : (
              <Link to="/login" className="btn-press rounded-xl bg-[#A52A2A] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5">
                Sign in
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-10 lg:py-20">
          <div className="anim-fade-in-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#9F2929] shadow-sm">
              <i className="fas fa-building-columns" />
              Constituent college of Kadi Sarva Vishwavidyalaya
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              NPCCSM <span className="text-[#A52A2A]">Academic Portal</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              The online workspace of Narsinhbhai Patel College of Computer Studies and Management, Kadi. Students follow their
              BCA syllabus and projects, faculty publish lecture progress, and the principal oversees academic delivery, all in one
              secure place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={dashboard || '/login'} className="btn-press rounded-xl bg-[#A52A2A] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5">
                {dashboard ? 'Open my dashboard' : 'Sign in to your portal'} <i className="fas fa-arrow-right ml-2" />
              </Link>
              {!dashboard && (
                <Link to="/signup" className="btn-press rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#A52A2A]/40">
                  New student? Create an account
                </Link>
              )}
            </div>
          </div>

          <div className="anim-fade-in-scale relative" style={{ animationDelay: '120ms' }}>
            <div className="absolute -inset-8 rounded-full bg-red-100/60 blur-3xl" aria-hidden="true" />
            <div className="relative space-y-4 rounded-[1.75rem] border border-red-100 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(127,29,29,.35)] sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A52A2A]">Programme</p>
              <h2 className="text-2xl font-extrabold text-slate-900">BCA (Honours)</h2>
              <p className="text-sm leading-6 text-slate-600">
                A three-year undergraduate Bachelor of Computer Applications programme spread across six semesters, affiliated with
                Kadi Sarva Vishwavidyalaya, Gandhinagar.
              </p>
              <ul className="space-y-2.5 border-t border-slate-100 pt-4 text-sm text-slate-600">
                <li className="flex gap-3"><i className="fas fa-check mt-1 text-[#A52A2A]" />An AICTE approved institution</li>
                <li className="flex gap-3"><i className="fas fa-check mt-1 text-[#A52A2A]" />Courses in computer science and management (BCA, BBA &amp; PGDCA)</li>
                <li className="flex gap-3"><i className="fas fa-check mt-1 text-[#A52A2A]" />SVKM Campus, Ayodhya Nagar, Kadi, Gujarat</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Three portals */}
        <section id="portals" className="scroll-mt-20 border-y border-red-100/70 bg-white/80">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
            <div className="mb-10 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#A52A2A]">Three portals</p>
              <h2 className="mt-3 text-3xl font-extrabold text-slate-900">One portal for students, teachers and the principal</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500">
                Sign in with your college account. You are taken to your own portal automatically, and each portal shows only what
                your role is allowed to see.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {PORTALS.map((p, i) => (
                <article key={p.role} className="anim-fade-in-up group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ animationDelay: `${i * 90}ms` }}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md" style={{ background: p.color }}>
                    <i className={p.icon} />
                  </span>
                  <h3 className="mt-5 text-xl font-bold text-slate-900">{p.title}</h3>
                  <ul className="mt-3 flex-1 space-y-2 text-sm text-slate-600">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex gap-2.5"><i className="fas fa-circle mt-2 text-[5px]" style={{ color: p.color }} />{pt}</li>
                    ))}
                  </ul>
                  <Link to={`/login?role=${p.role}`} className="mt-6 inline-flex items-center text-sm font-bold" style={{ color: p.color }}>
                    {p.cta} <i className="fas fa-arrow-right ml-2 transition group-hover:translate-x-1" />
                  </Link>
                </article>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-slate-500">
              Students can <Link to="/signup" className="font-bold text-[#A52A2A] hover:underline">register online</Link>. Teacher accounts are created by the principal.
            </p>
          </div>
        </section>

        {/* About */}
        <section id="about" className="scroll-mt-20 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#A52A2A]">About NPCCSM</p>
              <h2 className="mt-3 text-3xl font-extrabold text-slate-900">A hub of knowledge and innovation in computer science and management</h2>
              <p className="mt-4 leading-7 text-slate-600">
                N.P. College of Computer Studies and Management (NPCCSM), affiliated with Kadi Sarva Vishwavidyalaya, combines
                academics with practical training, research and co-curricular activities, and brings higher education to the
                semi-urban region of North Gujarat.
              </p>
              <p className="mt-4 leading-7 text-slate-600">
                The college focuses on equipping students with cutting-edge knowledge, hands-on skills and real-world exposure for
                careers in IT and computer applications. Through personalised mentorship, students receive academic, career and
                personal guidance.
              </p>
              <p className="mt-4 text-sm font-semibold italic text-slate-500">Motto: કર ભલા, હોગા ભલા · “Do good, and good will come to you.”</p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#A52A2A]">Vision</h3>
                <p className="mt-2 text-lg font-semibold leading-7 text-slate-800">To ignite potential, inspire innovation, and shape leaders.</p>
              </div>
              <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#A52A2A]">Mission</h3>
                <p className="mt-2 text-lg font-semibold leading-7 text-slate-800">
                  To turn ambition into action, guiding students to learn, create, and lead with integrity, courage, and compassion.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Student life</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {ACTIVITIES.map((a) => (
                    <li key={a} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-red-100/70 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10">
          <div className="space-y-2">
            <BrandLogo className="h-10" />
            <p className="text-xs text-slate-500">SVKM Campus, Ayodhya Nagar, Kadi, Gujarat 382715</p>
          </div>
          <div className="flex flex-col gap-1 text-xs text-slate-500 md:text-right">
            <a href="https://www.npccsmbca.in/" target="_blank" rel="noopener noreferrer" className="font-bold text-[#A52A2A] hover:underline">
              Official college website <i className="fas fa-arrow-up-right-from-square ml-1 text-[10px]" />
            </a>
            <span>Institutional information sourced from npccsmbca.in</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
