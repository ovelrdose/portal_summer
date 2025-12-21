import React, { useState, useEffect } from 'react';
import { Card, Table, Spinner, Alert } from 'react-bootstrap';
import { coursesAPI } from '../services/api';
import { formatDateTimeDisplay } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';

const CourseSchedule = ({ courseId }) => {
  const { user } = useAuth();
  const isTeacher = user && (user.is_teacher || user.is_admin);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const loadSchedule = async () => {
    try {
      const response = await coursesAPI.getCourseSchedule(courseId);
      setSchedule(response.data || []);
      setError('');
    } catch (err) {
      console.error('Error loading schedule:', err);
      // Если ошибка - просто показываем пустое расписание
      setSchedule([]);
      setError('');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-4">
        <Card.Body className="text-center">
          <Spinner animation="border" size="sm" />
        </Card.Body>
      </Card>
    );
  }

  if (schedule.length === 0) {
    // Не показываем ничего, если расписание пусто
    return null;
  }

  return (
    <Card className="mb-4">
      <Card.Header>
        <i className="bi bi-calendar-event me-2"></i>
        Расписание открытия материалов
        {isTeacher && <small className="text-muted ms-2">(для информации)</small>}
      </Card.Header>
      <Card.Body>
        <Table responsive striped hover size="sm">
          <thead>
            <tr>
              <th>Раздел</th>
              <th>Элемент</th>
              <th>Дата и время открытия</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((item, index) => (
              <tr key={index}>
                <td>{item.section_title}</td>
                <td>{item.element_title || item.element_type}</td>
                <td>
                  <i className="bi bi-clock me-1"></i>
                  {formatDateTimeDisplay(item.unlock_datetime)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};

export default CourseSchedule;
