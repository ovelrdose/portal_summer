import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Spinner, Form, Button, Badge, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { statsAPI, usersAPI } from '../../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [usersByGrade, setUsersByGrade] = useState([]);
  const [popularCourses, setPopularCourses] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, gradeRes, coursesRes, activeRes, usersRes] = await Promise.all([
        statsAPI.getDashboard(),
        statsAPI.getUsersByGrade(),
        statsAPI.getPopularCourses(),
        statsAPI.getActiveUsers(),
        usersAPI.getUsers(),
      ]);
      setStats(statsRes.data);
      setUsersByGrade(gradeRes.data);
      setPopularCourses(coursesRes.data);
      setActiveUsers(activeRes.data);
      setUsers(usersRes.data.results || usersRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };

  const handleAssignRole = async () => {
    try {
      await usersAPI.assignRole({
        user_id: selectedUser.id,
        role: newRole,
      });
      setShowRoleModal(false);
      loadData();
    } catch (error) {
      console.error('Error assigning role:', error);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h1 className="mb-4">Панель администратора</h1>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h2 className="text-primary">{stats?.total_users}</h2>
              <Card.Text>Пользователей</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h2 className="text-success">{stats?.total_teachers}</h2>
              <Card.Text>Преподавателей</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h2 className="text-info">{stats?.total_courses}</h2>
              <Card.Text>Курсов</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h2 className="text-warning">{stats?.pending_homework}</h2>
              <Card.Text>ДЗ на проверку</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Content Management */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>Управление контентом</Card.Header>
            <Card.Body>
              <Row>
                <Col md={4} className="mb-3 mb-md-0">
                  <div className="d-grid gap-2">
                    <Button variant="primary" as={Link} to="/admin/news/new">
                      + Создать новость
                    </Button>
                    <Button variant="outline-primary" as={Link} to="/news">
                      Просмотр всех новостей
                    </Button>
                  </div>
                </Col>
                <Col md={4} className="mb-3 mb-md-0">
                  <div className="d-grid gap-2">
                    <Button variant="success" as={Link} to="/admin/courses/new">
                      + Создать курс
                    </Button>
                    <Button variant="outline-success" as={Link} to="/portal/courses">
                      Просмотр всех курсов
                    </Button>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="d-grid gap-2">
                    <Button variant="info" as={Link} to="/admin/albums/new">
                      + Создать альбом
                    </Button>
                    <Button variant="outline-info" as={Link} to="/gallery">
                      Перейти к галерее
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Users by Grade */}
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>Пользователи по классам</Card.Header>
            <Card.Body>
              <Table striped size="sm">
                <thead>
                  <tr>
                    <th>Класс</th>
                    <th>Количество</th>
                  </tr>
                </thead>
                <tbody>
                  {usersByGrade.map((item) => (
                    <tr key={item.grade || 'none'}>
                      <td>{item.grade ? `${item.grade} класс` : 'Не указан'}</td>
                      <td>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* Popular Courses */}
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header>Популярные курсы</Card.Header>
            <Card.Body>
              <Table striped size="sm">
                <thead>
                  <tr>
                    <th>Курс</th>
                    <th>Автор</th>
                    <th>Подписчиков</th>
                  </tr>
                </thead>
                <tbody>
                  {popularCourses.map((course) => (
                    <tr key={course.id}>
                      <td>
                        <Link to={`/portal/courses/${course.id}`}>
                          {course.title}
                        </Link>
                      </td>
                      <td>{course.creator}</td>
                      <td>{course.subscribers_count}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Active Users */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>Топ-10 активных пользователей</Card.Header>
            <Card.Body>
              <Table striped size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Пользователь</th>
                    <th>Класс</th>
                    <th>Сдано ДЗ</th>
                  </tr>
                </thead>
                <tbody>
                  {activeUsers.map((user, index) => (
                    <tr key={user.id}>
                      <td>{index + 1}</td>
                      <td>{user.full_name}</td>
                      <td>{user.grade || '-'}</td>
                      <td>{user.homework_count}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* Users Management */}
        <Col md={6}>
          <Card>
            <Card.Header>Управление пользователями</Card.Header>
            <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table striped size="sm">
                <thead>
                  <tr>
                    <th>Пользователь</th>
                    <th>Роль</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        {user.full_name}
                        <br />
                        <small className="text-muted">{user.email}</small>
                      </td>
                      <td>
                        <Badge
                          bg={
                            user.role === 'admin'
                              ? 'danger'
                              : user.role === 'teacher'
                              ? 'primary'
                              : 'secondary'
                          }
                        >
                          {user.role === 'admin'
                            ? 'Админ'
                            : user.role === 'teacher'
                            ? 'Препод.'
                            : 'Польз.'}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => openRoleModal(user)}
                        >
                          Роль
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Role Modal */}
      <Modal show={showRoleModal} onHide={() => setShowRoleModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Назначить роль</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <>
              <p>
                <strong>Пользователь:</strong> {selectedUser.full_name}
              </p>
              <Form.Group>
                <Form.Label>Роль</Form.Label>
                <Form.Select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="user">Пользователь</option>
                  <option value="teacher">Преподаватель</option>
                  <option value="admin">Администратор</option>
                </Form.Select>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRoleModal(false)}>
            Отмена
          </Button>
          <Button variant="primary" onClick={handleAssignRole}>
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;
