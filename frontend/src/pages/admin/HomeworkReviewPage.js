import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Container, Row, Col, Card, Button, Spinner,
  Form, Badge, Modal, Table, Alert, ListGroup
} from 'react-bootstrap';
import { coursesAPI } from '../../services/api';
import RichTextEditor from '../../components/RichTextEditor';

const HomeworkReviewPage = () => {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [selectedSection, setSelectedSection] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Review Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [grade, setGrade] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadCourse();
    loadHomeworks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadCourse = async () => {
    try {
      const response = await coursesAPI.getCourse(id);
      setCourse(response.data);
    } catch (error) {
      console.error('Error loading course:', error);
      setError('Ошибка загрузки курса');
    }
  };

  const loadHomeworks = async () => {
    setLoading(true);
    try {
      const response = await coursesAPI.getHomework({ course: id });
      // Обработка пагинированного ответа от DRF
      const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setHomeworks(data);
    } catch (error) {
      console.error('Error loading homeworks:', error);
      setError('Ошибка загрузки домашних заданий');
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (homework) => {
    setSelectedHomework(homework);
    setGrade(homework.grade || 0);
    setComment(homework.teacher_comment || '');
    setShowReviewModal(true);
  };

  const handleReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await coursesAPI.reviewHomework(selectedHomework.id, {
        grade,
        comment,
      });
      setShowReviewModal(false);
      loadHomeworks();
    } catch (error) {
      console.error('Error reviewing homework:', error);
      setError('Ошибка при проверке задания');
    } finally {
      setSubmitting(false);
    }
  };

  const loadReviewHistory = async (homeworkId) => {
    setLoadingHistory(true);
    setShowHistoryModal(true);
    try {
      const response = await coursesAPI.getHomeworkReviewHistory(homeworkId);
      setReviewHistory(response.data);
    } catch (error) {
      console.error('Error loading review history:', error);
      setReviewHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filter homeworks
  const filteredHomeworks = homeworks.filter((hw) => {
    if (selectedSection !== 'all' && hw.element?.section?.id !== parseInt(selectedSection)) {
      return false;
    }
    if (statusFilter === 'submitted' && hw.status !== 'submitted') {
      return false;
    }
    if (statusFilter === 'reviewed' && hw.status !== 'reviewed') {
      return false;
    }
    return true;
  });

  // Group homeworks by section
  const groupedHomeworks = {};
  filteredHomeworks.forEach((hw) => {
    const sectionId = hw.element?.section?.id || 'unknown';
    if (!groupedHomeworks[sectionId]) {
      groupedHomeworks[sectionId] = {
        section: hw.element?.section,
        homeworks: [],
      };
    }
    groupedHomeworks[sectionId].homeworks.push(hw);
  });

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
        <Button as={Link} to="/admin/courses" variant="primary">
          К списку курсов
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button
            as={Link}
            to={`/portal/courses/${id}`}
            variant="outline-secondary"
            className="mb-2"
          >
            Назад к курсу
          </Button>
          <h2>{course.title} - Проверка домашних заданий</h2>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        {/* Left Panel - Filters */}
        <Col md={4} lg={3}>
          <Card className="mb-3">
            <Card.Header>
              <strong>Фильтры</strong>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Статус</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Все</option>
                  <option value="submitted">Ожидают проверки</option>
                  <option value="reviewed">Проверено</option>
                </Form.Select>
              </Form.Group>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <strong>Разделы</strong>
            </Card.Header>
            <Card.Body className="p-0">
              <ListGroup variant="flush">
                <ListGroup.Item
                  action
                  active={selectedSection === 'all'}
                  onClick={() => setSelectedSection('all')}
                  className="d-flex justify-content-between align-items-center"
                >
                  <span>Все разделы</span>
                  <Badge bg="primary">{homeworks.length}</Badge>
                </ListGroup.Item>

                {course.sections?.map((section) => {
                  const sectionHomeworks = homeworks.filter(
                    (hw) => hw.element?.section?.id === section.id
                  );
                  const unreviewed = sectionHomeworks.filter(
                    (hw) => hw.status === 'submitted'
                  ).length;

                  return (
                    <ListGroup.Item
                      key={section.id}
                      action
                      active={selectedSection === section.id.toString()}
                      onClick={() => setSelectedSection(section.id.toString())}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <span>{section.title}</span>
                      <Badge bg={unreviewed > 0 ? 'warning' : 'success'}>
                        {sectionHomeworks.length}
                      </Badge>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Panel - Homework List */}
        <Col md={8} lg={9}>
          {filteredHomeworks.length === 0 ? (
            <Alert variant="info">
              Нет домашних заданий по выбранным фильтрам
            </Alert>
          ) : (
            Object.entries(groupedHomeworks).map(([sectionId, { section, homeworks: sectionHws }]) => (
              <Card key={sectionId} className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">{section?.title || 'Неизвестный раздел'}</h5>
                </Card.Header>
                <Card.Body>
                  {sectionHws.map((hw) => (
                    <Card key={hw.id} className="mb-3">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6>{hw.user?.full_name || hw.user?.email}</h6>
                            <small className="text-muted">
                              Задание: {hw.element?.title || 'Без названия'}
                            </small>
                          </div>
                          <Badge bg={hw.status === 'reviewed' ? 'success' : 'warning'}>
                            {hw.status === 'reviewed' ? 'Проверено' : 'Ожидает проверки'}
                          </Badge>
                        </div>

                        <div className="mb-2">
                          <small className="text-muted">
                            Отправлено:{' '}
                            {new Date(hw.submitted_at).toLocaleString('ru-RU')}
                          </small>
                        </div>

                        {hw.comment && (
                          <div className="mb-2">
                            <strong>Комментарий студента:</strong>
                            <p className="mb-0">{hw.comment}</p>
                          </div>
                        )}

                        {hw.file && (
                          <div className="mb-2">
                            <a
                              href={hw.file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-outline-primary"
                            >
                              Скачать работу
                            </a>
                          </div>
                        )}

                        {hw.status === 'reviewed' && (
                          <Card className="bg-light mt-2">
                            <Card.Body>
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <strong>Оценка:</strong>
                                <Badge
                                  bg={
                                    hw.grade >= 70
                                      ? 'success'
                                      : hw.grade >= 50
                                      ? 'warning'
                                      : 'danger'
                                  }
                                >
                                  {hw.grade}/100
                                </Badge>
                              </div>
                              {hw.teacher_comment && (
                                <div>
                                  <strong>Комментарий:</strong>
                                  <div
                                    dangerouslySetInnerHTML={{
                                      __html: hw.teacher_comment,
                                    }}
                                  />
                                </div>
                              )}
                              {hw.reviewed_at && (
                                <small className="text-muted">
                                  Проверено:{' '}
                                  {new Date(hw.reviewed_at).toLocaleString('ru-RU')}
                                </small>
                              )}
                            </Card.Body>
                          </Card>
                        )}

                        <div className="mt-3 d-flex gap-2">
                          <Button
                            variant={hw.status === 'reviewed' ? 'outline-primary' : 'primary'}
                            size="sm"
                            onClick={() => openReviewModal(hw)}
                          >
                            {hw.status === 'reviewed' ? 'Изменить оценку' : 'Проверить'}
                          </Button>
                          {hw.status === 'reviewed' && (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => loadReviewHistory(hw.id)}
                            >
                              История изменений
                            </Button>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </Card.Body>
              </Card>
            ))
          )}
        </Col>
      </Row>

      {/* Review Modal */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedHomework?.status === 'reviewed'
              ? 'Изменить оценку'
              : 'Проверить домашнее задание'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleReview}>
          <Modal.Body>
            {selectedHomework && (
              <>
                <div className="mb-3">
                  <strong>Студент:</strong> {selectedHomework.user?.full_name || selectedHomework.user?.email}
                </div>
                <div className="mb-3">
                  <strong>Задание:</strong> {selectedHomework.element?.title}
                </div>
                {selectedHomework.file && (
                  <div className="mb-3">
                    <a
                      href={selectedHomework.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-primary"
                    >
                      Открыть работу студента
                    </a>
                  </div>
                )}
              </>
            )}

            <Form.Group className="mb-3">
              <Form.Label>
                Оценка (0-100) *
              </Form.Label>
              <Form.Control
                type="number"
                min="0"
                max="100"
                value={grade}
                onChange={(e) => setGrade(parseInt(e.target.value, 10))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Комментарий</Form.Label>
              <RichTextEditor
                value={comment}
                onChange={setComment}
                placeholder="Оставьте комментарий для студента..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowReviewModal(false)}>
              Отмена
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Сохранение...' : 'Сохранить оценку'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* History Modal */}
      <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>История изменений оценок</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingHistory ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : reviewHistory.length === 0 ? (
            <Alert variant="info">Нет истории изменений</Alert>
          ) : (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Преподаватель</th>
                  <th>Оценка</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {reviewHistory.map((entry, index) => (
                  <tr key={index}>
                    <td>
                      {new Date(entry.reviewed_at).toLocaleString('ru-RU')}
                    </td>
                    <td>{entry.reviewer?.full_name || entry.reviewer?.email}</td>
                    <td>
                      <Badge
                        bg={
                          entry.grade >= 70
                            ? 'success'
                            : entry.grade >= 50
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {entry.grade}/100
                      </Badge>
                    </td>
                    <td>
                      {entry.teacher_comment ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: entry.teacher_comment,
                          }}
                        />
                      ) : (
                        <span className="text-muted">Нет комментария</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowHistoryModal(false)}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default HomeworkReviewPage;
