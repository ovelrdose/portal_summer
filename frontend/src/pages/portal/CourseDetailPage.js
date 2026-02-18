import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Container, Button, Spinner, Collapse,
  Form, Alert, Badge, Modal, Toast, ToastContainer, Dropdown
} from 'react-bootstrap';
import { coursesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LockedContentAlert from '../../components/LockedContentAlert';
import { isContentLocked, formatDateTimeDisplay } from '../../utils/dateUtils';
import '../../components/BlockEditor/BlockEditor.css';

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
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitElement, setResubmitElement] = useState(null);
  const [resubmitFile, setResubmitFile] = useState(null);
  const [resubmitComment, setResubmitComment] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  const [openSections, setOpenSections] = useState({});

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

  useEffect(() => {
    const isOwner = course?.creator?.id === user?.id;
    const canEdit = isOwner || user?.is_admin;

    if (course && (course.is_subscribed || canEdit)) {
      const interval = setInterval(() => {
        loadCourse();
      }, 60000);

      return () => {
        clearInterval(interval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, course?.is_subscribed, user?.id, user?.is_admin]);

  useEffect(() => {
    if (course?.sections?.length > 0) {
      setOpenSections(prev => {
        if (Object.keys(prev).length > 0) return prev;
        const init = {};
        course.sections.forEach((s, i) => { init[s.id] = i === 0; });
        return init;
      });
    }
  }, [course?.sections]);

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
      const errorData = err.response?.data;
      let errorMessage = 'Ошибка при отправке задания';

      if (errorData?.non_field_errors?.[0]) {
        errorMessage = errorData.non_field_errors[0];
      } else if (errorData?.element_id?.[0]) {
        errorMessage = errorData.element_id[0];
      } else if (errorData?.file?.[0]) {
        errorMessage = errorData.file[0];
      } else if (errorData?.detail) {
        errorMessage = errorData.detail;
      }

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const openResubmitModal = (element) => {
    setResubmitElement(element);
    setResubmitComment(element.my_submission?.comment || '');
    setShowResubmitModal(true);
    setError('');
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!resubmitFile) {
      setError('Выберите файл');
      return;
    }

    setResubmitting(true);
    try {
      await coursesAPI.resubmitHomework(resubmitElement.my_submission.id, {
        file: resubmitFile,
        comment: resubmitComment,
      });
      setShowResubmitModal(false);
      setResubmitFile(null);
      setResubmitComment('');
      setError('');
      setToast({
        show: true,
        message: 'Работа успешно переотправлена!',
        variant: 'success'
      });
      loadCourse();
    } catch (err) {
      console.error('Resubmit homework error:', err);
      const errorMessage = err.response?.data?.error
        || err.response?.data?.detail
        || 'Ошибка при переотправке задания';
      setError(errorMessage);
    } finally {
      setResubmitting(false);
    }
  };

  const toggleSection = (sectionId) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const isOwner = course?.creator?.id === user?.id;
  const canEdit = isOwner || user?.is_admin;
  const totalUnreviewed = homeworkStats.reduce((sum, s) => sum + s.submitted_count, 0);
  const hasHomeworkSubmissions = homeworkStats.some(s => s.total_submissions > 0);

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

  const showBurger = course.is_subscribed || canEdit;

  return (
    <Container className="py-5">

      {/* Navigation row: back link + actions burger */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Link to="/portal/courses" className="back-link d-inline-flex">
          <span className="back-arrow">←</span> Назад к курсам
        </Link>

        {showBurger && (
          <Dropdown align="end">
            <Dropdown.Toggle
              as="button"
              id="course-actions-menu"
              className="course-actions-burger"
            >
              &#8942;
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {canEdit && (
                <Dropdown.Item as={Link} to={`/admin/courses/${course.id}/edit`}>
                  Редактировать курс
                </Dropdown.Item>
              )}
              {canEdit && hasHomeworkSubmissions && (
                <Dropdown.Item as={Link} to={`/admin/courses/${id}/homework`}>
                  Проверка ДЗ ({totalUnreviewed} ожидают)
                </Dropdown.Item>
              )}
              {course.is_subscribed && (
                <>
                  {canEdit && <Dropdown.Divider />}
                  <Dropdown.Item
                    className="text-danger"
                    onClick={() => setShowUnsubscribeModal(true)}
                  >
                    Отписаться
                  </Dropdown.Item>
                </>
              )}
            </Dropdown.Menu>
          </Dropdown>
        )}
      </div>

      {/* Hero section */}
      <div className="mt-3 mb-5">
        {/* Top row: title (left) + author / subscriber count (right) */}
        <div className="course-hero-top">
          <h1 className="course-detail-title">{course.title}</h1>
          <div className="course-hero-meta">
            <span className="course-author-label">
              <i className="bi bi-person-circle me-1"></i>
              {course.creator?.full_name}
            </span>
            <div className="course-subscriber-pill">
              <span className="subscriber-icon">
                <i className="bi bi-people-fill"></i>
              </span>
              {course.subscribers_count} подписчиков
            </div>
          </div>
        </div>

        {/* Body row: description card (left) + image / subscribe (right) */}
        <div className="course-hero-body">
          <div className="course-description-card">
            <div className="preview-text" dangerouslySetInnerHTML={{ __html: course.description }} />
          </div>
          <div className="course-hero-image-wrap">
            <img src={course.image_url} alt={course.title} className="course-detail-image" />
          </div>
        </div>
      </div>

      {/* Sections */}
      {course.is_subscribed || canEdit ? (
        course.sections?.length > 0 ? (
          <div className="d-flex flex-column gap-4">
            {course.sections
              .filter(s => s.is_published)
              .map((section, index) => {
                const stat = homeworkStats.find(s => s.section_id === section.id);
                const isSectionLocked = !canEdit && isContentLocked(section.publish_datetime);
                const isOpen = openSections[section.id] ?? index === 0;

                return (
                  <div key={section.id} className="course-module-wrapper">
                    {/* Module header — inside the card */}
                    <div
                      className={`course-module-header${isOpen ? ' course-module-header--open' : ''}`}
                      onClick={() => toggleSection(section.id)}
                    >
                      <span className={`module-chevron ${isOpen ? 'open' : 'closed'}`}>
                        <i className="bi bi-chevron-right"></i>
                      </span>
                      {isSectionLocked && (
                        <i className="bi bi-lock-fill text-warning" title={`Откроется ${formatDateTimeDisplay(section.publish_datetime)}`}></i>
                      )}
                      <h3 className={`course-module-title ${isSectionLocked ? 'text-muted' : ''}`}>
                        {section.title}
                      </h3>
                      {isSectionLocked && (
                        <Badge bg="warning">
                          <i className="bi bi-clock"></i> Откроется {formatDateTimeDisplay(section.publish_datetime)}
                        </Badge>
                      )}
                      {canEdit && section.publish_datetime && isContentLocked(section.publish_datetime) && (
                        <Badge bg="secondary">
                          <i className="bi bi-lock"></i> До {formatDateTimeDisplay(section.publish_datetime)}
                        </Badge>
                      )}
                      {canEdit && stat && stat.total_submissions > 0 && (
                        <Badge bg={stat.submitted_count > 0 ? 'warning' : 'success'}>
                          ДЗ: {stat.reviewed_count}/{stat.total_submissions}
                        </Badge>
                      )}
                    </div>

                    {/* Module content — collapses below the header inside the same card */}
                    <Collapse in={isOpen}>
                      <div>
                        {isSectionLocked ? (
                          <div className="module-element">
                            <LockedContentAlert unlockDatetime={section.publish_datetime} />
                          </div>
                        ) : (
                          (() => {
                            const visibleElements = section.elements?.filter(e => e.is_published) || [];
                            return visibleElements.map((element, elemIdx) => {
                              const isElementLocked = !canEdit && isContentLocked(element.publish_datetime);
                              const isLast = elemIdx === visibleElements.length - 1;
                              return (
                                <div
                                  key={element.id}
                                  className={`module-element${!isLast ? ' module-element-divider' : ''}`}
                                >
                                  {/* Element title */}
                                  {(element.title || isElementLocked) && (
                                    <div className="module-element-title">
                                      {isElementLocked && (
                                        <i className="bi bi-lock-fill text-warning"
                                           title={`Откроется ${formatDateTimeDisplay(element.publish_datetime)}`}></i>
                                      )}
                                      <span className={isElementLocked ? 'text-muted' : ''}>
                                        {element.title || (
                                          element.content_type === 'text' ? 'Текст' :
                                          element.content_type === 'video' ? 'Видео' :
                                          element.content_type === 'image' ? 'Изображение' :
                                          element.content_type === 'link' ? 'Ссылка' :
                                          element.content_type === 'homework' ? 'Домашнее задание' : 'Элемент'
                                        )}
                                      </span>
                                      {isElementLocked && (
                                        <Badge bg="warning" className="ms-2">
                                          <i className="bi bi-clock"></i> Откроется {formatDateTimeDisplay(element.publish_datetime)}
                                        </Badge>
                                      )}
                                      {canEdit && element.publish_datetime && isContentLocked(element.publish_datetime) && (
                                        <Badge bg="secondary" className="ms-2">
                                          <i className="bi bi-lock"></i> До {formatDateTimeDisplay(element.publish_datetime)}
                                        </Badge>
                                      )}
                                    </div>
                                  )}

                                  {isElementLocked ? (
                                    <LockedContentAlert unlockDatetime={element.unlock_datetime} size="normal" />
                                  ) : (
                                    <>
                                      {/* Text */}
                                      {element.content_type === 'text' && (
                                        <div
                                          className="preview-text"
                                          dangerouslySetInnerHTML={{ __html: element.data?.html || element.text_content || '' }}
                                        />
                                      )}

                                      {/* Video — full width of content area */}
                                      {element.content_type === 'video' && element.data?.videoId && (
                                        <div>
                                          {element.data.title && !element.title && (
                                            <p className="text-muted small mb-2">{element.data.title}</p>
                                          )}
                                          <div className="ratio ratio-16x9">
                                            <iframe
                                              src={(() => {
                                                const { provider, videoId } = element.data;
                                                if (provider === 'youtube') return `https://www.youtube.com/embed/${videoId}`;
                                                if (provider === 'vimeo') return `https://player.vimeo.com/video/${videoId}`;
                                                if (provider === 'vk') {
                                                  const [oid, vid] = videoId.split('_');
                                                  return `https://vk.com/video_ext.php?oid=${oid}&id=${vid}&hd=2`;
                                                }
                                                if (provider === 'rutube') return `https://rutube.ru/play/embed/${videoId}`;
                                                if (provider === 'dzen') return `https://dzen.ru/embed/${videoId}?from_block=partner&from=zen&mute=0&autoplay=0&tv=0`;
                                                if (provider === 'custom') return videoId;
                                                return '';
                                              })()}
                                              title={element.data.title || 'Видео'}
                                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                              allowFullScreen
                                            />
                                          </div>
                                        </div>
                                      )}

                                      {/* Image */}
                                      {element.content_type === 'image' && element.data?.url && (
                                        <figure className="mb-0">
                                          <img
                                            src={element.data.url}
                                            alt={element.data?.alt || element.title || 'Изображение'}
                                            className="img-fluid rounded"
                                          />
                                          {element.data?.caption && (
                                            <figcaption className="text-muted mt-2 small">{element.data.caption}</figcaption>
                                          )}
                                        </figure>
                                      )}

                                      {/* Link */}
                                      {element.content_type === 'link' && element.data?.url && (
                                        <a
                                          href={element.data.url}
                                          target={element.data?.open_in_new_tab !== false ? '_blank' : '_self'}
                                          rel="noopener noreferrer"
                                          className="btn-custom-outline btn-sm-custom d-inline-block"
                                          style={{ borderRadius: 'var(--radius-medium)', padding: '0.5rem 1.25rem', border: '2px solid var(--primary-blue)', color: 'var(--primary-blue)', textDecoration: 'none' }}
                                        >
                                          {element.data?.text || element.data.url}
                                        </a>
                                      )}

                                      {/* Homework */}
                                      {element.content_type === 'homework' && (
                                        <div>
                                          {(element.data?.description || element.homework_description) && (
                                            <p className="mb-2">{element.data?.description || element.homework_description}</p>
                                          )}
                                          {element.data?.deadline && (
                                            <p className={`small mb-3 ${new Date(element.data.deadline) < new Date() && !element.my_submission ? 'text-danger' : 'text-muted'}`}>
                                              Дедлайн: {new Date(element.data.deadline).toLocaleString('ru-RU')}
                                              {new Date(element.data.deadline) < new Date() && !element.my_submission && (
                                                <Badge bg="danger" className="ms-2">Просрочен</Badge>
                                              )}
                                            </p>
                                          )}

                                          {element.my_submission ? (
                                            element.my_submission.status === 'reviewed' ? (
                                              <div
                                                className="p-3 rounded"
                                                style={{
                                                  borderLeft: `4px solid ${
                                                    element.my_submission.grade >= 70 ? '#198754' :
                                                    element.my_submission.grade >= 50 ? '#ffc107' : '#dc3545'
                                                  }`,
                                                  background: 'rgba(0,0,0,0.02)'
                                                }}
                                              >
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                  <strong>Статус:</strong>
                                                  <Badge bg={element.my_submission.grade >= 70 ? 'success' : element.my_submission.grade >= 50 ? 'warning' : 'danger'}>
                                                    Оценка: {element.my_submission.grade}/100
                                                  </Badge>
                                                </div>
                                                {element.my_submission.reviewed_at && (
                                                  <p className="text-muted small mb-2">
                                                    Проверено: {new Date(element.my_submission.reviewed_at).toLocaleString('ru-RU')}
                                                  </p>
                                                )}
                                                {element.my_submission.teacher_comment && (
                                                  <div className="mt-2">
                                                    <strong>Комментарий преподавателя:</strong>
                                                    <div className="preview-text mt-1" dangerouslySetInnerHTML={{ __html: element.my_submission.teacher_comment }} />
                                                  </div>
                                                )}
                                              </div>
                                            ) : element.my_submission.status === 'revision_requested' ? (
                                              <div className="p-3 rounded" style={{ borderLeft: '4px solid #ffc107', background: 'rgba(0,0,0,0.02)' }}>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                  <strong>Статус:</strong>
                                                  <Badge bg="warning">Требует доработки</Badge>
                                                </div>
                                                {element.my_submission.reviewed_at && (
                                                  <p className="text-muted small mb-2">
                                                    Проверено: {new Date(element.my_submission.reviewed_at).toLocaleString('ru-RU')}
                                                  </p>
                                                )}
                                                {element.my_submission.teacher_comment && (
                                                  <div className="mb-3">
                                                    <strong>Комментарий преподавателя:</strong>
                                                    <div className="preview-text mt-1" dangerouslySetInnerHTML={{ __html: element.my_submission.teacher_comment }} />
                                                  </div>
                                                )}
                                                <button className="homework-goto-link" onClick={() => openResubmitModal(element)}>
                                                  Загрузить исправленную работу <span className="goto-arrow"></span>
                                                </button>
                                              </div>
                                            ) : (
                                              <p className="text-muted small mb-0">
                                                <Badge bg="info">Отправлено — ожидает проверки</Badge>
                                              </p>
                                            )
                                          ) : course.is_subscribed ? (
                                            element.data?.deadline && new Date(element.data.deadline) < new Date() ? (
                                              <p className="text-danger small mb-0">
                                                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                                Срок сдачи просрочен — {new Date(element.data.deadline).toLocaleString('ru-RU')}
                                              </p>
                                            ) : (
                                              <button className="homework-goto-link" onClick={() => openHomeworkModal(element)}>
                                                Прикрепить домашнее задание <span className="goto-arrow"></span>
                                              </button>
                                            )
                                          ) : (
                                            <p className="text-muted small mb-0">Подпишитесь на курс, чтобы сдать задание</p>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            });
                          })()
                        )}
                      </div>
                    </Collapse>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-muted">Содержание курса пока не добавлено</p>
        )
      ) : (
        <div className="custom-card p-4 text-center">
          <h4 className="mb-3">Доступ к содержимому ограничен</h4>
          <p className="text-muted mb-3">Чтобы просмотреть материалы курса, запишитесь на него.</p>
          <Button className="btn-custom-cyan btn-sm-custom" onClick={handleSubscribe} disabled={subscribing}>
            {subscribing ? <><Spinner animation="border" size="sm" className="me-2" />Подписка...</> : 'Записаться на курс'}
          </Button>
        </div>
      )}

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

      {/* Resubmit Homework Modal */}
      <Modal show={showResubmitModal} onHide={() => setShowResubmitModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Загрузить исправленную работу</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleResubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}

            {resubmitElement?.my_submission?.teacher_comment && (
              <Alert variant="warning">
                <strong>Комментарий преподавателя:</strong>
                <div
                  className="preview-text mt-2"
                  dangerouslySetInnerHTML={{
                    __html: resubmitElement.my_submission.teacher_comment,
                  }}
                />
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Загрузить исправленный файл *</Form.Label>
              <Form.Control
                type="file"
                onChange={(e) => setResubmitFile(e.target.files[0])}
                required
              />
              <Form.Text className="text-muted">
                Предыдущий файл будет заменен
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Комментарий (опционально)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={resubmitComment}
                onChange={(e) => setResubmitComment(e.target.value)}
                placeholder="Опишите внесенные изменения..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowResubmitModal(false)}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={resubmitting}
            >
              {resubmitting ? 'Отправка...' : 'Отправить'}
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
