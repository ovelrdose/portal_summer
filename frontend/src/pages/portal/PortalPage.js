import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Badge, Toast, ToastContainer } from 'react-bootstrap';
import { coursesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const PortalPage = () => {
  const { user } = useAuth();
  const [myCourses, setMyCourses] = useState([]);
  const [latestCourses, setLatestCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState(null);
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

  const handleSubscribe = async (courseId) => {
    setSubscribingId(courseId);
    try {
      await coursesAPI.subscribe(courseId);
      setToast({ show: true, message: 'Вы успешно записались на курс!', variant: 'success' });
      loadData();
    } catch (error) {
      console.error('Error subscribing:', error);
      const errorMessage = error.response?.data?.detail || 'Ошибка при записи на курс. Попробуйте еще раз.';
      setToast({ show: true, message: errorMessage, variant: 'danger' });
    } finally {
      setSubscribingId(null);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  const subscribedCourseIds = myCourses.map((s) => s.course.id);

  return (
    <Container className="py-5">
      <h1 className="mb-4">Добро пожаловать, {user?.first_name}!</h1>

      {/* My Courses */}
      <section className="mb-5">
        <h2 className="mb-4">Мои курсы</h2>
        {myCourses.length > 0 ? (
          <Row>
            {myCourses.map(({ course }) => (
              <Col md={4} key={course.id} className="mb-4">
                <Card className="h-100 course-card">
                  <Card.Img
                    variant="top"
                    src={course.thumbnail_url || course.image_url}
                    alt={course.title}
                  />
                  <Card.Body>
                    <Card.Title>{course.title}</Card.Title>
                    <Card.Text>{course.short_description}</Card.Text>
                    <small className="text-muted">
                      Автор: {course.creator?.full_name}
                    </small>
                  </Card.Body>
                  <Card.Footer className="bg-white border-0">
                    <Button
                      variant="primary"
                      as={Link}
                      to={`/portal/courses/${course.id}`}
                    >
                      Перейти к курсу
                    </Button>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <div className="text-center text-muted py-4">
            <p>Вы пока не подписаны ни на один курс</p>
            <Button as={Link} to="/portal/courses" variant="primary">
              Посмотреть все курсы
            </Button>
          </div>
        )}
      </section>

      {/* Latest Courses */}
      <section>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Новые курсы</h2>
          <Link to="/portal/courses" className="btn btn-outline-primary">
            Все курсы
          </Link>
        </div>
        <Row>
          {latestCourses.map((course) => (
            <Col md={4} key={course.id} className="mb-4">
              <Card className="h-100 course-card">
                <Card.Img
                  variant="top"
                  src={course.thumbnail_url || course.image_url}
                  alt={course.title}
                />
                <Card.Body>
                  <Card.Title>{course.title}</Card.Title>
                  <Card.Text>{course.short_description}</Card.Text>
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      {course.creator?.full_name}
                    </small>
                    <Badge bg="secondary">
                      {course.subscribers_count} подписчиков
                    </Badge>
                  </div>
                </Card.Body>
                <Card.Footer className="bg-white border-0">
                  {subscribedCourseIds.includes(course.id) ? (
                    <Button
                      variant="primary"
                      as={Link}
                      to={`/portal/courses/${course.id}`}
                    >
                      Перейти
                    </Button>
                  ) : (
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-primary"
                        as={Link}
                        to={`/portal/courses/${course.id}`}
                        className="flex-grow-1"
                      >
                        Подробнее
                      </Button>
                      <Button
                        variant="success"
                        onClick={() => handleSubscribe(course.id)}
                        className="flex-grow-1"
                        disabled={subscribingId === course.id}
                      >
                        {subscribingId === course.id ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Подписка...
                          </>
                        ) : (
                          'Записаться'
                        )}
                      </Button>
                    </div>
                  )}
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
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
