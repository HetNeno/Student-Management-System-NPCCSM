import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AmbientBackground from './components/layout/AmbientBackground';
import { SyllabusProvider } from './context/SyllabusContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import PrincipalDashboard from './pages/PrincipalDashboard';
import TeacherStudio from './pages/TeacherStudio';
import StudentLayout from './components/layout/StudentLayout';
import StudentOverview from './pages/student/StudentOverview';
import StudentSyllabus from './pages/student/StudentSyllabus';
import StudentCareer from './pages/student/StudentCareer';
import StudentProjects from './pages/student/StudentProjects';
import StudentResources from './pages/student/StudentResources';

function PageTransitions() {
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
            {/* ── Student Portal with Sidebar Layout ── */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StudentOverview />} />
              <Route path="syllabus" element={<StudentSyllabus />} />
              <Route path="career" element={<StudentCareer />} />
              <Route path="projects" element={<StudentProjects />} />
              <Route path="resources" element={<StudentResources />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </HashRouter>
      </SyllabusProvider>
    </AuthProvider>
  );
}
