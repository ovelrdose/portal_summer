import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';

const RegisterPage = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password1: '',
    password2: '',
    first_name: '',
    last_name: '',
    patronymic: '',
    grade: '',
    country: '',
    city: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password1 !== formData.password2) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      setSuccess(true);
    } catch (err) {
      const errors = err.response?.data;
      if (errors) {
        const errorMessages = Object.values(errors).flat().join(' ');
        setError(errorMessages);
      } else {
        setError('Ошибка регистрации. Попробуйте позже.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container>
        <div className="custom-form-container">
          <Alert variant="success">
            <Alert.Heading>Регистрация успешна!</Alert.Heading>
            <p>
              На вашу почту отправлено письмо со ссылкой для подтверждения email.
              Пожалуйста, перейдите по ссылке из письма для активации аккаунта.
            </p>
            <p className="mb-0">
              После подтверждения email вы сможете войти в систему.
            </p>
          </Alert>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="custom-form-container" style={{ maxWidth: '700px' }}>
        <h2 className="custom-form-title">Регистрация</h2>

        {error && <Alert variant="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  name="last_name"
                  placeholder="*Фамилия"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="custom-form-control"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  name="first_name"
                  placeholder="*Имя"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="custom-form-control"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  name="patronymic"
                  placeholder="*Отчество"
                  value={formData.patronymic}
                  onChange={handleChange}
                  className="custom-form-control"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Control
              type="email"
              name="email"
              placeholder="*Email"
              value={formData.email}
              onChange={handleChange}
              className="custom-form-control"
              required
            />
          </Form.Group>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Select
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  className="custom-form-control"
                >
                  <option value="">Класс</option>
                  {[...Array(11)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  name="country"
                  placeholder="Страна"
                  value={formData.country}
                  onChange={handleChange}
                  className="custom-form-control"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  name="city"
                  placeholder="Город"
                  value={formData.city}
                  onChange={handleChange}
                  className="custom-form-control"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Control
              type="password"
              name="password1"
              placeholder="*Пароль (минимум 8 символов)"
              value={formData.password1}
              onChange={handleChange}
              className="custom-form-control"
              required
              minLength={8}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Control
              type="password"
              name="password2"
              placeholder="*Подтверждение пароля (минимум 8 символов)"
              value={formData.password2}
              onChange={handleChange}
              className="custom-form-control"
              required
            />
          </Form.Group>

          <Button
            type="submit"
            className="btn-custom-primary custom-form-btn"
            disabled={loading}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </Button>
        </Form>

        <div className="text-center mt-4">
          <p>
            Уже есть аккаунт? <Link to="/login" className="custom-form-link">Войти</Link>
          </p>
        </div>
      </div>
    </Container>
  );
};

export default RegisterPage;
