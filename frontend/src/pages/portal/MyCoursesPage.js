import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Form, Spinner, Badge } from 'react-bootstrap';
import { coursesAPI } from '../../services/api';

const MyCoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const response = await coursesAPI.getMyCourses();
      const data = response.data.results || response.data;
      // getMyCourses returns subscription objects: [{ course: {...} }]
      setCourses(data.map((item) => item.course));
    } catch (error) {
      console.error('Error loading my courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (course.short_description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container className="py-5">
      <h1 className="custom-section-title mb-4">Мои курсы</h1>

      <Row className="mb-4">
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Поиск по курсам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="d-flex flex-column gap-3">
          {filteredCourses.map((course) => (
            <div key={course.id} className="custom-card custom-card-horizontal">
              <div className="card-content">
                <div>
                  <h3 className="custom-card-title">{course.title}</h3>
                  <p className="custom-card-text">{course.short_description}</p>
                  <div className="d-flex align-items-center gap-3">
                    <Badge className="custom-badge">
                      Автор: {course.creator?.full_name}
                    </Badge>
                    <small className="text-muted">{course.subscribers_count} подписчиков</small>
                  </div>
                </div>
                <div className="mt-3">
                  <Link to={`/portal/courses/${course.id}`} className="course-goto-link">
                    Перейти к курсу
                    <span className="goto-arrow"></span>
                  </Link>
                </div>
              </div>
              <div className="card-image">
                <img src={course.image_url} alt={course.title} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted py-5">
          {searchQuery ? (
            <p>Ничего не найдено по запросу «{searchQuery}»</p>
          ) : (
            <>
              <p className="mb-3">Вы пока не подписаны ни на один курс</p>
              <Link to="/portal/courses" className="btn btn-custom-primary btn-sm-custom rounded-pill">
                Посмотреть все курсы
              </Link>
            </>
          )}
        </div>
      )}
    </Container>
  );
};

export default MyCoursesPage;
