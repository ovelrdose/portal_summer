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
  const { user } = useAuth();
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
  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [homeworkStats, setHomeworkStats] = useState([]);

  useEffect(() => {
    loadCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const isOwner = course?.creator?.id === user?.id;
    const canEditLocal = isOwner || user?.is_admin;

    if (canEditLocal && id) {
      loadHomeworkStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, user, id]);

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

  const loadHomeworkStats = async () => {
    if (!id) return;
    try {
      const response = await coursesAPI.getHomeworkStatsByCourse(id);
      setHomeworkStats(response.data);
    } catch (error) {
      console.error('Error loading homework stats:', error);
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
    setShowUnsubscribeModal(false);
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
        element_id: selectedElement.id,
        file: homeworkFile,
        comment: homeworkComment,
      });
      setShowHomeworkModal(false);
      setHomeworkFile(null);
      setHomeworkComment('');
      setError('');
      loadCourse();
    } catch (err) {
      console.error('Submit homework error:', err);
      const errorMessage = err.response?.data?.element_id?.[0]
        || err.response?.data?.file?.[0]
        || err.response?.data?.detail
        || 'Ошибка при отправке задания';
      setError(errorMessage);
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
              <Accordion defaultActiveKey="0" style={{ position: 'relative', zIndex: 1 }}>
                {course.sections
                  .filter((s) => s.is_published)
                  .map((section, index) => {
                    const stat = homeworkStats.find(s => s.section_id === section.id);

                    return (
                    <Accordion.Item key={section.id} eventKey={String(index)} className="mb-3">
                      <Accordion.Header>
                        <div className="d-flex align-items-center">
                          <span>{section.title}</span>
                          {canEdit && stat && stat.total_submissions > 0 && (
                            <Badge
                              bg={stat.submitted_count > 0 ? 'warning' : 'success'}
                              className="ms-2"
                            >
                              ДЗ: {stat.reviewed_count}/{stat.total_submissions}
                            </Badge>
                          )}
                        </div>
                      </Accordion.Header>
                      <Accordion.Body>
                        {section.elements
                          ?.filter((e) => e.is_published)
                          .map((element) => (
                            <div key={element.id} className="mb-3 pb-3 border-bottom">
                              {element.title && <h5>{element.title}</h5>}

                              {/* Текстовый блок */}
                              {element.content_type === 'text' && (
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: element.data?.html || element.text_content || '',
                                  }}
                                />
                              )}

                              {/* Видео блок */}
                              {element.content_type === 'video' && element.data?.video_id && (
                                <div className="ratio ratio-16x9">
                                  <iframe
                                    src={
                                      element.data.provider === 'youtube'
                                        ? `https://www.youtube.com/embed/${element.data.video_id}`
                                        : `https://player.vimeo.com/video/${element.data.video_id}`
                                    }
                                    title={element.data.title || 'Видео'}
                                    allowFullScreen
                                  />
                                </div>
                              )}

                              {/* Изображение */}
                              {element.content_type === 'image' && (
                                <figure>
                                  <img
                                    src={element.data?.url || element.image}
                                    alt={element.data?.alt || element.title || 'Изображение'}
                                    className="img-fluid rounded"
                                  />
                                  {element.data?.caption && (
                                    <figcaption className="text-muted mt-2">
                                      {element.data.caption}
                                    </figcaption>
                                  )}
                                </figure>
                              )}

                              {/* Ссылка */}
                              {element.content_type === 'link' && (
                                <a
                                  href={element.data?.url || element.link_url}
                                  target={element.data?.open_in_new_tab !== false ? '_blank' : '_self'}
                                  rel="noopener noreferrer"
                                  className="btn btn-outline-primary"
                                >
                                  {element.data?.text || element.link_text || element.data?.url || element.link_url}
                                </a>
                              )}

                              {/* Домашнее задание */}
                              {element.content_type === 'homework' && (
                                <Card className="bg-light">
                                  <Card.Body>
                                    <Card.Title>Домашнее задание</Card.Title>
                                    <Card.Text>
                                      {element.data?.description || element.homework_description}
                                    </Card.Text>
                                    {element.data?.deadline && (
                                      <p className="text-muted">
                                        <strong>Дедлайн:</strong>{' '}
                                        {new Date(element.data.deadline).toLocaleString('ru-RU')}
                                      </p>
                                    )}
                                    {element.my_submission ? (
                                      element.my_submission.status === 'reviewed' ? (
                                        <Card
                                          className="mt-3"
                                          style={{
                                            borderLeft: `4px solid ${
                                              element.my_submission.grade >= 70
                                                ? '#198754'
                                                : element.my_submission.grade >= 50
                                                ? '#ffc107'
                                                : '#dc3545'
                                            }`,
                                          }}
                                        >
                                          <Card.Body>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                              <strong>Статус:</strong>
                                              <Badge
                                                bg={
                                                  element.my_submission.grade >= 70
                                                    ? 'success'
                                                    : element.my_submission.grade >= 50
                                                    ? 'warning'
                                                    : 'danger'
                                                }
                                              >
                                                Оценка: {element.my_submission.grade}/100
                                              </Badge>
                                            </div>
                                            {element.my_submission.reviewed_at && (
                                              <p className="text-muted small mb-2">
                                                Проверено:{' '}
                                                {new Date(element.my_submission.reviewed_at).toLocaleString('ru-RU')}
                                              </p>
                                            )}
                                            {element.my_submission.teacher_comment && (
                                              <div className="mt-2">
                                                <strong>Комментарий преподавателя:</strong>
                                                <div
                                                  className="mt-1"
                                                  dangerouslySetInnerHTML={{
                                                    __html: element.my_submission.teacher_comment,
                                                  }}
                                                />
                                              </div>
                                            )}
                                          </Card.Body>
                                        </Card>
                                      ) : (
                                        <Alert variant="info">
                                          <strong>Статус:</strong> Отправлено, ожидает проверки
                                        </Alert>
                                      )
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
                    );
                  })}
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
                    onClick={() => setShowUnsubscribeModal(true)}
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
                <>
                  <Button
                    variant="outline-primary"
                    className="w-100 mt-3"
                    as={Link}
                    to={`/admin/courses/${course.id}/edit`}
                  >
                    Редактировать курс
                  </Button>
                  {(() => {
                    const totalUnreviewed = homeworkStats.reduce((sum, stat) => sum + stat.submitted_count, 0);
                    const hasSomeHomework = homeworkStats.some(stat => stat.total_submissions > 0);

                    return hasSomeHomework && (
                      <Button
                        variant="outline-success"
                        className="w-100 mb-2 mt-2"
                        as={Link}
                        to={`/admin/courses/${id}/homework`}
                      >
                        Проверка ДЗ ({totalUnreviewed} ожидают проверки)
                      </Button>
                    );
                  })()}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Unsubscribe Confirmation Modal */}
      <Modal show={showUnsubscribeModal} onHide={() => setShowUnsubscribeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение отписки</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Вы действительно хотите отписаться от курса <strong>"{course?.title}"</strong>?</p>
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
