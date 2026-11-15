import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  {
    to: '/student',
    end: true,
    label: 'Dashboard',
    icon: 'fa-solid fa-table-columns',
  },
  {
    to: '/student/syllabus',
    end: false,
    label: 'Academic Plan',
    icon: 'fa-solid fa-list-check',
  },
  {
    to: '/student/career',
    end: false,
    label: 'Career Mentor',
    icon: 'fa-solid fa-brain',
  },
  {
    to: '/student/projects',
    end: false,
    label: 'Projects',
    icon: 'fa-solid fa-laptop-code',
  },
  {
    to: '/student/resources',
    end: false,
    label: 'Resources',
    icon: 'fa-solid fa-box-archive',
  },
];

const SEMESTERS = [
  { id: 1, label: 'Semester 1' },
  { id: 2, label: 'Semester 2' },
  { id: 3, label: 'Semester 3' },
  { id: 4, label: 'Semester 4' },
  { id: 5, label: 'Semester 5' },
  { id: 6, label: 'Semester 6' },
];

export default function StudentLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [semDropdownOpen, setSemDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [semester, setSemesterState] = useState(() => {
    try {
      const saved = localStorage.getItem('npccsm_student_active_sem');
      return saved ? Number(saved) : 5;
    } catch {
      return 5;
    }
  });

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileOpen(false);
    setSemDropdownOpen(false);
  }, [location.pathname]);

  // Click outside to close semester dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSemDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSemesterChange = (sem) => {
    setSemesterState(sem);
    setSemDropdownOpen(false);
    try {
      localStorage.setItem('npccsm_student_active_sem', String(sem));
    } catch {}
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f7f5f4] text-slate-800 antialiased">
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-opacity lg:hidden"
        />
      )}

      <aside
        className={`relative z-40 flex h-full shrink-0 flex-col border-r border-slate-200 bg-white/90 backdrop-blur-xl shadow-[4px_0_26px_rgba(15,23,42,0.04)] transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'fixed inset-y-0 left-0 z-50 translate-x-0' : 'fixed -translate-x-full lg:translate-x-0 lg:static'}`}
      >
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3.5 top-8 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-all duration-200 hover:border-[#8B2635]/40 hover:text-[#8B2635] lg:flex"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`fa-solid ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-[10px]`} />
        </button>

        <div className={`flex items-center border-b border-slate-100 px-5 ${collapsed ? 'justify-center py-5' : 'justify-between py-4'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B2635] text-white shadow-md shadow-[#8B2635]/20">
              <i className="fa-solid fa-graduation-cap text-base" />
            </div>
            {!collapsed && <h1 className="text-base font-black tracking-tight text-slate-900">NPCCSM</h1>}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {!collapsed && (
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3.5">
            <div className="relative">
              <select
                value={semester}
                onChange={(e) => handleSemesterChange(Number(e.target.value))}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm outline-none transition-all hover:border-[#8B2635]/30 focus:border-[#8B2635]"
              >
                {SEMESTERS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <i className="fa-solid fa-chevron-down text-[10px]" />
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#8B2635] text-white shadow-sm shadow-[#8B2635]/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                } ${collapsed ? 'justify-center px-0 py-2.5' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'}`}>
                    <i className={`${item.icon} text-sm`} />
                  </div>
                  {!collapsed && <span className="truncate text-xs font-semibold">{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 bg-white/70 p-3">
          <div className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2 ${collapsed ? 'flex-col p-2' : ''}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 font-black text-xs text-slate-700">
              {(user?.name || 'S').charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900">{user?.name || 'Student'}</p>
                <p className="text-[10px] text-slate-400">Semester {semester}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              <i className="fa-solid fa-arrow-right-from-bracket text-xs" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-5 shadow-[0_4px_24px_rgba(15,23,42,0.02)] backdrop-blur-xl md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
            >
              <i className="fa-solid fa-bars text-sm" />
            </button>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Academic portal</p>
              <h2 className="truncate text-base font-black tracking-tight text-slate-900">Student Portal</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setSemDropdownOpen(!semDropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300"
              >
                <span>Semester {semester}</span>
                <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200 ${semDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {semDropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl z-50">
                  <div className="space-y-0.5">
                    {SEMESTERS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSemesterChange(s.id)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                          s.id === semester ? 'bg-[#8B2635] text-white' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{s.label}</span>
                        {s.id === semester && <i className="fa-solid fa-check text-[10px]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <NavLink
              to="/student/career"
              className="hidden items-center gap-2 rounded-xl bg-[#8B2635] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-[#8B2635]/20 transition-all hover:-translate-y-0.5 sm:flex"
            >
              <i className="fa-solid fa-brain text-[11px]" />
              <span>Ask Advisor</span>
            </NavLink>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 md:p-7 custom-scrollbar">
          <Outlet context={{ semester, setSemester: handleSemesterChange }} />
        </main>
      </div>
    </div>
  );
}
