import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Form, Badge } from 'react-bootstrap';
import { coursesAPI } from '../../services/api';

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCourses();
  }, [searchQuery]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      const response = await coursesAPI.getCourses(params);
      setCourses(response.data.results || response.data);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (courseId) => {
    try {
      await coursesAPI.subscribe(courseId);
      loadCourses();
    } catch (error) {
      console.error('Error subscribing:', error);
    }
  };

  const handleUnsubscribe = async (courseId) => {
    try {
      await coursesAPI.unsubscribe(courseId);
      loadCourses();
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  };

  return (
    <Container className="py-5">
      <h1 className="mb-4">Все курсы</h1>

      {/* Search */}
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
      ) : (
        <Row>
          {courses.length > 0 ? (
            courses.map((course) => (
              <Col md={4} key={course.id} className="mb-4">
                <Card className="h-100 course-card">
                  <Card.Img
                    variant="top"
                    src={course.image_url}
                    alt={course.title}
                  />
                  <Card.Body>
                    <Card.Title>{course.title}</Card.Title>
                    <Card.Text>{course.short_description}</Card.Text>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        {course.creator?.full_name}
                      </small>
                      <Badge bg="secondary">
                        {course.subscribers_count} подписчиков
                      </Badge>
                    </div>
                  </Card.Body>
                  <Card.Footer className="bg-white border-0 d-flex gap-2">
                    <Button
                      variant="primary"
                      as={Link}
                      to={`/portal/courses/${course.id}`}
                    >
                      Подробнее
                    </Button>
                    {course.is_subscribed ? (
                      <Button
                        variant="outline-danger"
                        onClick={() => handleUnsubscribe(course.id)}
                      >
                        Отписаться
                      </Button>
                    ) : (
                      <Button
                        variant="success"
                        onClick={() => handleSubscribe(course.id)}
                      >
                        Записаться
                      </Button>
                    )}
                  </Card.Footer>
                </Card>
              </Col>
            ))
          ) : (
            <Col>
              <p className="text-center text-muted">Курсы не найдены</p>
            </Col>
          )}
        </Row>
      )}
    </Container>
  );
};

export default CoursesPage;
