import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Spinner, Form, Button, Badge, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { usersAPI } from '../../services/api';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const usersRes = await usersAPI.getUsers();
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

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    try {
      await usersAPI.deleteUser(selectedUser.id);
      setShowDeleteModal(false);
      loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.error || 'Ошибка при удалении пользователя');
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

      {/* Users Management */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>Управление пользователями</Card.Header>
            <Card.Body>
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
                          className="me-2"
                        >
                          Роль
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => openDeleteModal(user)}
                        >
                          Удалить
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

      {/* Delete Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Удалить пользователя</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <>
              <p>Вы уверены, что хотите удалить пользователя?</p>
              <p>
                <strong>Имя:</strong> {selectedUser.full_name}
                <br />
                <strong>Email:</strong> {selectedUser.email}
              </p>
              <p className="text-danger">
                <strong>Внимание:</strong> Это действие необратимо. Все данные пользователя,
                включая домашние задания и подписки на курсы, будут удалены.
              </p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleDeleteUser}>
            Удалить
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;
