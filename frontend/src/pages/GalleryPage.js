import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Spinner, Button, Badge, Nav } from 'react-bootstrap';
import { galleryAPI, DEFAULT_COVER_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const GalleryPage = () => {
  const { isAdmin } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('published'); // 'published' или 'drafts'
  const [draftsCount, setDraftsCount] = useState(0);
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    loadAlbums();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadAlbums = async () => {
    setLoading(true);
    try {
      const response = await galleryAPI.getAlbums();
      const allAlbums = response.data.results || response.data;

      // Подсчитываем черновики для вкладки
      if (isAdmin) {
        const drafts = allAlbums.filter(item => !item.is_published);
        setDraftsCount(drafts.length);
      }

      // Фильтруем альбомы в зависимости от выбранной вкладки
      let filteredAlbums = allAlbums;
      if (isAdmin) {
        // Для админа показываем в зависимости от активной вкладки
        filteredAlbums = allAlbums.filter(item =>
          activeTab === 'published' ? item.is_published : !item.is_published
        );
      } else {
        // Для обычных пользователей показываем только опубликованные
        filteredAlbums = allAlbums.filter(item => item.is_published);
      }

      setAlbums(filteredAlbums);
    } catch (error) {
      console.error('Error loading albums:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <div className="custom-section-header mb-4">
        <h1 className="custom-section-title mb-0">Фотогалерея</h1>
        {isAdmin && (
          <Button className="btn-custom-cyan" as={Link} to="/admin/albums/new">
            + Добавить альбом
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

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <Row className="g-4">
          {albums.length > 0 ? (
            albums.map((album) => (
              <Col md={12} key={album.id}>
                <Card className="custom-card custom-card-horizontal">
                  <div className="card-content">
                    <div>
                      <h3 className="custom-card-title">
                        {album.title}
                        {isAdmin && !album.is_published && (
                          <Badge bg="warning" className="ms-2">Черновик</Badge>
                        )}
                      </h3>
                      {album.description && (
                        <p className="custom-card-text">
                          {album.description.length > 150
                            ? `${album.description.substring(0, 150)}...`
                            : album.description}
                        </p>
                      )}
                      <p className="custom-card-text">
                        <small className="text-muted">{album.photos_count} фото</small>
                      </p>
                    </div>
                    <div className="d-flex gap-2">
                      <Button
                        className="btn-custom-primary btn-sm-custom"
                        as={Link}
                        to={`/gallery/${album.id}`}
                      >
                        Смотреть
                      </Button>
                      {isAdmin && (
                        <Button
                          className="btn-custom-primary btn-sm-custom"
                          as={Link}
                          to={`/admin/albums/${album.id}/edit`}
                        >
                          ✏ Изменить
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="card-image">
                    <img
                      src={album.cover_url || DEFAULT_COVER_URL}
                      alt={album.title}
                      onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_COVER_URL; }}
                    />
                  </div>
                </Card>
              </Col>
            ))
          ) : (
            <Col>
              <p className="text-center text-muted">
                {activeTab === 'drafts' ? 'Черновиков пока нет' : 'Альбомов пока нет'}
              </p>
            </Col>
          )}
        </Row>
      )}
    </Container>
  );
};

export default GalleryPage;
