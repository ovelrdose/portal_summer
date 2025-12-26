import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Form, Badge, Nav } from 'react-bootstrap';
import { newsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const NewsPage = () => {
  const { isAdmin } = useAuth();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('published'); // 'published' или 'drafts'

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, activeTab]);

  const loadNews = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      const response = await newsAPI.getNews(params);
      const allNews = response.data.results || response.data;

      // Подсчитываем черновики для вкладки
      if (isAdmin) {
        const drafts = allNews.filter(item => !item.is_published);
        setDraftsCount(drafts.length);
      }

      // Фильтруем новости в зависимости от выбранной вкладки
      let filteredNews = allNews;
      if (isAdmin) {
        // Для админа показываем в зависимости от активной вкладки
        filteredNews = allNews.filter(item =>
          activeTab === 'published' ? item.is_published : !item.is_published
        );
      } else {
        // Для обычных пользователей показываем только опубликованные
        filteredNews = allNews.filter(item => item.is_published);
      }

      setNews(filteredNews);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  // Подсчитываем количество черновиков для отображения вкладки
  const [draftsCount, setDraftsCount] = useState(0);

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

      {/* Tabs for Admin */}
      {isAdmin && (
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link
              active={activeTab === 'published'}
              onClick={() => setActiveTab('published')}
              style={{ cursor: 'pointer' }}
            >
              Опубликованные
            </Nav.Link>
          </Nav.Item>
          {draftsCount > 0 && (
            <Nav.Item>
              <Nav.Link
                active={activeTab === 'drafts'}
                onClick={() => setActiveTab('drafts')}
                style={{ cursor: 'pointer' }}
              >
                Черновики ({draftsCount})
              </Nav.Link>
            </Nav.Item>
          )}
        </Nav>
      )}

      {/* Search */}
      <Row className="mb-4">
        <Col md={12}>
          <Form.Control
            type="text"
            placeholder="Поиск по новостям и тегам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Form.Text className="text-muted">
            Введите название новости или тег для поиска
          </Form.Text>
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
                  {item.image && (
                    <Card.Img
                      variant="top"
                      src={item.image}
                      alt={item.title}
                      style={{ height: '200px', objectFit: 'cover' }}
                    />
                  )}
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
