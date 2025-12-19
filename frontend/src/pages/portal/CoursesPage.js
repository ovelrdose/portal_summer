import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Form, Badge, Tabs, Tab, Toast, ToastContainer, Modal } from 'react-bootstrap';
import { coursesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const CoursesPage = () => {
  const { isTeacher, isAdmin } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [subscribingId, setSubscribingId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });
  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [courseToUnsubscribe, setCourseToUnsubscribe] = useState(null);

  useEffect(() => {
    loadCourses();
    if (isTeacher || isAdmin) {
      loadDrafts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isTeacher, isAdmin]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      const response = await coursesAPI.getCourses(params);
      setCourses(response.data.results || response.data);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDrafts = async () => {
    try {
      const response = await coursesAPI.getDrafts();
      setDrafts(response.data);
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  };

  const handleSubscribe = async (courseId) => {
    setSubscribingId(courseId);
    try {
      await coursesAPI.subscribe(courseId);
      setToast({ show: true, message: 'Вы успешно записались на курс!', variant: 'success' });
      loadCourses();
    } catch (error) {
      console.error('Error subscribing:', error);
      const errorMessage = error.response?.data?.detail || 'Ошибка при записи на курс. Попробуйте еще раз.';
      setToast({ show: true, message: errorMessage, variant: 'danger' });
    } finally {
      setSubscribingId(null);
    }
  };

  const openUnsubscribeModal = (course) => {
    setCourseToUnsubscribe(course);
    setShowUnsubscribeModal(true);
  };

  const handleUnsubscribe = async () => {
    const courseId = courseToUnsubscribe.id;
    setShowUnsubscribeModal(false);
    setSubscribingId(courseId);
    try {
      await coursesAPI.unsubscribe(courseId);
      setToast({ show: true, message: 'Вы отписались от курса', variant: 'info' });
      loadCourses();
    } catch (error) {
      console.error('Error unsubscribing:', error);
      const errorMessage = error.response?.data?.detail || 'Ошибка при отписке от курса. Попробуйте еще раз.';
      setToast({ show: true, message: errorMessage, variant: 'danger' });
    } finally {
      setSubscribingId(null);
      setCourseToUnsubscribe(null);
    }
  };

  return (
    <Container className="py-5">
      <h1 className="mb-4">Все курсы</h1>

      {/* Search */}
      <Row className="mb-4">
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Поиск по курсам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          {(isTeacher || isAdmin) && drafts.length > 0 ? (
            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
              <Tab eventKey="all" title="Все курсы">
                <Row>
                  {courses.length > 0 ? (
                    courses.map((course) => (
                      <Col md={4} key={course.id} className="mb-4">
                        <Card className="h-100 course-card">
                          <Card.Img variant="top" src={course.thumbnail_url || course.image_url} alt={course.title} />
                          <Card.Body>
                            <Card.Title>{course.title}</Card.Title>
                            <Card.Text>{course.short_description}</Card.Text>
                            <div className="d-flex justify-content-between align-items-center">
                              <small className="text-muted">{course.creator?.full_name}</small>
                              <Badge bg="secondary">{course.subscribers_count} подписчиков</Badge>
                            </div>
                          </Card.Body>
                          <Card.Footer className="bg-white border-0 d-flex gap-2">
                            <Button variant="primary" as={Link} to={`/portal/courses/${course.id}`}>
                              Подробнее
                            </Button>
                            {course.is_subscribed ? (
                              <Button
                                variant="outline-danger"
                                onClick={() => openUnsubscribeModal(course)}
                                disabled={subscribingId === course.id}
                              >
                                {subscribingId === course.id ? (
                                  <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Отписка...
                                  </>
                                ) : (
                                  'Отписаться'
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="success"
                                onClick={() => handleSubscribe(course.id)}
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
                            )}
                          </Card.Footer>
                        </Card>
                      </Col>
                    ))
                  ) : (
                    <Col>
                      <p className="text-center text-muted">Курсы не найдены</p>
                    </Col>
                  )}
                </Row>
              </Tab>
              <Tab eventKey="drafts" title={`Черновики (${drafts.length})`}>
                <Row>
                  {drafts.map((course) => (
                    <Col md={4} key={course.id} className="mb-4">
                      <Card className="h-100 course-card">
                        <Card.Img variant="top" src={course.thumbnail_url || course.image_url} alt={course.title} />
                        <Card.Body>
                          <Card.Title>
                            {course.title}
                            <Badge bg="warning" text="dark" className="ms-2">Черновик</Badge>
                          </Card.Title>
                          <Card.Text>{course.short_description}</Card.Text>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">{course.creator?.full_name}</small>
                            <Badge bg="secondary">{course.subscribers_count} подписчиков</Badge>
                          </div>
                        </Card.Body>
                        <Card.Footer className="bg-white border-0">
                          <Button variant="primary" as={Link} to={`/portal/courses/${course.id}`}>
                            Редактировать
                          </Button>
                        </Card.Footer>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Tab>
            </Tabs>
          ) : (
            <Row>
              {courses.length > 0 ? (
                courses.map((course) => (
                  <Col md={4} key={course.id} className="mb-4">
                    <Card className="h-100 course-card">
                      <Card.Img variant="top" src={course.thumbnail_url || course.image_url} alt={course.title} />
                      <Card.Body>
                        <Card.Title>{course.title}</Card.Title>
                        <Card.Text>{course.short_description}</Card.Text>
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">{course.creator?.full_name}</small>
                          <Badge bg="secondary">{course.subscribers_count} подписчиков</Badge>
                        </div>
                      </Card.Body>
                      <Card.Footer className="bg-white border-0 d-flex gap-2">
                        <Button variant="primary" as={Link} to={`/portal/courses/${course.id}`}>
                          Подробнее
                        </Button>
                        {course.is_subscribed ? (
                          <Button
                            variant="outline-danger"
                            onClick={() => openUnsubscribeModal(course)}
                            disabled={subscribingId === course.id}
                          >
                            {subscribingId === course.id ? (
                              <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Отписка...
                              </>
                            ) : (
                              'Отписаться'
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="success"
                            onClick={() => handleSubscribe(course.id)}
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
                        )}
                      </Card.Footer>
                    </Card>
                  </Col>
                ))
              ) : (
                <Col>
                  <p className="text-center text-muted">Курсы не найдены</p>
                </Col>
              )}
            </Row>
          )}
        </>
      )}

      {/* Unsubscribe Confirmation Modal */}
      <Modal show={showUnsubscribeModal} onHide={() => setShowUnsubscribeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение отписки</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Вы действительно хотите отписаться от курса <strong>"{courseToUnsubscribe?.title}"</strong>?</p>
          <p className="text-muted mb-0">Вы потеряете доступ ко всем материалам курса.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUnsubscribeModal(false)}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleUnsubscribe}>
            Отписаться
          </Button>
        </Modal.Footer>
      </Modal>

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

export default CoursesPage;
