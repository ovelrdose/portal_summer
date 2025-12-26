import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container, Row, Col, Card, Form, Button, Spinner, Alert, Badge, Modal
} from 'react-bootstrap';
import { newsAPI } from '../../services/api';
import BlockEditor from '../../components/BlockEditor/BlockEditor';

const NewsEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: '',
    short_description: '',
    image_url: null,
    uses_block_editor: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [contentBlocks, setContentBlocks] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadNews = useCallback(async () => {
    try {
      const response = await newsAPI.getNewsItem(id);
      const data = response.data;
      setFormData({
        title: data.title,
        short_description: data.short_description,
        image_url: data.image,
        uses_block_editor: data.uses_block_editor !== false,
      });
      setContentBlocks(data.content_blocks || []);
      setSelectedTags(data.tags?.map(tag => tag.id) || []);
      setIsPublished(data.is_published || false);
    } catch (error) {
      console.error('Error loading news:', error);
      setError('Ошибка загрузки новости');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTags = useCallback(async () => {
    setLoadingTags(true);
    try {
      const response = await newsAPI.getTags();
      const tagsData = Array.isArray(response.data) ? response.data : [];
      console.log('Loaded tags:', tagsData); // Для отладки
      setAvailableTags(tagsData);
    } catch (error) {
      console.error('Error loading tags:', error);
      setAvailableTags([]);
    } finally {
      setLoadingTags(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
    if (isEdit) {
      loadNews();
    }
  }, [isEdit, loadNews, loadTags]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setRemoveImage(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
  };

  const handleTagToggle = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Сохранить черновик (для новой новости или изменений черновика)
  const handleSaveDraft = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('short_description', formData.short_description);
      data.append('content', ''); // Пустое поле для блочного редактора
      data.append('uses_block_editor', 'true');
      data.append('content_blocks', JSON.stringify(contentBlocks));
      data.append('is_published', 'false');

      if (imageFile) {
        data.append('image', imageFile);
      } else if (removeImage) {
        data.append('image', '');
      }

      selectedTags.forEach(tagId => {
        data.append('tags', tagId);
      });

      if (isEdit) {
        await newsAPI.updateNews(id, data);
        setSuccess('Черновик сохранен');
        setImageFile(null);
        setImagePreview(null);
        setRemoveImage(false);
        loadNews();
      } else {
        const response = await newsAPI.createNews(data);
        navigate(`/admin/news/${response.data.id}/edit`);
      }
    } catch (err) {
      console.error('Save error:', err.response?.data || err);
      const errorMessage = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : 'Ошибка сохранения новости';
      setError(`Ошибка сохранения: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // Сохранить изменения (для опубликованной новости, без смены статуса)
  const handleSaveChanges = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('short_description', formData.short_description);
      data.append('content', '');
      data.append('uses_block_editor', 'true');
      data.append('content_blocks', JSON.stringify(contentBlocks));

      if (imageFile) {
        data.append('image', imageFile);
      } else if (removeImage) {
        data.append('image', '');
      }

      selectedTags.forEach(tagId => {
        data.append('tags', tagId);
      });

      await newsAPI.updateNews(id, data);
      setSuccess('Изменения сохранены');
      setImageFile(null);
      setImagePreview(null);
      setRemoveImage(false);
      loadNews();
    } catch (err) {
      console.error('Save error:', err.response?.data || err);
      const errorMessage = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : 'Ошибка сохранения новости';
      setError(`Ошибка сохранения: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // Опубликовать новость (сохранить + установить статус публикации)
  const handlePublish = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('short_description', formData.short_description);
      data.append('content', '');
      data.append('uses_block_editor', 'true');
      data.append('content_blocks', JSON.stringify(contentBlocks));

      if (imageFile) {
        data.append('image', imageFile);
      } else if (removeImage) {
        data.append('image', '');
      }

      selectedTags.forEach(tagId => {
        data.append('tags', tagId);
      });

      let newsId = id;

      // Если создаем новую новость, сначала создаем ее как черновик
      if (!isEdit) {
        data.append('is_published', 'false');
        const response = await newsAPI.createNews(data);
        newsId = response.data.id;
      } else {
        // Если редактируем существующую, сохраняем изменения
        await newsAPI.updateNews(id, data);
      }

      // Теперь публикуем через специальный endpoint
      await newsAPI.publishNews(newsId);

      // Обновляем состояние и показываем успешное сообщение
      setSuccess('Новость успешно опубликована');
      setIsPublished(true);
      setImageFile(null);
      setImagePreview(null);
      setRemoveImage(false);

      // Если создавали новую новость, перенаправляем на страницу редактирования
      if (!isEdit) {
        navigate(`/admin/news/${newsId}/edit`);
      } else {
        // Если редактировали существующую, перезагружаем данные
        loadNews();
      }
    } catch (err) {
      console.error('Publish error:', err.response?.data || err);
      const errorMessage = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : 'Ошибка публикации новости';
      setError(`Ошибка публикации: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // Вернуть в черновик (снять публикацию)
  const handleUnpublish = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await newsAPI.unpublishNews(id);
      setSuccess('Новость возвращена в черновик');
      setIsPublished(false);
      loadNews();
    } catch (err) {
      console.error('Unpublish error:', err.response?.data || err);
      const errorMessage = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : 'Ошибка снятия с публикации';
      setError(`Ошибка: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');

    try {
      await newsAPI.deleteNews(id);
      navigate('/news');
    } catch (error) {
      console.error('Delete error:', error.response?.data || error);
      setError('Ошибка удаления новости');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
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
      <h1 className="mb-4">{isEdit ? 'Редактирование новости' : 'Создание новости'}</h1>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row>
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header>Основная информация</Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Заголовок *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Краткое описание *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                    required
                    maxLength={500}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Обложка новости (необязательно)</Form.Label>
                  {(imagePreview || (formData.image_url && !removeImage)) && (
                    <div className="mb-2">
                      <img
                        src={imagePreview || formData.image_url}
                        alt="Обложка новости"
                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover' }}
                        className="img-thumbnail d-block mb-2"
                      />
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={handleRemoveImage}
                      >
                        Удалить обложку
                      </Button>
                    </div>
                  )}
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Теги</Form.Label>
                  {loadingTags ? (
                    <div className="text-muted">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Загрузка тегов...
                    </div>
                  ) : availableTags.length === 0 ? (
                    <div className="alert alert-warning mb-0">
                      <p className="mb-1">Теги не найдены.</p>
                      <small>Создайте теги через команду: <code>python manage.py create_default_tags</code></small>
                    </div>
                  ) : (
                    <>
                      <Form.Text className="d-block mb-2 text-muted">
                        Выбрано тегов: {selectedTags.length}. Нажмите на тег, чтобы выбрать или убрать.
                      </Form.Text>
                      <div className="d-flex flex-wrap gap-2">
                        {availableTags.map((tag) => (
                          <Badge
                            key={tag.id}
                            bg={selectedTags.includes(tag.id) ? 'primary' : 'secondary'}
                            className="cursor-pointer p-2"
                            onClick={() => handleTagToggle(tag.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            {selectedTags.includes(tag.id) && '✓ '}
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>Содержимое новости</Card.Header>
            <Card.Body>
              <BlockEditor
                blocks={contentBlocks}
                onBlocksChange={setContentBlocks}
                uploadImage={newsAPI.uploadNewsImage}
                hideHomework={true}
              />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="sticky-top" style={{ top: '80px' }}>
            <Card.Body>
              {isEdit && (
                <div className="mb-3">
                  <Badge bg={isPublished ? 'success' : 'secondary'} className="w-100 p-2">
                    {isPublished ? 'Опубликована' : 'Черновик'}
                  </Badge>
                </div>
              )}

              <div className="d-grid gap-2">
                {isPublished ? (
                  // Кнопки для опубликованной новости
                  <>
                    <Button
                      variant="primary"
                      onClick={handleSaveChanges}
                      disabled={saving}
                    >
                      {saving ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                    <Button
                      variant="warning"
                      onClick={handleUnpublish}
                      disabled={saving}
                    >
                      Вернуть в черновик
                    </Button>
                  </>
                ) : (
                  // Кнопки для черновика
                  <>
                    <Button
                      variant="success"
                      onClick={handlePublish}
                      disabled={saving}
                    >
                      {saving ? 'Публикация...' : 'Опубликовать'}
                    </Button>
                    <Button
                      variant="outline-primary"
                      onClick={handleSaveDraft}
                      disabled={saving}
                    >
                      Сохранить в черновик
                    </Button>
                  </>
                )}

                <Button
                  variant="outline-secondary"
                  as={Link}
                  to="/admin/news"
                >
                  Отмена
                </Button>

                {isEdit && (
                  <Button
                    variant="danger"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={saving || deleting}
                  >
                    Удалить новость
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Вы уверены, что хотите удалить новость <strong>"{formData.title}"</strong>?</p>
          <p className="text-danger">
            Это действие необратимо.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Удаление...' : 'Удалить новость'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default NewsEditor;
