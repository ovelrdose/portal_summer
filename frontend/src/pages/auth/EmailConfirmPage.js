import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Container, Row, Col, Alert, Button, Spinner } from 'react-bootstrap';
import api from '../../services/api';

const EmailConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const key = searchParams.get('key');

      // Если ключа нет, считаем что подтверждение уже выполнено backend'ом
      if (!key) {
        setStatus('success');
        setMessage('Ваш email успешно подтвержден! Теперь вы можете войти в систему.');
        return;
      }

      try {
        // Отправляем ключ на backend для подтверждения
        await api.post('/auth/registration/verify-email/', { key });
        setStatus('success');
        setMessage('Ваш email успешно подтвержден! Теперь вы можете войти в систему.');
      } catch (error) {
        setStatus('error');
        const errorMsg = error.response?.data?.detail ||
                        error.response?.data?.key?.[0] ||
                        'Ошибка подтверждения email. Возможно, ссылка устарела или недействительна.';
        setMessage(errorMsg);
      }
    };

    verifyEmail();
  }, [searchParams]);

  if (status === 'verifying') {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6} className="text-center">
            <Spinner animation="border" role="status" className="mb-3">
              <span className="visually-hidden">Загрузка...</span>
            </Spinner>
            <p>Подтверждение email...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Alert variant={status === 'success' ? 'success' : 'danger'}>
            <Alert.Heading>
              {status === 'success' ? 'Email подтвержден!' : 'Ошибка подтверждения'}
            </Alert.Heading>
            <p>{message}</p>
            <hr />
            {status === 'success' ? (
              <Button variant="primary" as={Link} to="/login">
                Войти в систему
              </Button>
            ) : (
              <>
                <Button variant="primary" as={Link} to="/register" className="me-2">
                  Повторить регистрацию
                </Button>
                <Button variant="outline-secondary" as={Link} to="/">
                  На главную
                </Button>
              </>
            )}
          </Alert>
        </Col>
      </Row>
    </Container>
  );
};

export default EmailConfirmPage;
