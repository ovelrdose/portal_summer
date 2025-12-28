import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import api from '../../services/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/password/reset/', { email });
      setSuccess(true);
    } catch (err) {
      // В целях безопасности всегда показываем успех
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

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
                <h2 className="mb-3">Письмо отправлено</h2>
                <p className="text-muted mb-4">
                  Если учетная запись с email <strong>{email}</strong> существует,
                  на этот адрес будет отправлено письмо с инструкциями по восстановлению пароля.
                </p>
                <p className="text-muted small mb-4">
                  Проверьте папку "Спам", если письмо не появится в течение нескольких минут.
                </p>
                <Button variant="primary" as={Link} to="/login">
                  Вернуться на страницу входа
                </Button>
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
              <h2 className="text-center mb-4">Восстановление пароля</h2>
              <p className="text-muted text-center mb-4">
                Введите ваш email, и мы отправим инструкции по восстановлению пароля
              </p>

              {error && (
                <Alert variant="danger">{error}</Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                  />
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? 'Отправка...' : 'Отправить инструкции'}
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

export default ForgotPasswordPage;
