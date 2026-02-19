import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Button, Spinner, Collapse, Toast, ToastContainer } from 'react-bootstrap';
import { coursesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const PortalPage = () => {
  const { user } = useAuth();
  const [myCourses, setMyCourses] = useState([]);
  const [latestCourses, setLatestCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myCoursesOpen, setMyCoursesOpen] = useState(true);
  const [latestCoursesOpen, setLatestCoursesOpen] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [myCoursesRes, latestRes] = await Promise.all([
        coursesAPI.getMyCourses(),
        coursesAPI.getLatest(),
      ]);
      setMyCourses(myCoursesRes.data);
      setLatestCourses(latestRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="py-5">

      {/* Page header */}
      <div className="custom-section-header mb-5">
        <h1 className="custom-section-title">
          Добро пожаловать, {user?.first_name}!
        </h1>
        <div className="d-flex gap-2">
          <Link
            to="/portal/my-courses"
            className="btn btn-custom-outline btn-sm-custom rounded-pill"
          >
            Мои курсы
          </Link>
          <Link
            to="/portal/courses"
            className="btn btn-custom-primary btn-sm-custom rounded-pill"
          >
            Все курсы
          </Link>
        </div>
      </div>

      {/* My Courses */}
      <section className="mb-5">
        <div
          className="collapsible-section-title"
          onClick={() => setMyCoursesOpen((prev) => !prev)}
          aria-expanded={myCoursesOpen}
        >
          Мои курсы
          <span className={`module-chevron ${myCoursesOpen ? 'open' : 'closed'}`}>
            <i className="bi bi-chevron-right"></i>
          </span>
        </div>

        <Collapse in={myCoursesOpen}>
          <div>
            {myCourses.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {myCourses.map(({ course }) => (
                  <div key={course.id} className="custom-card custom-card-horizontal">
                    {/* Left: text content */}
                    <div className="card-content">
                      <div>
                        <h3 className="custom-card-title">{course.title}</h3>
                        <p className="custom-card-text">{course.short_description}</p>
                        <span className="custom-badge">
                          Автор: {course.creator?.full_name}
                        </span>
                      </div>
                      <div className="mt-3">
                        <Link
                          to={`/portal/courses/${course.id}`}
                          className="course-goto-link"
                        >
                          Перейти к курсу
                          <span className="goto-arrow"></span>
                        </Link>
                      </div>
                    </div>

                    {/* Right: image */}
                    <div className="card-image">
                      <img src={course.image_url} alt={course.title} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted py-4">
                <p className="mb-3">Вы пока не подписаны ни на один курс</p>
                <Button
                  as={Link}
                  to="/portal/courses"
                  className="btn btn-custom-primary btn-sm-custom rounded-pill"
                >
                  Посмотреть все курсы
                </Button>
              </div>
            )}
          </div>
        </Collapse>
      </section>

      {/* Latest Courses */}
      <section className="mb-5">
        <div
          className="collapsible-section-title"
          onClick={() => setLatestCoursesOpen((prev) => !prev)}
          aria-expanded={latestCoursesOpen}
        >
          Новые курсы
          <span className={`module-chevron ${latestCoursesOpen ? 'open' : 'closed'}`}>
            <i className="bi bi-chevron-right"></i>
          </span>
        </div>

        <Collapse in={latestCoursesOpen}>
          <div>
            <div className="d-flex flex-column gap-3">
              {latestCourses.map((course) => (
                <div key={course.id} className="custom-card custom-card-horizontal">
                  {/* Left: text content */}
                  <div className="card-content">
                    <div>
                      <h3 className="custom-card-title">{course.title}</h3>
                      <p className="custom-card-text">{course.short_description}</p>
                      <div className="d-flex align-items-center gap-3 flex-wrap">
                        <span className="custom-badge">
                          Автор: {course.creator?.full_name}
                        </span>
                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                          {course.subscribers_count} подписчиков
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Link
                        to={`/portal/courses/${course.id}`}
                        className="course-goto-link"
                      >
                        Перейти к курсу
                        <span className="goto-arrow"></span>
                      </Link>
                    </div>
                  </div>

                  {/* Right: image */}
                  <div className="card-image">
                    {(course.thumbnail_url || course.image_url) ? (
                      <img
                        src={course.thumbnail_url || course.image_url}
                        alt={course.title}
                      />
                    ) : (
                      <div
                        className="w-100 h-100 d-flex align-items-center justify-content-center bg-light"
                        style={{ minHeight: '160px' }}
                      >
                        <span className="text-muted" style={{ fontSize: '2rem' }}>&#128218;</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Collapse>
      </section>

      {/* Toast notifications */}
      <ToastContainer position="top-end" className="p-3">
        <Toast
          show={toast.show}
          onClose={() => setToast({ ...toast, show: false })}
          delay={3000}
          autohide
          bg={toast.variant}
        >
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default PortalPage;
