import React, { useState, useEffect } from 'react';
import { Card, Table, Spinner, Badge } from 'react-bootstrap';
import { coursesAPI } from '../services/api';
import { formatDateTimeDisplay } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';

const CourseSchedule = ({ courseId }) => {
  const { user } = useAuth();
  const isTeacher = user && (user.is_teacher || user.is_admin);
  const [unlocks, setUnlocks] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const loadSchedule = async () => {
    try {
      // Запрашиваем расписание с ДЗ для всех подписчиков
      const includeHomework = true;
      const response = await coursesAPI.getCourseSchedule(courseId, includeHomework);
      const items = response.data || [];

      // Разделяем на две категории
      const unlockItems = items.filter(item =>
        item.item_type === 'section' || item.item_type === 'element'
      );
      const homeworkItems = items.filter(item => item.item_type === 'homework');

      setUnlocks(unlockItems);
      setHomeworks(homeworkItems);
    } catch (err) {
      console.error('Error loading schedule:', err);
      setUnlocks([]);
      setHomeworks([]);
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

  const hasUnlocks = unlocks.length > 0;
  const hasHomeworks = homeworks.length > 0;

  if (!hasUnlocks && !hasHomeworks) {
    return null;
  }

  return (
    <>
      {/* Таблица 1: Запланированные открытия */}
      {hasUnlocks && (
        <Card className="mb-4">
          <Card.Header>
            <i className="bi bi-calendar-event me-2"></i>
            Запланированные открытия материалов
            {isTeacher && <small className="text-muted ms-2">(для информации)</small>}
          </Card.Header>
          <Card.Body>
            <Table responsive striped hover size="sm">
              <thead>
                <tr>
                  <th>Раздел</th>
                  <th>Элемент</th>
                  <th>Дата открытия</th>
                </tr>
              </thead>
              <tbody>
                {unlocks.map((item, index) => (
                  <tr key={index}>
                    <td>{item.section_title}</td>
                    <td>{item.element_title || item.element_type || '—'}</td>
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
      )}

      {/* Таблица 2: Домашние задания с дедлайнами */}
      {hasHomeworks && (
        <Card className="mb-4">
          <Card.Header>
            <i className="bi bi-clipboard-check me-2"></i>
            Домашние задания
            {isTeacher && <small className="text-muted ms-2">(как студент)</small>}
          </Card.Header>
          <Card.Body>
            <Table responsive hover size="sm">
              <thead>
                <tr>
                  <th>Раздел</th>
                  <th>Задание</th>
                  <th>Дедлайн</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {homeworks.map((item, index) => {
                  const isOverdue = item.is_overdue;
                  return (
                    <tr key={index} className={isOverdue ? 'table-danger' : ''}>
                      <td>{item.section_title}</td>
                      <td>{item.element_title}</td>
                      <td>
                        <i className={`bi ${isOverdue ? 'bi-exclamation-triangle-fill' : 'bi-clock'} me-1`}></i>
                        {formatDateTimeDisplay(item.deadline)}
                        {isOverdue && (
                          <Badge bg="danger" className="ms-2">Просрочено</Badge>
                        )}
                      </td>
                      <td>
                        {item.submission_status === 'revision_requested' ? (
                          <Badge bg="warning">Требует доработки</Badge>
                        ) : (
                          <Badge bg="secondary">Не сдано</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </>
  );
};

export default CourseSchedule;
