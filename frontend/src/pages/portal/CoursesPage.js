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
      <h1 className="custom-section-title mb-4">Все курсы</h1>

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
                <Row className="g-4">
                  {courses.length > 0 ? (
                    courses.map((course) => (
                      <Col md={12} key={course.id}>
                        <Card className="custom-card custom-card-horizontal">
                          <div className="card-content">
                            <div>
                              <h3 className="custom-card-title">{course.title}</h3>
                              <p className="custom-card-text">{course.short_description}</p>
                              <div className="d-flex align-items-center gap-3 mb-2">
                                <Badge className="custom-badge">
                                  Автор: {course.creator?.full_name}
                                </Badge>
                                <small className="text-muted">{course.subscribers_count} подписчиков</small>
                              </div>
                            </div>
                            <div className="d-flex gap-2">
                              <Button className="btn-custom-primary btn-sm-custom" as={Link} to={`/portal/courses/${course.id}`}>
                                Подробнее
                              </Button>
                              {course.is_subscribed ? (
                                <Button
                                  className="btn-custom-outline btn-sm-custom"
                                  onClick={() => openUnsubscribeModal(course)}
                                  disabled={subscribingId === course.id}
                                  style={{ borderColor: '#dc3545', color: '#dc3545' }}
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
                                  className="btn-custom-cyan btn-sm-custom"
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
                            </div>
                          </div>
                          <div className="card-image">
                            <img src={course.thumbnail_url || course.image_url} alt={course.title} />
                          </div>
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
                <Row className="g-4">
                  {drafts.map((course) => (
                    <Col md={12} key={course.id}>
                      <Card className="custom-card custom-card-horizontal">
                        <div className="card-content">
                          <div>
                            <h3 className="custom-card-title">
                              {course.title}
                              <Badge bg="warning" text="dark" className="ms-2">Черновик</Badge>
                            </h3>
                            <p className="custom-card-text">{course.short_description}</p>
                            <div className="d-flex align-items-center gap-3 mb-2">
                              <Badge className="custom-badge">
                                Автор: {course.creator?.full_name}
                              </Badge>
                              <small className="text-muted">{course.subscribers_count} подписчиков</small>
                            </div>
                          </div>
                          <div>
                            <Button className="btn-custom-primary btn-sm-custom" as={Link} to={`/portal/courses/${course.id}`}>
                              Редактировать
                            </Button>
                          </div>
                        </div>
                        <div className="card-image">
                          <img src={course.thumbnail_url || course.image_url} alt={course.title} />
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Tab>
            </Tabs>
          ) : (
            <Row className="g-4">
              {courses.length > 0 ? (
                courses.map((course) => (
                  <Col md={12} key={course.id}>
                    <Card className="custom-card custom-card-horizontal">
                      <div className="card-content">
                        <div>
                          <h3 className="custom-card-title">{course.title}</h3>
                          <p className="custom-card-text">{course.short_description}</p>
                          <div className="d-flex align-items-center gap-3 mb-2">
                            <Badge className="custom-badge">
                              Автор: {course.creator?.full_name}
                            </Badge>
                            <small className="text-muted">{course.subscribers_count} подписчиков</small>
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          <Button className="btn-custom-primary btn-sm-custom" as={Link} to={`/portal/courses/${course.id}`}>
                            Подробнее
                          </Button>
                          {course.is_subscribed ? (
                            <Button
                              className="btn-custom-outline btn-sm-custom"
                              onClick={() => openUnsubscribeModal(course)}
                              disabled={subscribingId === course.id}
                              style={{ borderColor: '#dc3545', color: '#dc3545' }}
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
                              className="btn-custom-cyan btn-sm-custom"
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
                        </div>
                      </div>
                      <div className="card-image">
                        <img src={course.thumbnail_url || course.image_url} alt={course.title} />
                      </div>
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
