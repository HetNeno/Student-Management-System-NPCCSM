import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AmbientBackground from './components/layout/AmbientBackground';
import { SyllabusProvider } from './context/SyllabusContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import PrincipalDashboard from './pages/PrincipalDashboard';
import TeacherStudio from './pages/TeacherStudio';
import StudentDashboard from './pages/StudentDashboard';
import StudentProjects from './pages/StudentProjects';
import ChatPage from './components/chatbot/ChatPage';

function PageTransitions() {
  const location = useLocation();

  useEffect(() => {
    const pageElements = document.querySelectorAll('main > *');
    pageElements.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(12px)';
      el.style.transition = `opacity 400ms cubic-bezier(0.16,1,0.3,1) ${i * 55}ms, transform 400ms cubic-bezier(0.16,1,0.3,1) ${i * 55}ms`;
    });

    const raf = requestAnimationFrame(() => {
      pageElements.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [location.pathname]);

  return null;
}

export default function App() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const revealTargets = document.querySelectorAll('main > *');
    revealTargets.forEach((element, index) => {
      element.classList.add('scroll-reveal');
      element.style.transitionDelay = `${Math.min(index * 55, 220)}ms`;
    });

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('reveal-visible');
      }),
      { threshold: 0.08, rootMargin: '0px 0px -32px' },
    );

    revealTargets.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  });

  return (
    <AuthProvider>
      <SyllabusProvider>
        <AmbientBackground />
        <HashRouter>
          <PageTransitions />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/principal"
              element={
                <ProtectedRoute allowedRole="principal">
                  <PrincipalDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <TeacherStudio />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/projects"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentProjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/career"
              element={
                <ProtectedRoute allowedRole="student">
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </HashRouter>
      </SyllabusProvider>
    </AuthProvider>
  );
}
