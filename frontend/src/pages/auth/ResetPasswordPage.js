import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import api from '../../services/api';

const ResetPasswordPage = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!uid || !token) {
      setError('Недействительная ссылка восстановления пароля');
    }
  }, [uid, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Валидация на frontend
    if (password1 !== password2) {
      setFieldErrors({ password2: 'Пароли не совпадают' });
      return;
    }

    if (password1.length < 8) {
      setFieldErrors({ password1: 'Пароль должен содержать минимум 8 символов' });
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/password/reset/confirm/', {
        uid,
        token,
        new_password1: password1,
        new_password2: password2,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      if (err.response?.data) {
        if (typeof err.response.data === 'object') {
          setFieldErrors(err.response.data);
          setError('Пожалуйста, исправьте ошибки в форме');
        } else if (err.response.data.detail) {
          setError(err.response.data.detail);
        } else {
          setError('Недействительная или устаревшая ссылка восстановления');
        }
      } else {
        setError('Произошла ошибка. Попробуйте еще раз');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!uid || !token) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6}>
            <Card>
              <Card.Body className="text-center p-5">
                <div className="mb-4">
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="40" cy="40" r="38" stroke="#dc3545" strokeWidth="4"/>
                    <path d="M30 30L50 50M50 30L30 50" stroke="#dc3545" strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2 className="mb-3">Недействительная ссылка</h2>
                <p className="text-muted mb-4">
                  Ссылка восстановления пароля недействительна или устарела.
                </p>
                <Button variant="primary" as={Link} to="/forgot-password" className="me-2">
                  Запросить новую ссылку
                </Button>
                <Button variant="outline-secondary" as={Link} to="/login">
                  Вход в систему
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  if (success) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6}>
            <Card>
              <Card.Body className="text-center p-5">
                <div className="mb-4">
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="40" cy="40" r="38" stroke="#28a745" strokeWidth="4"/>
                    <path d="M25 40L35 50L55 30" stroke="#28a745" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="mb-3">Пароль успешно изменен</h2>
                <p className="text-muted mb-4">
                  Теперь вы можете войти в систему с новым паролем
                </p>
                <Spinner animation="border" variant="primary" className="mb-3" />
                <p className="text-muted small">
                  Переадресация на страницу входа...
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={5}>
          <Card>
            <Card.Body className="p-5">
              <h2 className="text-center mb-4">Установка нового пароля</h2>

              {error && (
                <Alert variant="danger">{error}</Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Новый пароль *</Form.Label>
                  <Form.Control
                    type="password"
                    value={password1}
                    onChange={(e) => setPassword1(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Минимум 8 символов"
                    isInvalid={!!fieldErrors.new_password1 || !!fieldErrors.password1}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.new_password1 || fieldErrors.password1}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Пароль должен содержать минимум 8 символов
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Подтвердите пароль *</Form.Label>
                  <Form.Control
                    type="password"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    required
                    placeholder="Повторите пароль"
                    isInvalid={!!fieldErrors.new_password2 || !!fieldErrors.password2}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.new_password2 || fieldErrors.password2}
                  </Form.Control.Feedback>
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? 'Сохранение...' : 'Установить новый пароль'}
                </Button>

                <div className="text-center">
                  <Link to="/login" className="text-decoration-none">
                    Вернуться на страницу входа
                  </Link>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ResetPasswordPage;
