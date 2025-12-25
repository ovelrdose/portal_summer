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
    } catch (error) {
      console.error('Error loading news:', error);
      setError('Ошибка загрузки новости');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTags = useCallback(async () => {
    try {
      const response = await newsAPI.getTags();
      setAvailableTags(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading tags:', error);
      setAvailableTags([]);
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

  const handleSubmit = async (isPublished) => {
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
      data.append('is_published', isPublished ? 'true' : 'false');

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
        setSuccess('Новость сохранена');
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
      console.error('Full error:', err);
      const errorMessage = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : 'Ошибка сохранения новости';
      setError(`Ошибка сохранения: ${errorMessage}`);
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
                  <div className="d-flex flex-wrap gap-2">
                    {Array.isArray(availableTags) && availableTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        bg={selectedTags.includes(tag.id) ? 'primary' : 'secondary'}
                        className="cursor-pointer p-2"
                        onClick={() => handleTagToggle(tag.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
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
              <div className="d-grid gap-2">
                <Button
                  variant="success"
                  onClick={() => handleSubmit(true)}
                  disabled={saving}
                >
                  {saving ? 'Сохранение...' : 'Опубликовать'}
                </Button>
                <Button
                  variant="outline-primary"
                  onClick={() => handleSubmit(false)}
                  disabled={saving}
                >
                  Сохранить черновик
                </Button>
                <Button
                  variant="outline-secondary"
                  as={Link}
                  to="/news"
                >
                  Отмена
                </Button>
                {isEdit && (
                  <Button
                    variant="danger"
                    onClick={() => setShowDeleteModal(true)}
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
