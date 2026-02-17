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
  const [availableTags, setAvailableTags] = useState([]); // Все доступные теги
  const [isSearchFocused, setIsSearchFocused] = useState(false); // Фокус на поле поиска
  const [showTags, setShowTags] = useState(false); // Контроль видимости тегов для анимации

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, activeTab]);

  // Управление плавным появлением/скрытием тегов
  useEffect(() => {
    if (isSearchFocused || searchQuery) {
      setShowTags(true);
    } else {
      // Задержка для проигрывания анимации скрытия
      const timer = setTimeout(() => setShowTags(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isSearchFocused, searchQuery]);

  const loadNews = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      const response = await newsAPI.getNews(params);
      const allNews = response.data.results || response.data;

      // Собираем ВСЕ уникальные теги из всех новостей (до фильтрации)
      const tagsMap = new Map();
      allNews.forEach(item => {
        if (item.tags && item.tags.length > 0) {
          item.tags.forEach(tag => {
            if (!tagsMap.has(tag.id)) {
              tagsMap.set(tag.id, tag);
            }
          });
        }
      });
      setAvailableTags(Array.from(tagsMap.values()));

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
      <div className="custom-section-header mb-4">
        <h1 className="custom-section-title mb-0">Новости</h1>
        {isAdmin && (
          <Button className="btn-custom-cyan" as={Link} to="/admin/news/new">
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
      <div className="news-search-container mb-4">
        <Form.Control
          type="text"
          placeholder="Поиск по новостям и тегам..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          className="custom-form-control mb-2"
        />
        {showTags && availableTags.length > 0 && (
          <div className={`news-tags-filter ${!(isSearchFocused || searchQuery) ? 'hiding' : ''}`}>
            <small className="text-muted d-block mb-2">
              {searchQuery ? 'Теги в результатах поиска:' : 'Доступные теги:'}
            </small>
            <div className="d-flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag.id}
                  className="custom-badge"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSearchQuery(tag.name)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <Row className="g-4">
          {news.length > 0 ? (
            news.map((item) => (
              <Col md={12} key={item.id}>
                <Card className="custom-card custom-card-horizontal">
                  <div className="card-content">
                    <div>
                      <h3 className="custom-card-title">
                        {item.title}
                        {isAdmin && !item.is_published && (
                          <Badge bg="warning" className="ms-2">Черновик</Badge>
                        )}
                      </h3>
                      <p className="custom-card-text">{item.short_description}</p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="mb-2">
                          {item.tags.map((tag) => (
                            <Badge key={tag.id} className="custom-badge me-1">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <small className="text-muted">
                        {new Date(item.published_at).toLocaleDateString('ru-RU')}
                      </small>
                    </div>
                    <div className="d-flex gap-2">
                      <Button
                        className="btn-custom-primary btn-sm-custom"
                        as={Link}
                        to={`/news/${item.id}`}
                      >
                        Читать
                      </Button>
                      {isAdmin && (
                        <Button
                          className="btn-custom-primary btn-sm-custom"
                          as={Link}
                          to={`/admin/news/${item.id}/edit`}
                        >
                          ✏ Изменить
                        </Button>
                      )}
                    </div>
                  </div>
                  {item.image && (
                    <div className="card-image">
                      <img src={item.image} alt={item.title} />
                    </div>
                  )}
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
