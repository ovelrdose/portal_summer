import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Form, Badge } from 'react-bootstrap';
import { newsAPI } from '../services/api';

const NewsPage = () => {
  const [news, setNews] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTags();
    loadNews();
  }, []);

  useEffect(() => {
    loadNews();
  }, [selectedTag, searchQuery]);

  const loadTags = async () => {
    try {
      const response = await newsAPI.getTags();
      setTags(response.data);
    } catch (error) {
      console.error('Error loading tags:', error);
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
      <h1 className="mb-4">Новости</h1>

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
            {tags.map((tag) => (
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
                    <Card.Title>{item.title}</Card.Title>
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
                    <small className="text-muted">
                      {new Date(item.published_at).toLocaleDateString('ru-RU')}
                    </small>
                    <Button
                      variant="primary"
                      size="sm"
                      className="float-end"
                      as={Link}
                      to={`/news/${item.id}`}
                    >
                      Читать
                    </Button>
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
