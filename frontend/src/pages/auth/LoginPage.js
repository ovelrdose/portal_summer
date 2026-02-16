import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/portal');
    } catch (err) {
      setError(
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        'Ошибка входа. Проверьте email и пароль.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <div className="custom-form-container">
        <h2 className="custom-form-title">Вход</h2>

        {error && <Alert variant="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Control
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="custom-form-control"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Control
              type="password"
              placeholder="Пароль"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="custom-form-control"
              required
            />
          </Form.Group>

          <Button
            type="submit"
            className="btn-custom-primary custom-form-btn"
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </Button>
        </Form>

        <div className="text-center mt-4">
          <p className="mb-2">
            Нет аккаунта? <Link to="/register" className="custom-form-link">Зарегистрироваться</Link>
          </p>
          <Link to="/forgot-password" className="custom-form-link">
            Забыли пароль?
          </Link>
        </div>
      </div>
    </Container>
  );
};

export default LoginPage;
