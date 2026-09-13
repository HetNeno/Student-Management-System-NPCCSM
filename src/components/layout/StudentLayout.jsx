import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  {
    to: '/student',
    end: true,
    label: 'Overview',
    icon: 'fa-solid fa-table-cells-large',
  },
  {
    to: '/student/syllabus',
    end: false,
    label: 'Syllabus',
    icon: 'fa-solid fa-list-check',
  },
  {
    to: '/student/career',
    end: false,
    label: 'Career Advisor',
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
    <div className="h-screen w-screen overflow-hidden flex bg-[#FDF8F7] text-stone-800 font-sans antialiased">
      {/* ── Mobile Backdrop ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-stone-900/20 backdrop-blur-sm transition-opacity lg:hidden"
        />
      )}

      {/* ── Fixed Sidebar with Glassmorphism ── */}
      <aside
        className={`relative h-full shrink-0 z-40 flex flex-col border-r border-stone-200/70 bg-white/80 backdrop-blur-xl shadow-[4px_0_30px_rgba(0,0,0,0.03)] transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'fixed inset-y-0 left-0 z-50 translate-x-0' : 'fixed -translate-x-full lg:translate-x-0 lg:static'}`}
      >
        {/* Floating Edge Collapse/Expand Toggle Button — Clean border placement */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3.5 top-6 z-50 h-7 w-7 items-center justify-center rounded-full border border-stone-200/90 bg-white shadow-md text-stone-500 hover:text-[#8B2635] hover:border-[#8B2635]/40 hover:scale-110 transition-all duration-200"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <i className={`fa-solid ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-[10px]`} />
        </button>

        {/* Brand Header — Clean Logo & Title only */}
        <div className={`flex h-18 items-center border-b border-stone-100/90 px-5 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B2635] text-white shadow-md shadow-[#8B2635]/20">
              <i className="fa-solid fa-graduation-cap text-base" />
            </div>
            {!collapsed && (
              <h1 className="text-base font-black tracking-tight text-stone-900">
                NPCCSM
              </h1>
            )}
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex lg:hidden h-8 w-8 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-800"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Term Status Card in Sidebar */}
        {!collapsed && (
          <div className="px-4 py-3.5 border-b border-stone-100/90 bg-[#FAF7F5]/50">
            <div className="relative">
              <select
                value={semester}
                onChange={(e) => handleSemesterChange(Number(e.target.value))}
                className="w-full appearance-none rounded-xl border border-stone-200/90 bg-white/90 px-3 py-2 text-xs font-bold text-stone-800 shadow-sm outline-none transition-all hover:border-[#8B2635]/40 focus:border-[#8B2635] cursor-pointer"
              >
                {SEMESTERS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                <i className="fa-solid fa-chevron-down text-[10px]" />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu — Single Line, Clean & Modern */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200 ease-out transform ${
                  isActive
                    ? 'bg-[#8B2635] text-white shadow-sm shadow-[#8B2635]/20 font-black'
                    : 'text-stone-600 hover:bg-stone-100/90 hover:text-stone-900 hover:translate-x-1'
                } ${collapsed ? 'justify-center px-0 py-2.5' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'text-white'
                        : 'text-stone-500 group-hover:text-stone-900'
                    }`}
                  >
                    <i className={`${item.icon} text-sm`} />
                  </div>

                  {!collapsed && (
                    <span className="truncate text-xs font-semibold">{item.label}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile Card & Sign Out */}
        <div className="border-t border-stone-100/90 p-3 bg-white/60">
          <div
            className={`flex items-center gap-3 rounded-xl border border-stone-200/70 bg-[#FAF7F5] p-2 ${
              collapsed ? 'flex-col p-2' : ''
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-200 text-stone-800 font-black text-xs">
              {(user?.name || 'S').charAt(0).toUpperCase()}
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-stone-900 truncate">
                  {user?.name || 'Student'}
                </p>
                <p className="text-[10px] text-stone-400">
                  Sem {semester}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-200 hover:text-stone-800 transition-colors"
            >
              <i className="fa-solid fa-arrow-right-from-bracket text-xs" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Fixed Main Shell with Sticky Glass Header & Scrollable Body ── */}
      <div className="flex flex-1 flex-col h-full overflow-hidden min-w-0">
        {/* Sticky Glass Navbar */}
        <header className="shrink-0 h-16 z-30 flex items-center justify-between border-b border-stone-200/70 bg-white/80 backdrop-blur-xl px-5 md:px-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50"
            >
              <i className="fa-solid fa-bars text-sm" />
            </button>

            <h2 className="text-base font-black text-stone-900 tracking-tight truncate">
              Student Portal
            </h2>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Glass Dropdown for Semester Switch */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setSemDropdownOpen(!semDropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-stone-200/90 bg-white/90 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-stone-800 hover:border-stone-300 hover:bg-white shadow-sm transition-all"
              >
                <span>Semester {semester}</span>
                <i
                  className={`fa-solid fa-chevron-down text-[10px] text-stone-400 transition-transform duration-200 ${
                    semDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {semDropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-stone-200/80 bg-white/95 backdrop-blur-xl p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="space-y-0.5">
                    {SEMESTERS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSemesterChange(s.id)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                          s.id === semester
                            ? 'bg-[#8B2635] text-white shadow-sm font-black'
                            : 'text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <span>{s.label}</span>
                        {s.id === semester && (
                          <i className="fa-solid fa-check text-[10px]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick AI Advisor Button */}
            <NavLink
              to="/student/career"
              className="hidden sm:flex items-center gap-2 rounded-xl bg-[#8B2635] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#77212e] transition-all hover:-translate-y-0.5 shadow-[#8B2635]/20"
            >
              <i className="fa-solid fa-brain text-[11px]" />
              <span>Ask Advisor</span>
            </NavLink>
          </div>
        </header>

        {/* Scrollable Main Viewport */}
        <main className="flex-1 overflow-y-auto p-5 md:p-7 custom-scrollbar">
          <Outlet context={{ semester, setSemester: handleSemesterChange }} />
        </main>
      </div>
    </div>
  );
}
