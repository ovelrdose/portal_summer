import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Spinner, Button, Card, Alert, Badge, Form } from 'react-bootstrap';
import { galleryAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import '../components/ImageGallery.css';

const AlbumDetailPage = () => {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);

  // Лайтбокс: индекс открытого фото (null = закрыт)
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Загрузка фото
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Удаление фото
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

  // ── Лайтбокс ──────────────────────────────────
  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const prevPhoto = useCallback(() => {
    setLightboxIndex((i) => (i === 0 ? album.photos.length - 1 : i - 1));
  }, [album?.photos?.length]);

  const nextPhoto = useCallback(() => {
    setLightboxIndex((i) => (i === album.photos.length - 1 ? 0 : i + 1));
  }, [album?.photos?.length]);

  // Клавиатурная навигация
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') prevPhoto();
      else if (e.key === 'ArrowRight') nextPhoto();
      else if (e.key === 'Escape') closeLightbox();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, prevPhoto, nextPhoto, closeLightbox]);

  // Блокировка прокрутки пока открыт лайтбокс
  useEffect(() => {
    document.body.style.overflow = lightboxIndex !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lightboxIndex]);

  // ── Загрузка фото ──────────────────────────────
  const handleFileSelect = (e) => {
    setSelectedFiles(Array.from(e.target.files));
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
      selectedFiles.forEach((file) => formData.append('images', file));

      await galleryAPI.uploadPhotos(id, formData);
      setUploadSuccess(`Успешно загружено ${selectedFiles.length} фото`);
      setSelectedFiles([]);
      const fileInput = document.getElementById('photoUploadInput');
      if (fileInput) fileInput.value = '';
      loadAlbum();
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.response?.data?.error || 'Ошибка загрузки фотографий');
    } finally {
      setUploading(false);
    }
  };

  // ── Удаление фото ──────────────────────────────
  const handleDeletePhoto = async (e, photoId) => {
    e.stopPropagation(); // не открывать лайтбокс при клике на удалить
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

  // ── Загрузка / не найден ───────────────────────
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

  const photos = album.photos || [];

  return (
    <Container className="py-4">

      {/* ── Навигационная строка ── */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Link to="/gallery" className="back-link">
          <span className="back-arrow">←</span>
          Назад к галерее
        </Link>
        {isAdmin && (
          <Button
            as={Link}
            to={`/admin/albums/${id}/edit`}
            variant="primary"
            style={{ borderRadius: '20px', padding: '6px 20px' }}
          >
            ✏ Редактировать
          </Button>
        )}
      </div>

      {/* ── Заголовок альбома ── */}
      <div className="mb-4">
        <h1 className="mb-1">
          {album.title}
          {isAdmin && !album.is_published && (
            <Badge bg="warning" className="ms-2">Черновик</Badge>
          )}
        </h1>
        {album.description && <p className="text-muted mb-0">{album.description}</p>}
      </div>

      {/* ── Загрузка фото (только для админа) ── */}
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
              <Form.Label>Выберите фотографии</Form.Label>
              <Form.Control
                id="photoUploadInput"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
              />
              {selectedFiles.length > 0 && (
                <Form.Text className="text-muted">
                  Выбрано: {selectedFiles.length} файлов
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

      {/* ── Сетка фотографий ── */}
      <h3 className="mb-3">Фотографии ({photos.length})</h3>

      {photos.length > 0 ? (
        <div className="album-photo-grid">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="album-photo-item"
              onClick={() => openLightbox(index)}
            >
              <img src={photo.image} alt={photo.title || `Фото ${index + 1}`} />

              {/* Оверлей при наведении */}
              <div className="album-photo-overlay" />

              {/* Кнопка удаления (только для админа, появляется при наведении) */}
              {isAdmin && (
                <div className="album-photo-delete">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={(e) => handleDeletePhoto(e, photo.id)}
                    disabled={deletingPhotoId === photo.id}
                    title="Удалить фото"
                  >
                    {deletingPhotoId === photo.id ? '…' : '🗑'}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted text-center py-4">
          {isAdmin
            ? 'В альбоме пока нет фотографий. Загрузите фотографии выше.'
            : 'В альбоме пока нет фотографий'}
        </p>
      )}

      {/* ── Лайтбокс ── */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="album-lightbox"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
        >
          {/* Кнопка закрытия */}
          <button
            className="album-lightbox-close"
            onClick={closeLightbox}
            aria-label="Закрыть"
          >
            ✕
          </button>

          {/* Внутренний контейнер (клик не закрывает) */}
          <div
            className="album-lightbox-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIndex].image}
              alt={photos[lightboxIndex].title || `Фото ${lightboxIndex + 1}`}
              className="album-lightbox-img"
            />

            {/* Подпись + счётчик */}
            <div className="album-lightbox-footer">
              {photos[lightboxIndex].title ? (
                <div className="album-lightbox-caption">
                  {photos[lightboxIndex].title}
                </div>
              ) : (
                <div /> /* flex-заглушка */
              )}
              <div className="album-lightbox-counter">
                {lightboxIndex + 1} / {photos.length}
              </div>
            </div>
          </div>

          {/* Навигационные стрелки */}
          {photos.length > 1 && (
            <>
              <button
                className="album-lightbox-nav album-lightbox-prev"
                onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                aria-label="Предыдущее фото"
              >
                ‹
              </button>
              <button
                className="album-lightbox-nav album-lightbox-next"
                onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                aria-label="Следующее фото"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}

    </Container>
  );
};

export default AlbumDetailPage;
