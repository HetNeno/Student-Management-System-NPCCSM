import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../shared/BrandLogo';

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
    label: 'Materials & Notices',
    icon: 'fa-solid fa-box-archive',
  },
];


export default function StudentLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  // Locked to the semester on the student's account. The server enforces the
  // same rule on every request, so this is not just a UI restriction.
  const semester = user?.semester || 1;
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
            {collapsed ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B2635] text-white shadow-md shadow-[#8B2635]/20" title="NPCCSM">
                <i className="fa-solid fa-graduation-cap text-base" />
              </div>
            ) : (
              <BrandLogo className="h-9" />
            )}
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
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
              <span><i className="fa-solid fa-layer-group mr-2 text-[#8B2635]" />BCA Semester {semester}</span>
              <i className="fa-solid fa-lock text-[10px] text-slate-400" title="Your semester is set on your account" />
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
            <span
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm"
              title="Your semester is set on your account. Contact the principal if it is wrong."
            >
              Semester {semester}
              <i className="fa-solid fa-lock text-[10px] text-slate-400" />
            </span>

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
          <div key={location.pathname} className="content-change">
            <Outlet context={{ semester }} />
          </div>
        </main>

        {!location.pathname.startsWith('/student/career') && (
          <NavLink
            to="/student/career"
            aria-label="Ask Nova, the AI advisor"
            className="fab-float fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B2635] text-white shadow-lg shadow-[#8B2635]/30 transition hover:scale-105 hover:shadow-xl focus-visible:scale-105"
          >
            <i className="fa-solid fa-comments text-lg" />
          </NavLink>
        )}
      </div>
    </div>
  );
}
