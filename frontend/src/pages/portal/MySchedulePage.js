import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Spinner, Alert, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { coursesAPI } from '../../services/api';
import { formatDateTimeDisplay } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';

const MySchedulePage = () => {
  const { user } = useAuth();
  const [unlocks, setUnlocks] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const response = await coursesAPI.getMySchedule();
      setUnlocks(response.data.unlocks || []);
      setHomeworks(response.data.homeworks || []);
    } catch (err) {
      console.error('Error loading my schedule:', err);
      setError('Не удалось загрузить расписание');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  const isTeacher = user && (user.is_teacher || user.is_admin);

  if (isTeacher) {
    return (
      <Container className="py-5">
        <h2 className="mb-4">Мое расписание</h2>
        <Alert variant="info">
          Расписание доступно только для студентов
        </Alert>
      </Container>
    );
  }

  // Разделяем ДЗ на просроченные и актуальные
  const overdueHomeworks = homeworks.filter(hw => hw.is_overdue);
  const upcomingHomeworks = homeworks.filter(hw => !hw.is_overdue);

  // Если нет данных вообще
  const hasNoData = unlocks.length === 0 && homeworks.length === 0;

  return (
    <Container className="py-5">
      <h2 className="mb-4">
        <i className="bi bi-calendar-week me-2"></i>
        Мое расписание
      </h2>

      {/* Информационное сообщение если нет данных */}
      {hasNoData && (
        <Alert variant="info">
          <Alert.Heading>Нет данных для отображения</Alert.Heading>
          <p className="mb-0">
            У вас пока нет запланированных открытий материалов или домашних заданий с дедлайнами.
            Это расписание будет обновляться автоматически по мере добавления материалов в ваши курсы.
          </p>
        </Alert>
      )}

      {/* Секция 1: Запланированные открытия */}
      {!hasNoData && (
        <Card className="mb-4">
          <Card.Header>
            <i className="bi bi-unlock me-2"></i>
            Запланированные открытия материалов
          </Card.Header>
          <Card.Body>
            {unlocks.length === 0 ? (
              <p className="text-muted mb-0">Нет запланированных открытий</p>
            ) : (
              <Table responsive hover size="sm">
                <thead>
                  <tr>
                    <th>Курс</th>
                    <th>Раздел</th>
                    <th>Элемент</th>
                    <th>Дата открытия</th>
                  </tr>
                </thead>
                <tbody>
                  {unlocks.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <Link to={`/portal/courses/${item.course_id}`}>
                          {item.course_title}
                        </Link>
                      </td>
                      <td>{item.section_title}</td>
                      <td>{item.element_title || item.element_type || '—'}</td>
                      <td>
                        <i className="bi bi-clock me-1"></i>
                        {formatDateTimeDisplay(item.unlock_datetime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Секция 2: Домашние задания */}
      {!hasNoData && (
        <Card className="mb-4">
          <Card.Header>
            <i className="bi bi-clipboard-check me-2"></i>
            Домашние задания
          </Card.Header>
          <Card.Body>
            {homeworks.length === 0 ? (
              <p className="text-muted mb-0">Нет домашних заданий с дедлайнами</p>
            ) : (
            <>
              {/* Просроченные ДЗ */}
              {overdueHomeworks.length > 0 && (
                <>
                  <h5 className="text-danger mb-3">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Просроченные ({overdueHomeworks.length})
                  </h5>
                  <Table responsive size="sm" className="mb-4">
                    <thead className="table-danger">
                      <tr>
                        <th>Курс</th>
                        <th>Раздел</th>
                        <th>Задание</th>
                        <th>Дедлайн</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueHomeworks.map((item, index) => (
                        <tr key={index} className="table-danger">
                          <td>
                            <Link to={`/portal/courses/${item.course_id}`}>
                              {item.course_title}
                            </Link>
                          </td>
                          <td>{item.section_title}</td>
                          <td>{item.element_title}</td>
                          <td>
                            <i className="bi bi-exclamation-triangle-fill me-1"></i>
                            {formatDateTimeDisplay(item.deadline)}
                          </td>
                          <td>
                            {item.submission_status === 'revision_requested' ? (
                              <Badge bg="warning">Требует доработки</Badge>
                            ) : (
                              <Badge bg="danger">Не сдано</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              )}

              {/* Актуальные ДЗ */}
              {upcomingHomeworks.length > 0 && (
                <>
                  <h5 className="mb-3">
                    Предстоящие ({upcomingHomeworks.length})
                  </h5>
                  <Table responsive hover size="sm">
                    <thead>
                      <tr>
                        <th>Курс</th>
                        <th>Раздел</th>
                        <th>Задание</th>
                        <th>Дедлайн</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingHomeworks.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <Link to={`/portal/courses/${item.course_id}`}>
                              {item.course_title}
                            </Link>
                          </td>
                          <td>{item.section_title}</td>
                          <td>{item.element_title}</td>
                          <td>
                            <i className="bi bi-clock me-1"></i>
                            {formatDateTimeDisplay(item.deadline)}
                          </td>
                          <td>
                            {item.submission_status === 'revision_requested' ? (
                              <Badge bg="warning">Требует доработки</Badge>
                            ) : (
                              <Badge bg="secondary">Не сдано</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              )}
            </>
            )}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default MySchedulePage;
