import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Form, Badge } from 'react-bootstrap';
import { newsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const NewsPage = () => {
  const { isAdmin } = useAuth();
  const [news, setNews] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTags();
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTag, searchQuery]);

  const loadTags = async () => {
    try {
      const response = await newsAPI.getTags();
      setTags(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading tags:', error);
      setTags([]);
    }
  };

  const loadNews = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedTag) params.tags = selectedTag;
      if (searchQuery) params.search = searchQuery;
      const response = await newsAPI.getNews(params);
      setNews(response.data.results || response.data);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Новости</h1>
        {isAdmin && (
          <Button variant="success" as={Link} to="/admin/news/new">
            + Добавить новость
          </Button>
        )}
      </div>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Поиск по новостям..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Col>
        <Col md={6}>
          <div className="d-flex flex-wrap gap-2">
            <Badge
              bg={selectedTag === '' ? 'primary' : 'secondary'}
              className="cursor-pointer p-2"
              onClick={() => setSelectedTag('')}
            >
              Все
            </Badge>
            {Array.isArray(tags) && tags.map((tag) => (
              <Badge
                key={tag.id}
                bg={selectedTag === tag.id ? 'primary' : 'secondary'}
                className="cursor-pointer p-2"
                onClick={() => setSelectedTag(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <Row>
          {news.length > 0 ? (
            news.map((item) => (
              <Col md={4} key={item.id} className="mb-4">
                <Card className="h-100 news-card">
                  <Card.Img variant="top" src={item.image_url} alt={item.title} />
                  <Card.Body>
                    <Card.Title>
                      {item.title}
                      {isAdmin && !item.is_published && (
                        <Badge bg="warning" className="ms-2">Черновик</Badge>
                      )}
                    </Card.Title>
                    <Card.Text>{item.short_description}</Card.Text>
                    {item.tags && (
                      <div className="mb-2">
                        {item.tags.map((tag) => (
                          <Badge key={tag.id} bg="info" className="me-1">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card.Body>
                  <Card.Footer className="bg-white border-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        {new Date(item.published_at).toLocaleDateString('ru-RU')}
                      </small>
                      <div>
                        <Button
                          variant="primary"
                          size="sm"
                          as={Link}
                          to={`/news/${item.id}`}
                        >
                          Читать
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            as={Link}
                            to={`/admin/news/${item.id}/edit`}
                            className="ms-2"
                          >
                            ✏
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card.Footer>
                </Card>
              </Col>
            ))
          ) : (
            <Col>
              <p className="text-center text-muted">Новости не найдены</p>
            </Col>
          )}
        </Row>
      )}
    </Container>
  );
};

export default NewsPage;
