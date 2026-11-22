import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AmbientBackground from './components/layout/AmbientBackground';
import { SyllabusProvider } from './context/SyllabusContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PrincipalDashboard from './pages/PrincipalDashboard';
import TeacherStudio from './pages/TeacherStudio';
import ProjectManager from './pages/ProjectManager';
import ContentManager from './pages/ContentManager';
import StudentLayout from './components/layout/StudentLayout';
import StudentOverview from './pages/student/StudentOverview';
import StudentSyllabus from './pages/student/StudentSyllabus';
import StudentCareer from './pages/student/StudentCareer';
import StudentProjects from './pages/student/StudentProjects';
import StudentResources from './pages/student/StudentResources';
import LandingPage from './pages/LandingPage';

/**
 * Fades each top-level area in (landing, login, student portal, ...).
 * Keyed on the first path segment so moving between student sub-pages does
 * not remount the sidebar layout; nested pages animate inside the layout.
 */
function PageTransitions({ children }) {
  const { pathname, hash } = useLocation();
  const section = pathname.split('/')[1] || 'home';

  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0 });
  }, [pathname, hash]);

  return (
    <div key={section} className="page-transition">
      {children}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SyllabusProvider>
        <AmbientBackground />
        <BrowserRouter>
          <PageTransitions>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              <Route
                path="/principal"
                element={
                  <ProtectedRoute allowedRole="principal">
                    <PrincipalDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/principal/content"
                element={
                  <ProtectedRoute allowedRole="principal">
                    <ContentManager />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/principal/projects"
                element={
                  <ProtectedRoute allowedRole="principal">
                    <ProjectManager />
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
                path="/teacher/content"
                element={
                  <ProtectedRoute allowedRole="teacher">
                    <ContentManager />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/projects"
                element={
                  <ProtectedRoute allowedRole="teacher">
                    <ProjectManager />
                  </ProtectedRoute>
                }
              />

              {/* Student portal with sidebar layout */}
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

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PageTransitions>
        </BrowserRouter>
      </SyllabusProvider>
    </AuthProvider>
  );
}
