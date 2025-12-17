import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Container, Row, Col, Card, Button, Spinner, Accordion,
  Form, Alert, Badge, Modal, Toast, ToastContainer
} from 'react-bootstrap';
import { coursesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const CourseDetailPage = () => {
  const { id } = useParams();
  const { user, isTeacher } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [homeworkFile, setHomeworkFile] = useState(null);
  const [homeworkComment, setHomeworkComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    loadCourse();
  }, [id]);

  const loadCourse = async () => {
    try {
      const response = await coursesAPI.getCourse(id);
      setCourse(response.data);
    } catch (error) {
      console.error('Error loading course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      await coursesAPI.subscribe(id);
      setToast({ show: true, message: 'Вы успешно записались на курс!', variant: 'success' });
      loadCourse();
    } catch (error) {
      console.error('Error subscribing:', error);
      const errorMessage = error.response?.data?.detail || 'Ошибка при записи на курс. Попробуйте еще раз.';
      setToast({ show: true, message: errorMessage, variant: 'danger' });
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    setSubscribing(true);
    try {
      await coursesAPI.unsubscribe(id);
      setToast({ show: true, message: 'Вы отписались от курса', variant: 'info' });
      loadCourse();
    } catch (error) {
      console.error('Error unsubscribing:', error);
      const errorMessage = error.response?.data?.detail || 'Ошибка при отписке от курса. Попробуйте еще раз.';
      setToast({ show: true, message: errorMessage, variant: 'danger' });
    } finally {
      setSubscribing(false);
    }
  };

  const openHomeworkModal = (element) => {
    setSelectedElement(element);
    setShowHomeworkModal(true);
    setError('');
  };

  const handleHomeworkSubmit = async (e) => {
    e.preventDefault();
    if (!homeworkFile) {
      setError('Выберите файл');
      return;
    }

    setSubmitting(true);
    try {
      await coursesAPI.submitHomework({
        element: selectedElement.id,
        file: homeworkFile,
        comment: homeworkComment,
      });
      setShowHomeworkModal(false);
      setHomeworkFile(null);
      setHomeworkComment('');
      loadCourse();
    } catch (err) {
      setError('Ошибка при отправке задания');
    } finally {
      setSubmitting(false);
    }
  };

  const isOwner = course?.creator?.id === user?.id;
  const canEdit = isOwner || user?.is_admin;

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!course) {
    return (
      <Container className="py-5 text-center">
        <h2>Курс не найден</h2>
        <Button as={Link} to="/portal/courses" variant="primary">
          К списку курсов
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row>
        <Col lg={8}>
          <Button as={Link} to="/portal/courses" variant="outline-secondary" className="mb-4">
            Назад к курсам
          </Button>

          {course.image && (
            <img
              src={course.image}
              alt={course.title}
              className="img-fluid rounded mb-4"
              style={{ maxHeight: '300px', width: '100%', objectFit: 'cover' }}
            />
          )}

          <h1 className="mb-3">{course.title}</h1>

          <div className="mb-4">
            <Badge bg="secondary" className="me-2">
              {course.subscribers_count} подписчиков
            </Badge>
            <span className="text-muted">
              Автор: {course.creator?.full_name}
            </span>
          </div>

          <div
            className="mb-4"
            dangerouslySetInnerHTML={{ __html: course.description }}
          />

          {/* Course Sections */}
          <h3 className="mb-3">Содержание курса</h3>
          {course.is_subscribed || canEdit ? (
            course.sections?.length > 0 ? (
              <Accordion defaultActiveKey="0">
                {course.sections
                  .filter((s) => s.is_published)
                  .map((section, index) => (
                    <Accordion.Item key={section.id} eventKey={String(index)}>
                      <Accordion.Header>{section.title}</Accordion.Header>
                      <Accordion.Body>
                        {section.elements
                          ?.filter((e) => e.is_published)
                          .map((element) => (
                            <div key={element.id} className="mb-3 pb-3 border-bottom">
                              {element.title && <h5>{element.title}</h5>}

                              {element.content_type === 'text' && (
                                <div
                                  dangerouslySetInnerHTML={{ __html: element.text_content }}
                                />
                              )}

                              {element.content_type === 'image' && element.image && (
                                <img
                                  src={element.image}
                                  alt={element.title || 'Изображение'}
                                  className="img-fluid rounded"
                                />
                              )}

                              {element.content_type === 'link' && (
                                <a
                                  href={element.link_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {element.link_text || element.link_url}
                                </a>
                              )}

                              {element.content_type === 'homework' && (
                                <Card className="bg-light">
                                  <Card.Body>
                                    <Card.Title>Домашнее задание</Card.Title>
                                    <Card.Text>{element.homework_description}</Card.Text>
                                    {element.my_submission ? (
                                      <Alert
                                        variant={
                                          element.my_submission.status === 'reviewed'
                                            ? 'success'
                                            : 'info'
                                        }
                                      >
                                        <strong>Статус:</strong>{' '}
                                        {element.my_submission.status === 'reviewed'
                                          ? 'Проверено'
                                          : 'Отправлено'}
                                        {element.my_submission.teacher_comment && (
                                          <div className="mt-2">
                                            <strong>Комментарий преподавателя:</strong>
                                            <p>{element.my_submission.teacher_comment}</p>
                                          </div>
                                        )}
                                      </Alert>
                                    ) : course.is_subscribed ? (
                                      <Button
                                        variant="primary"
                                        onClick={() => openHomeworkModal(element)}
                                      >
                                        Прикрепить работу
                                      </Button>
                                    ) : (
                                      <small className="text-muted">
                                        Подпишитесь на курс, чтобы сдать задание
                                      </small>
                                    )}
                                  </Card.Body>
                                </Card>
                              )}
                            </div>
                          ))}
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
              </Accordion>
            ) : (
              <p className="text-muted">Содержание курса пока не добавлено</p>
            )
          ) : (
            <Alert variant="info" className="text-center">
              <Alert.Heading>Доступ к содержимому ограничен</Alert.Heading>
              <p>
                Чтобы просмотреть содержимое курса и получить доступ ко всем материалам,
                необходимо подписаться на курс.
              </p>
              <hr />
              <p className="mb-0">
                Нажмите кнопку "Записаться на курс" в правой панели, чтобы начать обучение.
              </p>
            </Alert>
          )}
        </Col>

        <Col lg={4}>
          <Card className="sticky-top" style={{ top: '80px' }}>
            <Card.Body>
              {course.is_subscribed ? (
                <>
                  <Alert variant="success">Вы записаны на этот курс</Alert>
                  <Button
                    variant="outline-danger"
                    className="w-100"
                    onClick={handleUnsubscribe}
                    disabled={subscribing}
                  >
                    {subscribing ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Отписка...
                      </>
                    ) : (
                      'Отписаться'
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  variant="success"
                  size="lg"
                  className="w-100"
                  onClick={handleSubscribe}
                  disabled={subscribing}
                >
                  {subscribing ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Подписка...
                    </>
                  ) : (
                    'Записаться на курс'
                  )}
                </Button>
              )}

              {canEdit && (
                <Button
                  variant="outline-primary"
                  className="w-100 mt-3"
                  as={Link}
                  to={`/admin/courses/${course.id}/edit`}
                >
                  Редактировать курс
                </Button>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Homework Modal */}
      <Modal show={showHomeworkModal} onHide={() => setShowHomeworkModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Отправить домашнее задание</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleHomeworkSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}

            <Form.Group className="mb-3">
              <Form.Label>Файл *</Form.Label>
              <Form.Control
                type="file"
                onChange={(e) => setHomeworkFile(e.target.files[0])}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Комментарий</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={homeworkComment}
                onChange={(e) => setHomeworkComment(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowHomeworkModal(false)}>
              Отмена
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Отправка...' : 'Отправить'}
            </Button>
          </Modal.Footer>
        </Form>
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

export default CourseDetailPage;
