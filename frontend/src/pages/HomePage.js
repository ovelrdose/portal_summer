import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { newsAPI, galleryAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const [news, setNews] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [newsRes, albumsRes] = await Promise.all([
        newsAPI.getLatest(),
        galleryAPI.getLatest(),
      ]);
      // Фильтруем только опубликованные новости для главной страницы
      const publishedNews = (newsRes.data || []).filter(item => item.is_published);
      setNews(publishedNews);
      setAlbums(albumsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <Container>
        <div className="custom-hero">
          {/* Left Block - User Greeting */}
          <div className="custom-hero-left">
            <div className="custom-hero-greeting">
              <div className="custom-hero-avatar">
                <i className="bi bi-person-circle"></i>
              </div>
              <h2>
                {isAuthenticated
                  ? `Добро пожаловать, ${user?.first_name || 'Пользователь'}!`
                  : 'Добро пожаловать!'}
              </h2>
            </div>
            <div className="custom-hero-image">
              <img src="/images/hero/teacher.png" alt="Преподаватель" />
            </div>
          </div>

          {/* Right Block - Portal Info */}
          <div className="custom-hero-right">
            <div className="custom-hero-content">
              <h1 className="custom-hero-title">Добро пожаловать на портал курсов</h1>
              <p className="custom-hero-text">
                Изучайте новое с авторскими курсами от лучших преподавателей
              </p>
              {isAuthenticated ? (
                <Button className="btn-custom-primary" size="lg" as={Link} to="/portal">
                  Перейти к курсам
                </Button>
              ) : (
                <div>
                  <Button className="btn-custom-primary me-3" size="lg" as={Link} to="/register">
                    Зарегистрироваться
                  </Button>
                  <Button className="navbar-btn-outline" size="lg" as={Link} to="/login">
                    Войти
                  </Button>
                </div>
              )}
            </div>
            <div className="custom-hero-illustration">
              <img src="/images/hero/education-illustration.png" alt="Обучение" />
            </div>
          </div>
        </div>
      </Container>

      {/* News Section */}
      <section className="py-5">
        <Container>
          <div className="custom-section-header">
            <h2 className="custom-section-title">Последние новости</h2>
            <Link to="/news" className="btn-custom-cyan">
              Все новости
            </Link>
          </div>
          <Row className="g-4">
            {news.length > 0 ? (
              news.map((item) => (
                <Col md={12} key={item.id}>
                  <Card className="custom-card custom-card-horizontal">
                    <div className="card-content">
                      <div>
                        <h3 className="custom-card-title">{item.title}</h3>
                        <p className="custom-card-text">{item.short_description}</p>
                      </div>
                      <div>
                        <Button
                          className="btn-custom-primary"
                          as={Link}
                          to={`/news/${item.id}`}
                        >
                          Читать далее
                        </Button>
                      </div>
                    </div>
                    {item.image && (
                      <div className="card-image">
                        <img
                          src={item.image}
                          alt={item.title}
                        />
                      </div>
                    )}
                  </Card>
                </Col>
              ))
            ) : (
              <Col>
                <p className="text-muted">Новостей пока нет</p>
              </Col>
            )}
          </Row>
        </Container>
      </section>

      {/* Gallery Section */}
      <section className="py-5">
        <Container>
          <div className="custom-section-header">
            <h2 className="custom-section-title">Фотогалерея</h2>
            <Link to="/gallery" className="btn-custom-cyan">
              Вся галерея
            </Link>
          </div>
          <Row className="g-4">
            {albums.length > 0 ? (
              albums.slice(0, 3).map((album) => (
                <Col md={12} key={album.id}>
                  <Card className="custom-card custom-card-horizontal">
                    <div className="card-content">
                      <div>
                        <h3 className="custom-card-title">{album.title}</h3>
                        <p className="custom-card-text">
                          <small className="text-muted">{album.photos_count} фото</small>
                        </p>
                      </div>
                      <div>
                        <Button
                          className="btn-custom-primary"
                          as={Link}
                          to={`/gallery/${album.id}`}
                        >
                          Смотреть
                        </Button>
                      </div>
                    </div>
                    <div className="card-image">
                      <img
                        src={album.cover_url}
                        alt={album.title}
                      />
                    </div>
                  </Card>
                </Col>
              ))
            ) : (
              <Col>
                <p className="text-muted">Альбомов пока нет</p>
              </Col>
            )}
          </Row>
        </Container>
      </section>
    </>
  );
};

export default HomePage;
