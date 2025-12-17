import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import { galleryAPI } from '../services/api';

const GalleryPage = () => {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      const response = await galleryAPI.getAlbums();
      setAlbums(response.data.results || response.data);
    } catch (error) {
      console.error('Error loading albums:', error);
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
    <Container className="py-5">
      <h1 className="mb-4">Фотогалерея</h1>

      <Row>
        {albums.length > 0 ? (
          albums.map((album) => (
            <Col md={4} lg={3} key={album.id} className="mb-4">
              <Card as={Link} to={`/gallery/${album.id}`} className="h-100 album-card text-decoration-none text-dark">
                <Card.Img
                  variant="top"
                  src={album.cover_url}
                  alt={album.title}
                  style={{ height: '200px', objectFit: 'cover' }}
                />
                <Card.Body>
                  <Card.Title>{album.title}</Card.Title>
                  <small className="text-muted">{album.photos_count} фото</small>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col>
            <p className="text-center text-muted">Альбомов пока нет</p>
          </Col>
        )}
      </Row>
    </Container>
  );
};

export default GalleryPage;
