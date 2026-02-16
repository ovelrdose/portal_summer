import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as BsNavbar, Nav, Container, Button, Dropdown } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, isTeacher, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <Container style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
      <BsNavbar expand="lg" className="custom-navbar">
        <BsNavbar.Brand as={Link} to="/" className="handwriting">
          Портал курсов
        </BsNavbar.Brand>
        <BsNavbar.Toggle aria-controls="navbar-nav" />
        <BsNavbar.Collapse id="navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">
              <i className="bi bi-house-fill me-1"></i> Главная
            </Nav.Link>
            <Nav.Link as={Link} to="/news">
              <i className="bi bi-newspaper me-1"></i> Новости
            </Nav.Link>
            <Nav.Link as={Link} to="/gallery">
              <i className="bi bi-images me-1"></i> Галерея
            </Nav.Link>
            {isAuthenticated && (
              <>
                <Nav.Link as={Link} to="/portal">
                  <i className="bi bi-mortarboard-fill me-1"></i> Курсы
                </Nav.Link>
                <Nav.Link as={Link} to="/portal/my-schedule">
                  <i className="bi bi-calendar3 me-1"></i> Расписание
                </Nav.Link>
              </>
            )}
          </Nav>
          <Nav>
            {isAuthenticated ? (
              <Dropdown align="end">
                <Dropdown.Toggle className="custom-dropdown-toggle" id="user-dropdown">
                  {user?.first_name || 'Профиль'}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to="/profile">
                    Личный кабинет
                  </Dropdown.Item>
                  {isTeacher && (
                    <Dropdown.Item as={Link} to="/admin/courses/new">
                      Создать курс
                    </Dropdown.Item>
                  )}
                  {(isAdmin || isTeacher) && (
                    <>
                      <Dropdown.Divider />
                      <Dropdown.Item as={Link} to="/statistics">
                        Статистика
                      </Dropdown.Item>
                    </>
                  )}
                  {isAdmin && (
                    <Dropdown.Item as={Link} to="/admin">
                      Админ-панель
                    </Dropdown.Item>
                  )}
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout}>
                    Выйти
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <>
                <Button
                  className="navbar-btn-outline me-2"
                  as={Link}
                  to="/login"
                >
                  Войти
                </Button>
                <Button className="navbar-btn-primary" as={Link} to="/register">
                  Регистрация
                </Button>
              </>
            )}
          </Nav>
        </BsNavbar.Collapse>
      </BsNavbar>
    </Container>
  );
};

export default Navbar;
