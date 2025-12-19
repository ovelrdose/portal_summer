import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spinner, Container } from 'react-bootstrap';
import { useAuth } from './contexts/AuthContext';

// Layout
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Public pages
import HomePage from './pages/HomePage';
import NewsPage from './pages/NewsPage';
import NewsDetailPage from './pages/NewsDetailPage';
import GalleryPage from './pages/GalleryPage';
import AlbumDetailPage from './pages/AlbumDetailPage';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Protected pages
import PortalPage from './pages/portal/PortalPage';
import CoursesPage from './pages/portal/CoursesPage';
import CourseDetailPage from './pages/portal/CourseDetailPage';
import ProfilePage from './pages/portal/ProfilePage';

// Admin/Teacher pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CourseEditor from './pages/admin/CourseEditor';
import HomeworkReviewPage from './pages/admin/HomeworkReviewPage';

// Protected Route component
const ProtectedRoute = ({ children, requireAdmin = false, requireTeacher = false }) => {
  const { isAuthenticated, isAdmin, isTeacher, loading } = useAuth();

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/portal" replace />;
  }

  if (requireTeacher && !isTeacher) {
    return <Navigate to="/portal" replace />;
  }

  return children;
};

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <main className="flex-grow-1">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:id" element={<NewsDetailPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/gallery/:id" element={<AlbumDetailPage />} />

          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route
            path="/portal"
            element={
              <ProtectedRoute>
                <PortalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/courses"
            element={
              <ProtectedRoute>
                <CoursesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/courses/:id"
            element={
              <ProtectedRoute>
                <CourseDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Admin/Teacher routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses/new"
            element={
              <ProtectedRoute requireTeacher>
                <CourseEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses/:id/edit"
            element={
              <ProtectedRoute requireTeacher>
                <CourseEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses/:id/homework"
            element={
              <ProtectedRoute requireTeacher>
                <HomeworkReviewPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
