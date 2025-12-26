import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Spinner, Button, Badge, Nav } from 'react-bootstrap';
import { galleryAPI } from '../services/api';
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

      // Временное логирование для отладки
      console.log('Albums data:', allAlbums);
      if (allAlbums.length > 0) {
        console.log('First album cover_url:', allAlbums[0].cover_url);
      }

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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Фотогалерея</h1>
        {isAdmin && (
          <Button variant="success" as={Link} to="/admin/albums/new">
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
        <Row>
          {albums.length > 0 ? (
            albums.map((album) => (
              <Col md={4} lg={3} key={album.id} className="mb-4">
                <Card className="h-100">
                  {album.cover_url && !imageErrors[album.id] ? (
                    <Card.Img
                      variant="top"
                      src={album.cover_url}
                      alt={album.title}
                      style={{ height: '200px', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => window.location.href = `/gallery/${album.id}`}
                      onError={() => setImageErrors(prev => ({ ...prev, [album.id]: true }))}
                    />
                  ) : (
                    <div
                      style={{
                        height: '200px',
                        backgroundColor: '#e9ecef',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#6c757d',
                        fontSize: '4rem'
                      }}
                      onClick={() => window.location.href = `/gallery/${album.id}`}
                    >
                      <div className="text-center">
                        <div>🖼️</div>
                        <p className="mb-0 mt-2" style={{ fontSize: '0.875rem' }}>Нет обложки</p>
                      </div>
                    </div>
                  )}
                  <Card.Body>
                    <Card.Title>
                      {album.title}
                      {isAdmin && !album.is_published && (
                        <Badge bg="warning" className="ms-2">Черновик</Badge>
                      )}
                    </Card.Title>
                    {album.description && (
                      <Card.Text className="text-muted small">
                        {album.description.length > 100
                          ? `${album.description.substring(0, 100)}...`
                          : album.description}
                      </Card.Text>
                    )}
                    <small className="text-muted">{album.photos_count} фото</small>
                  </Card.Body>
                  <Card.Footer className="bg-white border-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <Button
                        variant="primary"
                        size="sm"
                        as={Link}
                        to={`/gallery/${album.id}`}
                      >
                        Смотреть
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          as={Link}
                          to={`/admin/albums/${album.id}/edit`}
                        >
                          ✏
                        </Button>
                      )}
                    </div>
                  </Card.Footer>
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
