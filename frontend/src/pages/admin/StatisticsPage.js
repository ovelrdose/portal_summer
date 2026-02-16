import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Spinner, Form, Button, Alert, Badge } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { newStatsAPI } from '../../services/api';

const StatisticsPage = () => {
  const { isAdmin, isTeacher } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Global stats state (admin only)
  const [globalStats, setGlobalStats] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [topCourses, setTopCourses] = useState([]);
  const [users, setUsers] = useState({ results: [], count: 0 });
  const [selectedRole, setSelectedRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Demographics state (admin only)
  const [gradeStats, setGradeStats] = useState([]);
  const [geographyStats, setGeographyStats] = useState({ top_countries: [], top_cities: [] });

  // Course stats state (admin and teachers)
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseStats, setCourseStats] = useState(null);
  const [loadingCourseStats, setLoadingCourseStats] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadGlobalStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, selectedRole, currentPage, isAdmin]);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseStats(selectedCourse);
    }
  }, [selectedCourse]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[StatisticsPage] Loading initial data...');
      const coursesData = await newStatsAPI.getCoursesForStats();
      console.log('[StatisticsPage] Courses data:', coursesData);
      setCourses(coursesData);
      if (coursesData.length > 0) {
        setSelectedCourse(coursesData[0].id);
      }
    } catch (err) {
      console.error('[StatisticsPage] Error loading initial data:', err);
      console.error('[StatisticsPage] Error response:', err.response);
      setError(`Ошибка загрузки данных: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalStats = async () => {
    if (!isAdmin) return;

    try {
      console.log('[StatisticsPage] Loading global stats...');
      const [statsData, usersData, topUsersData, topCoursesData, gradeData, geoData] = await Promise.all([
        newStatsAPI.getGlobalStats(dateFrom, dateTo),
        newStatsAPI.getUsersByRole(selectedRole, currentPage),
        newStatsAPI.getTopActiveUsers(dateFrom, dateTo, 10),
        newStatsAPI.getTopPopularCourses(10),
        newStatsAPI.getUsersByGrade(),
        newStatsAPI.getUsersGeography()
      ]);

      console.log('[StatisticsPage] Global stats:', { statsData, usersData, topUsersData, topCoursesData, gradeData, geoData });
      setGlobalStats(statsData);
      setUsers(usersData);
      setTopUsers(topUsersData);
      setTopCourses(topCoursesData);
      setGradeStats(gradeData);
      setGeographyStats(geoData);
    } catch (err) {
      console.error('[StatisticsPage] Error loading global stats:', err);
      console.error('[StatisticsPage] Error response:', err.response);
      setError(`Ошибка загрузки глобальной статистики: ${err.response?.data?.detail || err.message}`);
    }
  };

  const loadCourseStats = async (courseId) => {
    setLoadingCourseStats(true);
    try {
      console.log('[StatisticsPage] Loading course stats for course:', courseId);
      const data = await newStatsAPI.getCourseStats(courseId);
      console.log('[StatisticsPage] Course stats:', data);
      setCourseStats(data);
    } catch (err) {
      console.error('[StatisticsPage] Error loading course stats:', err);
      console.error('[StatisticsPage] Error response:', err.response);
      setError(`Ошибка загрузки статистики курса: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoadingCourseStats(false);
    }
  };

  const handleExportUsers = () => {
    newStatsAPI.exportUsersCSV(selectedRole);
  };

  const handleExportActiveUsers = () => {
    newStatsAPI.exportActiveUsersCSV(dateFrom, dateTo, 10);
  };

  const handleExportGradeStats = () => {
    newStatsAPI.exportUsersByGradeCSV();
  };

  const handleExportGeography = () => {
    newStatsAPI.exportUsersGeographyCSV();
  };

  const handleExportCourseStats = () => {
    if (selectedCourse) {
      newStatsAPI.exportCourseStatsCSV(selectedCourse);
    }
  };

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(users.count / 20);

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!isAdmin && !isTeacher) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          У вас нет доступа к статистике. Эта страница доступна только администраторам и преподавателям.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h1 className="mb-4">Статистика</h1>

      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

      {/* Global Statistics - Admin Only */}
      {isAdmin && (
        <div className="mb-5">
          <h2 className="mb-3">Глобальная статистика</h2>

          {/* Date Filter */}
          <Card className="mb-4">
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Дата начала:</Form.Label>
                    <Form.Control
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Дата окончания:</Form.Label>
                    <Form.Control
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
              {(dateFrom || dateTo) && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                >
                  Сбросить фильтр
                </Button>
              )}
            </Card.Body>
          </Card>

          {/* General Metrics */}
          {globalStats && (
            <Row className="mb-4">
              <Col md={4} className="mb-3">
                <Card className="h-100">
                  <Card.Body>
                    <h6 className="text-muted mb-2">Уникальные посетители</h6>
                    <h3 className="mb-1">{globalStats.unique_visitors}</h3>
                    <small className="text-muted">Пока не отслеживается</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="mb-3">
                <Card className="h-100">
                  <Card.Body>
                    <h6 className="text-muted mb-2">Просмотры страниц</h6>
                    <h3 className="mb-1">{globalStats.page_views}</h3>
                    <small className="text-muted">Пока не отслеживается</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="mb-3">
                <Card className="h-100">
                  <Card.Body>
                    <h6 className="text-muted mb-2">Всего пользователей</h6>
                    <h3 className="mb-1 text-primary">{globalStats.total_users}</h3>
                    <small className="text-muted">Новых за период: {globalStats.new_users}</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="mb-3">
                <Card className="h-100">
                  <Card.Body>
                    <h6 className="text-muted mb-2">Всего курсов</h6>
                    <h3 className="mb-1 text-success">{globalStats.total_courses}</h3>
                    <small className="text-muted">Активных: {globalStats.active_courses}</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="mb-3">
                <Card className="h-100">
                  <Card.Body>
                    <h6 className="text-muted mb-2">Новых курсов</h6>
                    <h3 className="mb-1 text-info">{globalStats.new_courses}</h3>
                    <small className="text-muted">За выбранный период</small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {/* Top Active Users */}
          <Row className="mb-4">
            <Col lg={12}>
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <strong>Топ-10 активных пользователей</strong>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleExportActiveUsers}
                  >
                    Экспорт в CSV
                  </Button>
                </Card.Header>
                <Card.Body>
                  {topUsers.length > 0 ? (
                    <div className="table-responsive">
                      <Table striped hover size="sm">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Имя</th>
                            <th>Email</th>
                            <th className="text-center">Общий балл</th>
                            <th className="text-center">ДЗ</th>
                            <th className="text-center">Подписки</th>
                            <th className="text-center">Активен</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topUsers.map((user, index) => (
                            <tr key={user.id}>
                              <td>{index + 1}</td>
                              <td>{user.full_name}</td>
                              <td className="text-muted small">{user.email}</td>
                              <td className="text-center">
                                <Badge bg="primary" pill>{user.activity_count}</Badge>
                              </td>
                              <td className="text-center">
                                <Badge bg="info" pill>{user.homework_count || 0}</Badge>
                              </td>
                              <td className="text-center">
                                <Badge bg="success" pill>{user.subscription_count || 0}</Badge>
                              </td>
                              <td className="text-center">
                                {user.recent_login ? (
                                  <Badge bg="success">✓</Badge>
                                ) : (
                                  <Badge bg="secondary">−</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted">Нет данных</p>
                  )}
                </Card.Body>
              </Card>
            </Col>

          </Row>

          {/* Top Popular Courses */}
          <Row className="mb-4">
            <Col lg={12}>
              <Card>
                <Card.Header>
                  <strong>Топ-10 популярных курсов</strong>
                </Card.Header>
                <Card.Body>
                  {topCourses.length > 0 ? (
                    <div className="table-responsive">
                      <Table striped hover size="sm">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Название</th>
                            <th>Автор</th>
                            <th className="text-center">Подписчиков</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topCourses.map((course, index) => (
                            <tr key={course.id}>
                              <td>{index + 1}</td>
                              <td>{course.title}</td>
                              <td className="text-muted small">{course.creator_name}</td>
                              <td className="text-center">
                                <Badge bg="success" pill>{course.subscribers_count}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted">Нет данных</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Demographics: Grade and Geography Distribution */}
          <Row className="mb-4">
            {/* Grade Distribution */}
            <Col md={6} className="mb-3">
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <strong>Распределение по классам</strong>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleExportGradeStats}
                  >
                    Экспорт в CSV
                  </Button>
                </Card.Header>
                <Card.Body>
                  {gradeStats.length > 0 ? (
                    <div className="table-responsive">
                      <Table striped hover size="sm">
                        <thead>
                          <tr>
                            <th>Класс</th>
                            <th className="text-center">Участников</th>
                            <th>График</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gradeStats.map((stat) => {
                            const maxCount = Math.max(...gradeStats.map(s => s.count));
                            const percentage = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;
                            return (
                              <tr key={stat.grade}>
                                <td><strong>{stat.grade} класс</strong></td>
                                <td className="text-center">
                                  <Badge bg="primary" pill>{stat.count}</Badge>
                                </td>
                                <td>
                                  <div className="progress" style={{ height: '20px' }}>
                                    <div
                                      className="progress-bar bg-primary"
                                      role="progressbar"
                                      style={{ width: `${percentage}%` }}
                                      aria-valuenow={stat.count}
                                      aria-valuemin="0"
                                      aria-valuemax={maxCount}
                                    >
                                      {stat.count > 0 ? stat.count : ''}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                      <div className="text-muted small mt-2">
                        Всего: {gradeStats.reduce((sum, stat) => sum + stat.count, 0)} участников
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted">Нет данных о классах</p>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Geography Distribution */}
            <Col md={6} className="mb-3">
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <strong>География участников</strong>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleExportGeography}
                  >
                    Экспорт в CSV
                  </Button>
                </Card.Header>
                <Card.Body>
                  {/* Top Countries */}
                  <h6 className="text-muted mb-2">ТОП-5 стран</h6>
                  {geographyStats.top_countries && geographyStats.top_countries.length > 0 ? (
                    <Table striped hover size="sm" className="mb-4">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Страна</th>
                          <th className="text-center">Участников</th>
                        </tr>
                      </thead>
                      <tbody>
                        {geographyStats.top_countries.map((country, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{country.country}</td>
                            <td className="text-center">
                              <Badge bg="info" pill>{country.count}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <p className="text-muted small mb-4">Нет данных о странах</p>
                  )}

                  {/* Top Cities */}
                  <h6 className="text-muted mb-2">ТОП-5 городов</h6>
                  {geographyStats.top_cities && geographyStats.top_cities.length > 0 ? (
                    <Table striped hover size="sm">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Город</th>
                          <th>Страна</th>
                          <th className="text-center">Участников</th>
                        </tr>
                      </thead>
                      <tbody>
                        {geographyStats.top_cities.map((city, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{city.city}</td>
                            <td className="text-muted small">{city.country || '—'}</td>
                            <td className="text-center">
                              <Badge bg="success" pill>{city.count}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <p className="text-muted small">Нет данных о городах</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Users by Role Export */}
          <Card className="mb-4">
            <Card.Header>
              <strong>Пользователи по ролям</strong>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Фильтр по роли:</Form.Label>
                    <Form.Select
                      value={selectedRole}
                      onChange={(e) => handleRoleChange(e.target.value)}
                    >
                      <option value="">Все роли</option>
                      <option value="admin">Администраторы</option>
                      <option value="teacher">Преподаватели</option>
                      <option value="user">Студенты</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6} className="d-flex align-items-end">
                  <Button
                    variant="success"
                    onClick={handleExportUsers}
                    className="w-100"
                  >
                    Экспорт в CSV
                  </Button>
                </Col>
              </Row>

              {users.results.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <Table striped hover>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Имя</th>
                          <th>Email</th>
                          <th>Роль</th>
                          <th>Дата регистрации</th>
                          <th>Последний вход</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.results.map(user => (
                          <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>{user.full_name}</td>
                            <td>{user.email}</td>
                            <td>
                              <Badge bg={
                                user.role === 'admin' ? 'danger' :
                                user.role === 'teacher' ? 'primary' : 'secondary'
                              }>
                                {user.role_display}
                              </Badge>
                            </td>
                            <td>{new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
                            <td>
                              {user.last_login
                                ? new Date(user.last_login).toLocaleDateString('ru-RU')
                                : 'Никогда'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <nav>
                      <ul className="pagination justify-content-center">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            Назад
                          </button>
                        </li>
                        {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <li
                              key={page}
                              className={`page-item ${currentPage === page ? 'active' : ''}`}
                            >
                              <button
                                className="page-link"
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </button>
                            </li>
                          );
                        })}
                        {totalPages > 10 && <li className="page-item disabled"><span className="page-link">...</span></li>}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            Вперед
                          </button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </>
              ) : (
                <p className="text-muted">Нет пользователей</p>
              )}
            </Card.Body>
          </Card>
        </div>
      )}

      {/* Course Statistics - Admin and Teachers */}
      {(isAdmin || isTeacher) && (
        <div className="mb-5">
          <h2 className="mb-3">Статистика курса</h2>

          <Card className="mb-4">
            <Card.Body>
              <Row>
                <Col md={8}>
                  <Form.Group className="mb-3">
                    <Form.Label>Выберите курс:</Form.Label>
                    <Form.Select
                      value={selectedCourse || ''}
                      onChange={(e) => setSelectedCourse(Number(e.target.value))}
                    >
                      {courses.length > 0 ? (
                        courses.map(course => (
                          <option key={course.id} value={course.id}>
                            {course.title} (автор: {course.creator_name})
                          </option>
                        ))
                      ) : (
                        <option>Нет доступных курсов</option>
                      )}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  <Button
                    variant="success"
                    onClick={handleExportCourseStats}
                    disabled={!selectedCourse}
                    className="w-100 mb-3"
                  >
                    Экспорт в CSV
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Course Statistics Display */}
          {loadingCourseStats ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : courseStats ? (
            <>
              <Row className="mb-4">
                <Col md={3} className="mb-3">
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <h6 className="text-muted mb-2">Подписчиков</h6>
                      <h2 className="mb-0 text-primary">{courseStats.subscribers_count}</h2>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3} className="mb-3">
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <h6 className="text-muted mb-2">Выполненных ДЗ</h6>
                      <h2 className="mb-0 text-success">{courseStats.completed_homework_count}</h2>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3} className="mb-3">
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <h6 className="text-muted mb-2">Просроченных ДЗ</h6>
                      <h2 className="mb-0 text-warning">{courseStats.overdue_homework_count}</h2>
                      <small className="text-muted">Пока не отслеживается</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3} className="mb-3">
                  <Card className="h-100">
                    <Card.Body className="text-center">
                      <h6 className="text-muted mb-2">Средняя оценка</h6>
                      <h2 className="mb-0 text-info">
                        {courseStats.average_grade ? courseStats.average_grade.toFixed(1) : 'Н/Д'}
                      </h2>
                      <small className="text-muted">Всего оценок: {courseStats.total_graded}</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Grade Distribution */}
              <Card>
                <Card.Header>
                  <strong>Распределение оценок</strong>
                </Card.Header>
                <Card.Body>
                  {courseStats.total_graded > 0 ? (
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Диапазон</th>
                          <th>Количество</th>
                          <th>Процент</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>0-20 баллов</td>
                          <td>{courseStats.grade_distribution.range_0_20}</td>
                          <td>
                            {((courseStats.grade_distribution.range_0_20 / courseStats.total_graded) * 100).toFixed(1)}%
                          </td>
                        </tr>
                        <tr>
                          <td>21-40 баллов</td>
                          <td>{courseStats.grade_distribution.range_21_40}</td>
                          <td>
                            {((courseStats.grade_distribution.range_21_40 / courseStats.total_graded) * 100).toFixed(1)}%
                          </td>
                        </tr>
                        <tr>
                          <td>41-60 баллов</td>
                          <td>{courseStats.grade_distribution.range_41_60}</td>
                          <td>
                            {((courseStats.grade_distribution.range_41_60 / courseStats.total_graded) * 100).toFixed(1)}%
                          </td>
                        </tr>
                        <tr>
                          <td>61-80 баллов</td>
                          <td>{courseStats.grade_distribution.range_61_80}</td>
                          <td>
                            {((courseStats.grade_distribution.range_61_80 / courseStats.total_graded) * 100).toFixed(1)}%
                          </td>
                        </tr>
                        <tr>
                          <td>81-100 баллов</td>
                          <td>{courseStats.grade_distribution.range_81_100}</td>
                          <td>
                            {((courseStats.grade_distribution.range_81_100 / courseStats.total_graded) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  ) : (
                    <p className="text-muted">Пока нет оцененных домашних заданий</p>
                  )}
                </Card.Body>
              </Card>
            </>
          ) : (
            <Alert variant="info">Выберите курс для просмотра статистики</Alert>
          )}
        </div>
      )}
    </Container>
  );
};

export default StatisticsPage;
