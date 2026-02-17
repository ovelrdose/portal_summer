import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container, Row, Col, Card, Form, Button, Spinner, Alert, Badge, Modal, Image
} from 'react-bootstrap';
import { galleryAPI } from '../../services/api';

const AlbumEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover_url: null,
  });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPhotoDeleteModal, setShowPhotoDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(null);

  const loadAlbum = useCallback(async () => {
    try {
      const response = await galleryAPI.getAlbum(id);
      const data = response.data;
      setFormData({
        title: data.title,
        description: data.description || '',
        cover_url: data.cover,
      });
      setPhotos(data.photos || []);
      setIsPublished(data.is_published || false);
    } catch (error) {
      console.error('Error loading album:', error);
      setError('Ошибка загрузки альбома');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) {
      loadAlbum();
    }
  }, [isEdit, loadAlbum]);

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      setRemoveCover(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setRemoveCover(true);
  };

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);

    // Create previews for selected files
    const previews = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push({ file: file.name, url: reader.result });
        if (previews.length === files.length) {
          setFilePreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });

    if (files.length === 0) {
      setFilePreviews([]);
    }
  };

  const handleRemoveSelectedFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = filePreviews.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setFilePreviews(newPreviews);
  };

  const handleSaveAlbum = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);

      if (coverFile) {
        data.append('cover', coverFile);
      } else if (removeCover) {
        data.append('cover', '');
      }

      if (isEdit) {
        await galleryAPI.updateAlbum(id, data);
        setSuccess('Альбом сохранен');
        setCoverFile(null);
        setCoverPreview(null);
        setRemoveCover(false);
        loadAlbum();
      } else {
        const response = await galleryAPI.createAlbum(data);
        navigate(`/admin/albums/${response.data.id}/edit`);
      }
    } catch (err) {
      console.error('Save error:', err.response?.data || err);
      const errorMessage = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : 'Ошибка сохранения альбома';
      setError(`Ошибка сохранения: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhotos = async () => {
    if (selectedFiles.length === 0) {
      setError('Выберите файлы для загрузки');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const response = await galleryAPI.uploadPhotos(id, selectedFiles);
      const uploaded = response.data.uploaded || 0;
      const errors = response.data.errors || [];

      let message = `Успешно загружено фото: ${uploaded}`;
      if (errors.length > 0) {
        message += `\nОшибки: ${errors.length}`;
        console.error('Upload errors:', errors);
      }

      setSuccess(message);
      setSelectedFiles([]);
      setFilePreviews([]);

      // Clear file input
      const fileInput = document.getElementById('photo-upload-input');
      if (fileInput) fileInput.value = '';

      loadAlbum();
    } catch (err) {
      console.error('Upload error:', err.response?.data || err);
      const errorMessage = err.response?.data?.error || 'Ошибка загрузки фотографий';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await galleryAPI.publishAlbum(id);
      setSuccess('Альбом опубликован');
      setIsPublished(true);
      loadAlbum();
    } catch (err) {
      console.error('Publish error:', err.response?.data || err);
      setError('Ошибка публикации альбома');
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await galleryAPI.unpublishAlbum(id);
      setSuccess('Альбом возвращен в черновик');
      setIsPublished(false);
      loadAlbum();
    } catch (err) {
      console.error('Unpublish error:', err.response?.data || err);
      setError('Ошибка снятия с публикации');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAlbum = async () => {
    setDeleting(true);
    setError('');

    try {
      await galleryAPI.deleteAlbum(id);
      navigate('/admin/albums');
    } catch (error) {
      console.error('Delete error:', error.response?.data || error);
      setError('Ошибка удаления альбома');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!deletingPhotoId) return;

    try {
      await galleryAPI.deletePhoto(deletingPhotoId);
      setSuccess('Фотография удалена');
      setShowPhotoDeleteModal(false);
      setDeletingPhotoId(null);
      loadAlbum();
    } catch (error) {
      console.error('Delete photo error:', error.response?.data || error);
      setError('Ошибка удаления фотографии');
    }
  };

  const handleUpdatePhoto = async (photoId, data) => {
    try {
      await galleryAPI.updatePhoto(photoId, data);
      setSuccess('Фотография обновлена');
      setEditingPhoto(null);
      loadAlbum();
    } catch (error) {
      console.error('Update photo error:', error.response?.data || error);
      setError('Ошибка обновления фотографии');
    }
  };

  const openPhotoDeleteModal = (photoId) => {
    setDeletingPhotoId(photoId);
    setShowPhotoDeleteModal(true);
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
      <Link to="/gallery" className="back-link mb-3 d-inline-flex">
        <span className="back-arrow">←</span>
        Назад к галерее
      </Link>
      <h1 className="mb-4">{isEdit ? 'Редактирование альбома' : 'Создание альбома'}</h1>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row>
        <Col lg={8}>
          {/* Album Info */}
          <Card className="mb-4">
            <Card.Header>Основная информация</Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Название альбома *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Описание</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Обложка альбома (необязательно)</Form.Label>
                  <Form.Text className="text-muted d-block mb-2">
                    Если не указана, будет использоваться первая фотография
                  </Form.Text>
                  {(coverPreview || (formData.cover_url && !removeCover)) && (
                    <div className="mb-2">
                      <Image
                        src={coverPreview || formData.cover_url}
                        alt="Обложка альбома"
                        thumbnail
                        style={{ maxWidth: '300px', maxHeight: '200px', objectFit: 'cover' }}
                        className="d-block mb-2"
                      />
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={handleRemoveCover}
                      >
                        Удалить обложку
                      </Button>
                    </div>
                  )}
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                  />
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>

          {/* Photos Management (only for existing albums) */}
          {isEdit && (
            <>
              {/* Upload Photos */}
              <Card className="mb-4">
                <Card.Header>Загрузка фотографий</Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3">
                    <Form.Label>Выберите фотографии</Form.Label>
                    <Form.Control
                      id="photo-upload-input"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFilesChange}
                    />
                    <Form.Text className="text-muted">
                      Можно выбрать несколько файлов. Максимальный размер файла: 10 МБ
                    </Form.Text>
                  </Form.Group>

                  {filePreviews.length > 0 && (
                    <div className="mb-3">
                      <h6>Выбрано файлов: {filePreviews.length}</h6>
                      <Row className="g-2">
                        {filePreviews.map((preview, index) => (
                          <Col key={index} xs={6} sm={4} md={3}>
                            <Card>
                              <Card.Img
                                variant="top"
                                src={preview.url}
                                style={{ height: '150px', objectFit: 'cover' }}
                              />
                              <Card.Body className="p-2">
                                <div className="d-flex justify-content-between align-items-center">
                                  <small className="text-truncate">{preview.file}</small>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleRemoveSelectedFile(index)}
                                  >
                                    &times;
                                  </Button>
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    onClick={handleUploadPhotos}
                    disabled={uploading || selectedFiles.length === 0}
                  >
                    {uploading ? 'Загрузка...' : 'Загрузить фотографии'}
                  </Button>
                </Card.Body>
              </Card>

              {/* Existing Photos */}
              <Card>
                <Card.Header>Фотографии в альбоме ({photos.length})</Card.Header>
                <Card.Body>
                  {photos.length > 0 ? (
                    <Row className="g-3">
                      {photos.map((photo) => (
                        <Col key={photo.id} xs={12} sm={6} md={4}>
                          <Card>
                            <Card.Img
                              variant="top"
                              src={photo.image}
                              style={{ height: '200px', objectFit: 'cover' }}
                            />
                            <Card.Body>
                              {editingPhoto === photo.id ? (
                                <Form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const title = e.target.elements.title.value;
                                    const description = e.target.elements.description.value;
                                    handleUpdatePhoto(photo.id, { title, description });
                                  }}
                                >
                                  <Form.Group className="mb-2">
                                    <Form.Control
                                      type="text"
                                      name="title"
                                      defaultValue={photo.title}
                                      placeholder="Название"
                                    />
                                  </Form.Group>
                                  <Form.Group className="mb-2">
                                    <Form.Control
                                      as="textarea"
                                      rows={2}
                                      name="description"
                                      defaultValue={photo.description}
                                      placeholder="Описание"
                                    />
                                  </Form.Group>
                                  <div className="d-flex gap-2">
                                    <Button type="submit" variant="success" size="sm">
                                      Сохранить
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => setEditingPhoto(null)}
                                    >
                                      Отмена
                                    </Button>
                                  </div>
                                </Form>
                              ) : (
                                <>
                                  <Card.Title className="h6">{photo.title}</Card.Title>
                                  {photo.description && (
                                    <Card.Text className="small text-muted">
                                      {photo.description}
                                    </Card.Text>
                                  )}
                                  <div className="d-flex gap-2 mt-2">
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => setEditingPhoto(photo.id)}
                                    >
                                      Редактировать
                                    </Button>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => openPhotoDeleteModal(photo.id)}
                                    >
                                      Удалить
                                    </Button>
                                  </div>
                                </>
                              )}
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <p className="text-muted text-center">
                      Фотографии не загружены. Используйте форму выше для загрузки.
                    </p>
                  )}
                </Card.Body>
              </Card>
            </>
          )}
        </Col>

        {/* Sidebar */}
        <Col lg={4}>
          <Card className="sticky-top" style={{ top: '80px' }}>
            <Card.Body>
              {isEdit && (
                <div className="mb-3">
                  <Badge bg={isPublished ? 'success' : 'secondary'} className="w-100 p-2">
                    {isPublished ? 'Опубликован' : 'Черновик'}
                  </Badge>
                </div>
              )}

              <div className="d-grid gap-2">
                {isEdit ? (
                  <>
                    <Button
                      variant="primary"
                      onClick={handleSaveAlbum}
                      disabled={saving}
                    >
                      {saving ? 'Сохранение...' : 'Сохранить изменения'}
                    </Button>
                    {isPublished ? (
                      <Button
                        variant="warning"
                        onClick={handleUnpublish}
                        disabled={saving}
                      >
                        Вернуть в черновик
                      </Button>
                    ) : (
                      <Button
                        variant="success"
                        onClick={handlePublish}
                        disabled={saving}
                      >
                        Опубликовать
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    variant="success"
                    onClick={handleSaveAlbum}
                    disabled={saving}
                  >
                    {saving ? 'Создание...' : 'Создать альбом'}
                  </Button>
                )}

                <Button
                  variant="outline-secondary"
                  as={Link}
                  to="/admin/albums"
                >
                  Отмена
                </Button>

                {isEdit && (
                  <Button
                    variant="danger"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={saving || deleting}
                  >
                    Удалить альбом
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Delete Album Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Вы уверены, что хотите удалить альбом <strong>"{formData.title}"</strong>?</p>
          <p className="text-danger">
            Это действие необратимо. Будут удалены все фотографии альбома.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleDeleteAlbum} disabled={deleting}>
            {deleting ? 'Удаление...' : 'Удалить альбом'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Photo Modal */}
      <Modal show={showPhotoDeleteModal} onHide={() => setShowPhotoDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Вы уверены, что хотите удалить эту фотографию?</p>
          <p className="text-danger">Это действие необратимо.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPhotoDeleteModal(false)}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleDeletePhoto}>
            Удалить фотографию
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AlbumEditor;
