import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs, Badge } from 'react-bootstrap';
import { usersAPI, coursesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const ProfilePage = () => {
  const { user, updateUser, isTeacher, isAdmin } = useAuth();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    patronymic: '',
    grade: '',
    country: '',
    city: '',
  });
  const [myCourses, setMyCourses] = useState([]);
  const [createdCourses, setCreatedCourses] = useState([]);
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        patronymic: user.patronymic || '',
        grade: user.grade || '',
        country: user.country || '',
        city: user.city || '',
      });
    }
    loadMyCourses();
    if (isTeacher || isAdmin) {
      loadCreatedCourses();
    }
  }, [user, isTeacher, isAdmin]);

  const loadMyCourses = async () => {
    try {
      const response = await coursesAPI.getMyCourses();
      setMyCourses(response.data);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadCreatedCourses = async () => {
    try {
      const response = await coursesAPI.getCreatedCourses();
      setCreatedCourses(response.data);
    } catch (error) {
      console.error('Error loading created courses:', error);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await usersAPI.updateProfile(formData);
      updateUser(response.data);
      setSuccess('Профиль успешно обновлен');
    } catch (err) {
      setError('Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      await usersAPI.changePassword({
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });
      setSuccess('Пароль успешно изменен');
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при смене пароля');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'admin':
        return <Badge bg="danger">Администратор</Badge>;
      case 'teacher':
        return <Badge bg="primary">Преподаватель</Badge>;
      default:
        return <Badge bg="secondary">Пользователь</Badge>;
    }
  };

  return (
    <Container className="py-5">
      <h1 className="mb-4">Личный кабинет</h1>

      <Row>
        <Col lg={4} className="mb-4">
          <Card>
            <Card.Body className="text-center">
              <div
                className="rounded-circle bg-secondary mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{ width: '100px', height: '100px' }}
              >
                {user?.photo ? (
                  <img
                    src={user.photo}
                    alt="Фото"
                    className="rounded-circle"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span className="text-white fs-1">
                    {user?.first_name?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <h4>{user?.full_name}</h4>
              <p className="text-muted">{user?.email}</p>
              {getRoleBadge()}
              {user?.grade && (
                <p className="mt-2 mb-0">
                  <small className="text-muted">{user.grade} класс</small>
                </p>
              )}
              {(user?.country || user?.city) && (
                <p className="mb-0">
                  <small className="text-muted">
                    {[user.city, user.country].filter(Boolean).join(', ')}
                  </small>
                </p>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          {(error || success) && (
            <Alert variant={error ? 'danger' : 'success'} dismissible onClose={() => { setError(''); setSuccess(''); }}>
              {error || success}
            </Alert>
          )}

          <Tabs defaultActiveKey="courses" className="mb-4">
            <Tab eventKey="courses" title="Мои курсы">
              {myCourses.length > 0 ? (
                <Row>
                  {myCourses.map(({ course }) => (
                    <Col md={6} key={course.id} className="mb-3">
                      <Card>
                        <Card.Body>
                          <Card.Title>{course.title}</Card.Title>
                          <Card.Text className="text-muted small">
                            {course.short_description}
                          </Card.Text>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            as={Link}
                            to={`/portal/courses/${course.id}`}
                          >
                            Перейти
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              ) : (
                <p className="text-muted">Вы пока не записаны ни на один курс</p>
              )}
            </Tab>

            {(isTeacher || isAdmin) && (
              <Tab eventKey="created" title="Созданные курсы">
                {createdCourses.length > 0 ? (
                  <Row>
                    {createdCourses.map((course) => (
                      <Col md={6} key={course.id} className="mb-3">
                        <Card>
                          <Card.Body>
                            <Card.Title>
                              {course.title}
                              {!course.is_published && (
                                <Badge bg="warning" text="dark" className="ms-2">
                                  Черновик
                                </Badge>
                              )}
                            </Card.Title>
                            <Card.Text className="text-muted small">
                              {course.short_description}
                            </Card.Text>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <small className="text-muted">
                                {course.subscribers_count} подписчиков
                              </small>
                            </div>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              as={Link}
                              to={`/portal/courses/${course.id}`}
                            >
                              Перейти к курсу
                            </Button>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <p className="text-muted">Вы еще не создали ни одного курса</p>
                )}
              </Tab>
            )}

            <Tab eventKey="profile" title="Редактирование">
              <Card>
                <Card.Body>
                  <Form onSubmit={handleProfileSubmit}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Фамилия</Form.Label>
                          <Form.Control
                            type="text"
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Имя</Form.Label>
                          <Form.Control
                            type="text"
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>Отчество</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.patronymic}
                        onChange={(e) => setFormData({ ...formData, patronymic: e.target.value })}
                      />
                    </Form.Group>

                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Класс</Form.Label>
                          <Form.Select
                            value={formData.grade}
                            onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                          >
                            <option value="">Выберите</option>
                            {[...Array(11)].map((_, i) => (
                              <option key={i + 1} value={i + 1}>{i + 1}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Страна</Form.Label>
                          <Form.Control
                            type="text"
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Город</Form.Label>
                          <Form.Control
                            type="text"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="password" title="Смена пароля">
              <Card>
                <Card.Body>
                  <Form onSubmit={handlePasswordSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Текущий пароль</Form.Label>
                      <Form.Control
                        type="password"
                        value={passwordData.old_password}
                        onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Новый пароль</Form.Label>
                      <Form.Control
                        type="password"
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        required
                        minLength={8}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Подтверждение пароля</Form.Label>
                      <Form.Control
                        type="password"
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        required
                      />
                    </Form.Group>

                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? 'Сохранение...' : 'Изменить пароль'}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Col>
      </Row>
    </Container>
  );
};

export default ProfilePage;
