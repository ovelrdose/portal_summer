import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { newsAPI, galleryAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const { isAuthenticated } = useAuth();
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
      setNews(newsRes.data);
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
      <section className="hero-section text-center">
        <Container>
          <h1 className="display-4 mb-4">Добро пожаловать на портал курсов</h1>
          <p className="lead mb-4">
            Изучайте новое с авторскими курсами от лучших преподавателей
          </p>
          {isAuthenticated ? (
            <Button variant="light" size="lg" as={Link} to="/portal">
              Перейти к курсам
            </Button>
          ) : (
            <div>
              <Button variant="light" size="lg" className="me-3" as={Link} to="/register">
                Зарегистрироваться
              </Button>
              <Button variant="outline-light" size="lg" as={Link} to="/login">
                Войти
              </Button>
            </div>
          )}
        </Container>
      </section>

      {/* News Section */}
      <section className="py-5">
        <Container>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Последние новости</h2>
            <Link to="/news" className="btn btn-outline-primary">
              Все новости
            </Link>
          </div>
          <Row>
            {news.length > 0 ? (
              news.map((item) => (
                <Col md={4} key={item.id} className="mb-4">
                  <Card className="h-100 news-card">
                    <Card.Img
                      variant="top"
                      src={item.image_url}
                      alt={item.title}
                    />
                    <Card.Body>
                      <Card.Title>{item.title}</Card.Title>
                      <Card.Text>{item.short_description}</Card.Text>
                    </Card.Body>
                    <Card.Footer className="bg-white border-0">
                      <Button
                        variant="primary"
                        as={Link}
                        to={`/news/${item.id}`}
                      >
                        Читать далее
                      </Button>
                    </Card.Footer>
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
      <section className="py-5 bg-light">
        <Container>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Фотогалерея</h2>
            <Link to="/gallery" className="btn btn-outline-primary">
              Вся галерея
            </Link>
          </div>
          <Row>
            {albums.length > 0 ? (
              albums.slice(0, 4).map((album) => (
                <Col md={3} key={album.id} className="mb-4">
                  <Card className="h-100 album-card">
                    <Card.Img
                      variant="top"
                      src={album.cover_url}
                      alt={album.title}
                    />
                    <Card.Body>
                      <Card.Title>{album.title}</Card.Title>
                      <small className="text-muted">
                        {album.photos_count} фото
                      </small>
                    </Card.Body>
                    <Card.Footer className="bg-white border-0">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        as={Link}
                        to={`/gallery/${album.id}`}
                      >
                        Открыть
                      </Button>
                    </Card.Footer>
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
