import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Spinner, Button, Modal } from 'react-bootstrap';
import { galleryAPI } from '../services/api';

const AlbumDetailPage = () => {
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    loadAlbum();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadAlbum = async () => {
    try {
      const response = await galleryAPI.getAlbum(id);
      setAlbum(response.data);
    } catch (error) {
      console.error('Error loading album:', error);
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

  if (!album) {
    return (
      <Container className="py-5 text-center">
        <h2>Альбом не найден</h2>
        <Button as={Link} to="/gallery" variant="primary">
          К галерее
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Button as={Link} to="/gallery" variant="outline-secondary" className="mb-4">
        Назад к галерее
      </Button>

      <h1 className="mb-2">{album.title}</h1>
      {album.description && <p className="text-muted mb-4">{album.description}</p>}

      <Row>
        {album.photos?.length > 0 ? (
          album.photos.map((photo) => (
            <Col xs={6} md={4} lg={3} key={photo.id} className="mb-4">
              <img
                src={photo.image}
                alt={photo.title || 'Фото'}
                className="img-fluid rounded cursor-pointer"
                style={{ height: '200px', width: '100%', objectFit: 'cover' }}
                onClick={() => setSelectedPhoto(photo)}
              />
            </Col>
          ))
        ) : (
          <Col>
            <p className="text-muted">В альбоме пока нет фотографий</p>
          </Col>
        )}
      </Row>

      {/* Photo Modal */}
      <Modal
        show={!!selectedPhoto}
        onHide={() => setSelectedPhoto(null)}
        size="xl"
        centered
      >
        <Modal.Body className="p-0">
          {selectedPhoto && (
            <img
              src={selectedPhoto.image}
              alt={selectedPhoto.title || 'Фото'}
              className="img-fluid w-100"
            />
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default AlbumDetailPage;
