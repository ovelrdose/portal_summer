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
    <BsNavbar bg="dark" variant="dark" expand="lg" sticky="top" style={{ zIndex: 1050 }}>
      <Container>
        <BsNavbar.Brand as={Link} to="/">
          Портал курсов
        </BsNavbar.Brand>
        <BsNavbar.Toggle aria-controls="navbar-nav" />
        <BsNavbar.Collapse id="navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Главная</Nav.Link>
            <Nav.Link as={Link} to="/news">Новости</Nav.Link>
            <Nav.Link as={Link} to="/gallery">Галерея</Nav.Link>
            {isAuthenticated && (
              <>
                <Nav.Link as={Link} to="/portal">Портал курсов</Nav.Link>
                <Nav.Link as={Link} to="/portal/my-schedule">Мое расписание</Nav.Link>
              </>
            )}
          </Nav>
          <Nav>
            {isAuthenticated ? (
              <Dropdown align="end">
                <Dropdown.Toggle variant="outline-light" id="user-dropdown">
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
                  {isAdmin && (
                    <>
                      <Dropdown.Divider />
                      <Dropdown.Item as={Link} to="/admin">
                        Админ-панель
                      </Dropdown.Item>
                    </>
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
                  variant="outline-light"
                  className="me-2"
                  as={Link}
                  to="/login"
                >
                  Войти
                </Button>
                <Button variant="light" as={Link} to="/register">
                  Регистрация
                </Button>
              </>
            )}
          </Nav>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
};

export default Navbar;
