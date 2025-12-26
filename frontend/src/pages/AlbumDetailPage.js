import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Spinner, Button, Modal, Card, Alert, Badge, Form } from 'react-bootstrap';
import { galleryAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AlbumDetailPage = () => {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // States for photo upload
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // State for photo deletion
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);

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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setUploadError('');
  };

  const handleUploadPhotos = async () => {
    if (selectedFiles.length === 0) {
      setUploadError('Выберите файлы для загрузки');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const formData = new FormData();
      formData.append('album', id);

      selectedFiles.forEach((file) => {
        formData.append('images', file);
      });

      await galleryAPI.uploadPhotos(id, formData);
      setUploadSuccess(`Успешно загружено ${selectedFiles.length} фото`);
      setSelectedFiles([]);
      // Сбросить input
      const fileInput = document.getElementById('photoUploadInput');
      if (fileInput) fileInput.value = '';

      // Перезагрузить альбом
      loadAlbum();
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.response?.data?.error || 'Ошибка загрузки фотографий');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Удалить эту фотографию?')) return;

    setDeletingPhotoId(photoId);
    try {
      await galleryAPI.deletePhoto(photoId);
      setUploadSuccess('Фотография удалена');
      loadAlbum();
    } catch (error) {
      console.error('Delete error:', error);
      setUploadError('Ошибка удаления фотографии');
    } finally {
      setDeletingPhotoId(null);
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

      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h1 className="mb-2">
            {album.title}
            {isAdmin && !album.is_published && (
              <Badge bg="warning" className="ms-2">Черновик</Badge>
            )}
          </h1>
          {album.description && <p className="text-muted">{album.description}</p>}
        </div>
        {isAdmin && (
          <Button
            variant="outline-primary"
            as={Link}
            to={`/admin/albums/${id}/edit`}
          >
            ✏ Редактировать альбом
          </Button>
        )}
      </div>

      {/* Photo upload section for admin */}
      {isAdmin && (
        <Card className="mb-4">
          <Card.Header>Добавить фотографии</Card.Header>
          <Card.Body>
            {uploadError && (
              <Alert variant="danger" dismissible onClose={() => setUploadError('')}>
                {uploadError}
              </Alert>
            )}
            {uploadSuccess && (
              <Alert variant="success" dismissible onClose={() => setUploadSuccess('')}>
                {uploadSuccess}
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Выберите фотографии для загрузки</Form.Label>
              <Form.Control
                id="photoUploadInput"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
              />
              {selectedFiles.length > 0 && (
                <Form.Text className="text-muted">
                  Выбрано файлов: {selectedFiles.length}
                </Form.Text>
              )}
            </Form.Group>

            <Button
              variant="success"
              onClick={handleUploadPhotos}
              disabled={uploading || selectedFiles.length === 0}
            >
              {uploading ? 'Загрузка...' : 'Загрузить фотографии'}
            </Button>
          </Card.Body>
        </Card>
      )}

      <h3 className="mb-3">
        Фотографии ({album.photos?.length || 0})
      </h3>

      <Row>
        {album.photos?.length > 0 ? (
          album.photos.map((photo) => (
            <Col xs={6} md={4} lg={3} key={photo.id} className="mb-4">
              <Card>
                <Card.Img
                  variant="top"
                  src={photo.image}
                  alt={photo.title || 'Фото'}
                  style={{ height: '200px', objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => setSelectedPhoto(photo)}
                />
                {isAdmin && (
                  <Card.Body className="p-2">
                    <Button
                      variant="danger"
                      size="sm"
                      className="w-100"
                      onClick={() => handleDeletePhoto(photo.id)}
                      disabled={deletingPhotoId === photo.id}
                    >
                      {deletingPhotoId === photo.id ? 'Удаление...' : '🗑 Удалить'}
                    </Button>
                  </Card.Body>
                )}
              </Card>
            </Col>
          ))
        ) : (
          <Col>
            <p className="text-muted text-center">
              {isAdmin
                ? 'В альбоме пока нет фотографий. Загрузите фотографии выше.'
                : 'В альбоме пока нет фотографий'}
            </p>
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
        <Modal.Header closeButton>
          <Modal.Title>{selectedPhoto?.title || 'Просмотр фото'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {selectedPhoto && (
            <img
              src={selectedPhoto.image}
              alt={selectedPhoto.title || 'Фото'}
              className="img-fluid w-100"
            />
          )}
        </Modal.Body>
        {selectedPhoto?.description && (
          <Modal.Footer>
            <p className="text-muted mb-0">{selectedPhoto.description}</p>
          </Modal.Footer>
        )}
      </Modal>
    </Container>
  );
};

export default AlbumDetailPage;
