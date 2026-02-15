import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container, Row, Col, Card, Form, Button, Spinner, Alert,
  Modal, Badge, Accordion
} from 'react-bootstrap';
import { coursesAPI } from '../../services/api';
import BlockEditor from '../../components/BlockEditor';
import { formatDateTimeLocal, dateTimeLocalToISO } from '../../utils/dateUtils';

const CourseEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [course, setCourse] = useState({
    title: '',
    short_description: '',
    description: '',
    is_published: false,
    image_url: null,
    thumbnail_url: null,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({ title: '', order: 0, publish_datetime: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // BlockEditor states
  const [sectionBlocks, setSectionBlocks] = useState({}); // { sectionId: blocks[] }
  const [savingSectionId, setSavingSectionId] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  // Homework stats
  const [homeworkStats, setHomeworkStats] = useState([]);

  // Преобразование элементов API в формат блоков для BlockEditor
  const apiElementsToBlocks = (elements) => {
    return (elements || []).map((el) => ({
      id: el.id,
      type: el.content_type,
      data: el.data || {},
      order: el.order,
      title: el.title || '',
      is_published: el.is_published,
      publish_datetime: el.publish_datetime || null,
    }));
  };

  // Преобразование блоков BlockEditor в формат API
  const blocksToApiElements = (blocks, sectionId) => {
    return blocks.map((block, index) => ({
      id: typeof block.id === 'number' ? block.id : null, // null для новых блоков
      section: sectionId,
      content_type: block.type,
      title: block.title || '',
      data: block.data || {},
      order: index,
      is_published: block.is_published !== false,
      publish_datetime: block.publish_datetime || null,
    }));
  };

  const loadCourse = useCallback(async () => {
    try {
      const response = await coursesAPI.getCourse(id);
      const data = response.data;
      setCourse({
        title: data.title,
        short_description: data.short_description,
        description: data.description || '',
        is_published: data.is_published,
        image_url: data.image_url,
        thumbnail_url: data.thumbnail_url,
      });
      setSections(data.sections || []);

      // Инициализируем блоки для каждой секции
      const blocksMap = {};
      (data.sections || []).forEach((section) => {
        blocksMap[section.id] = apiElementsToBlocks(section.elements);
      });
      setSectionBlocks(blocksMap);
    } catch (error) {
      setError('Ошибка загрузки курса');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadHomeworkStats = useCallback(async () => {
    if (!id) return;
    try {
      const response = await coursesAPI.getHomeworkStatsByCourse(id);
      setHomeworkStats(response.data);
    } catch (error) {
      console.error('Error loading homework stats:', error);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) {
      loadCourse();
      loadHomeworkStats();
    }
  }, [isEdit, loadCourse, loadHomeworkStats]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setRemoveImage(false);
      // Создаем превью
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

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      setRemoveThumbnail(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setRemoveThumbnail(true);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('title', course.title);
      formData.append('short_description', course.short_description);
      formData.append('description', course.description || '');
      formData.append('is_published', course.is_published);

      // Добавляем изображение если выбрано новое
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (removeImage) {
        // Если нужно удалить изображение, отправляем пустое значение
        formData.append('image', '');
      }

      // Добавляем thumbnail
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      } else if (removeThumbnail) {
        formData.append('thumbnail', '');
      }

      if (isEdit) {
        await coursesAPI.updateCourse(id, formData);
        setSuccess('Курс сохранен');
        // Сбрасываем локальные состояния файлов после успешного сохранения
        setImageFile(null);
        setImagePreview(null);
        setRemoveImage(false);
        setThumbnailFile(null);
        setThumbnailPreview(null);
        setRemoveThumbnail(false);
        loadCourse(); // Перезагружаем для обновления изображения
      } else {
        const response = await coursesAPI.createCourse(formData);
        navigate(`/admin/courses/${response.data.id}/edit`);
      }
    } catch (err) {
      console.error('Save error:', err.response?.data || err);
      setError('Ошибка сохранения курса');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      if (course.is_published) {
        await coursesAPI.unpublishCourse(id);
      } else {
        await coursesAPI.publishCourse(id);
      }
      setCourse({ ...course, is_published: !course.is_published });
    } catch (error) {
      setError('Ошибка публикации');
    }
  };

  const handleDeleteCourse = async () => {
    setDeleting(true);
    setError('');

    try {
      await coursesAPI.deleteCourse(id);
      navigate('/admin/courses');
    } catch (error) {
      console.error('Delete error:', error.response?.data || error);
      setError('Ошибка удаления курса');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  // Section handlers
  const openSectionModal = (section = null) => {
    if (section) {
      setEditingSection(section);
      setSectionForm({
        title: section.title,
        order: section.order,
        publish_datetime: formatDateTimeLocal(section.publish_datetime) || ''
      });
    } else {
      setEditingSection(null);
      setSectionForm({ title: '', order: sections.length, publish_datetime: '' });
    }
    setShowSectionModal(true);
  };

  const handleSaveSection = async () => {
    try {
      const data = {
        title: sectionForm.title,
        order: isNaN(sectionForm.order) ? 0 : sectionForm.order,
        publish_datetime: sectionForm.publish_datetime
          ? dateTimeLocalToISO(sectionForm.publish_datetime)
          : null,
      };
      if (editingSection) {
        await coursesAPI.updateSection(editingSection.id, data);
      } else {
        await coursesAPI.createSection({ ...data, course: parseInt(id, 10) });
      }
      loadCourse();
      setShowSectionModal(false);
    } catch (error) {
      console.error('Section save error:', error.response?.data || error);
      const errorMsg = error.response?.data
        ? JSON.stringify(error.response.data)
        : 'Ошибка сохранения раздела';
      setError(errorMsg);
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('Удалить раздел и все его содержимое?')) return;
    try {
      await coursesAPI.deleteSection(sectionId);
      // Удаляем блоки секции из состояния
      setSectionBlocks((prev) => {
        const updated = { ...prev };
        delete updated[sectionId];
        return updated;
      });
      loadCourse();
    } catch (error) {
      setError('Ошибка удаления раздела');
    }
  };

  // BlockEditor handlers
  const handleBlocksChange = (sectionId, newBlocks) => {
    setSectionBlocks((prev) => ({
      ...prev,
      [sectionId]: newBlocks,
    }));
  };

  const handleSaveBlocks = async (sectionId) => {
    setSavingSectionId(sectionId);
    setError('');

    try {
      const blocks = sectionBlocks[sectionId] || [];
      const apiElements = blocksToApiElements(blocks, sectionId);

      // Получаем текущие элементы секции из API
      const currentElements = sections.find((s) => s.id === sectionId)?.elements || [];
      const currentIds = currentElements.map((el) => el.id);
      const newIds = apiElements.filter((el) => el.id).map((el) => el.id);

      // Удаляем элементы, которых больше нет
      const toDelete = currentIds.filter((id) => !newIds.includes(id));
      for (const elementId of toDelete) {
        await coursesAPI.deleteElement(elementId);
      }

      // Создаем или обновляем элементы
      for (const element of apiElements) {
        if (element.id) {
          // Обновляем существующий
          await coursesAPI.updateElement(element.id, {
            content_type: element.content_type,
            title: element.title,
            data: element.data,
            order: element.order,
            is_published: element.is_published,
            publish_datetime: element.publish_datetime,
          });
        } else {
          // Создаем новый
          await coursesAPI.createElement({
            section: sectionId,
            content_type: element.content_type,
            title: element.title,
            data: element.data,
            order: element.order,
            is_published: element.is_published,
            publish_datetime: element.publish_datetime,
          });
        }
      }

      setSuccess('Содержимое раздела сохранено');
      loadCourse();
    } catch (error) {
      console.error('Save blocks error:', error.response?.data || error);
      const errorMsg = error.response?.data
        ? JSON.stringify(error.response.data)
        : 'Ошибка сохранения содержимого';
      setError(errorMsg);
    } finally {
      setSavingSectionId(null);
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
      <h1 className="mb-4">{isEdit ? 'Редактирование курса' : 'Создание курса'}</h1>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row>
        <Col lg={8}>
          {/* Course Info */}
          <Card className="mb-4">
            <Card.Header>Основная информация</Card.Header>
            <Card.Body>
              <Form onSubmit={handleSaveCourse}>
                <Form.Group className="mb-3">
                  <Form.Label>Название курса *</Form.Label>
                  <Form.Control
                    type="text"
                    value={course.title}
                    onChange={(e) => setCourse({ ...course, title: e.target.value })}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Краткое описание *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={course.short_description}
                    onChange={(e) => setCourse({ ...course, short_description: e.target.value })}
                    required
                    maxLength={500}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Полное описание</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    value={course.description}
                    onChange={(e) => setCourse({ ...course, description: e.target.value })}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Изображение обложки (необязательно)</Form.Label>
                  <Form.Text className="text-muted d-block mb-2">
                    Используется на странице курса. Рекомендуемый размер: 1200x400 px (3:1).
                  </Form.Text>
                  {(imagePreview || (course.image_url && !removeImage)) && (
                    <div className="mb-2">
                      <img
                        src={imagePreview || course.image_url}
                        alt="Обложка курса"
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
                  <Form.Label>Миниатюра для карточек (необязательно)</Form.Label>
                  <Form.Text className="text-muted d-block mb-2">
                    Используется в списках курсов. Рекомендуемый размер: 800x200 px (4:1).
                    Если не указана, будет использоваться обложка.
                  </Form.Text>
                  {(thumbnailPreview || (course.thumbnail_url && !removeThumbnail)) && (
                    <div className="mb-2">
                      <img
                        src={thumbnailPreview || course.thumbnail_url}
                        alt="Миниатюра курса"
                        style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'cover' }}
                        className="img-thumbnail d-block mb-2"
                      />
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={handleRemoveThumbnail}
                      >
                        Удалить миниатюру
                      </Button>
                    </div>
                  )}
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                  />
                </Form.Group>

                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </Form>
            </Card.Body>
          </Card>

          {/* Sections (only for existing courses) */}
          {isEdit && (
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <span>Разделы курса</span>
                <Button variant="success" size="sm" onClick={() => openSectionModal()}>
                  Добавить раздел
                </Button>
              </Card.Header>
              <Card.Body>
                {sections.length > 0 ? (
                  <Accordion
                    activeKey={expandedSection?.toString()}
                    onSelect={(key) => setExpandedSection(key ? parseInt(key) : null)}
                  >
                    {sections.map((section) => (
                      <Accordion.Item key={section.id} eventKey={section.id.toString()}>
                        <Accordion.Header>
                          <div className="d-flex justify-content-between align-items-center w-100 me-3">
                            <div>
                              <strong>{section.title}</strong>
                              {!section.is_published && (
                                <Badge bg="warning" className="ms-2">Скрыт</Badge>
                              )}
                              <Badge bg="secondary" className="ms-2">
                                {section.elements?.length || 0} элементов
                              </Badge>
                              {(() => {
                                const stat = homeworkStats.find(s => s.section_id === section.id);
                                if (stat && stat.total_submissions > 0) {
                                  const hasUnreviewed = stat.submitted_count > 0;
                                  return (
                                    <Badge bg={hasUnreviewed ? 'warning' : 'success'} className="ms-2">
                                      ДЗ: {stat.reviewed_count}/{stat.total_submissions}
                                    </Badge>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        </Accordion.Header>
                        <Accordion.Body>
                          <div className="mb-3 d-flex gap-2">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSectionModal(section);
                              }}
                            >
                              Настройки раздела
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSection(section.id);
                              }}
                            >
                              Удалить раздел
                            </Button>
                            {(() => {
                              const stat = homeworkStats.find(s => s.section_id === section.id);
                              if (stat && stat.total_submissions > 0) {
                                return (
                                  <Button
                                    as={Link}
                                    to={`/admin/courses/${id}/homework`}
                                    variant="outline-success"
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Проверка ДЗ
                                  </Button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <BlockEditor
                            blocks={sectionBlocks[section.id] || []}
                            sectionId={section.id}
                            onBlocksChange={(blocks) => handleBlocksChange(section.id, blocks)}
                            onSave={() => handleSaveBlocks(section.id)}
                            saving={savingSectionId === section.id}
                          />
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                ) : (
                  <p className="text-muted text-center">
                    Добавьте разделы для организации контента курса
                  </p>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>

        <Col lg={4}>
          <Card className="sticky-top" style={{ top: '80px' }}>
            <Card.Body>
              {isEdit && (
                <>
                  <div className="mb-3">
                    <strong>Статус:</strong>{' '}
                    <Badge bg={course.is_published ? 'success' : 'secondary'}>
                      {course.is_published ? 'Опубликован' : 'Черновик'}
                    </Badge>
                  </div>
                  <Button
                    variant={course.is_published ? 'warning' : 'success'}
                    className="w-100 mb-3"
                    onClick={handlePublish}
                  >
                    {course.is_published ? 'Снять с публикации' : 'Опубликовать'}
                  </Button>
                </>
              )}
              <Button
                variant="outline-secondary"
                className="w-100 mb-2"
                onClick={() => navigate(isEdit ? `/portal/courses/${id}` : '/portal/courses')}
              >
                {isEdit ? 'Закончить редактирование' : 'Вернуться к курсам'}
              </Button>
              {isEdit && (
                <Button
                  variant="danger"
                  className="w-100"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Удалить курс
                </Button>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Section Modal */}
      <Modal show={showSectionModal} onHide={() => setShowSectionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingSection ? 'Редактировать раздел' : 'Добавить раздел'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Название раздела</Form.Label>
            <Form.Control
              type="text"
              value={sectionForm.title}
              onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Порядок</Form.Label>
            <Form.Control
              type="number"
              value={sectionForm.order}
              onChange={(e) => setSectionForm({ ...sectionForm, order: parseInt(e.target.value) })}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Дата и время открытия (опционально)</Form.Label>
            <Form.Control
              type="datetime-local"
              value={sectionForm.publish_datetime}
              onChange={(e) => setSectionForm({ ...sectionForm, publish_datetime: e.target.value })}
            />
            <Form.Text className="text-muted">
              Если указано, раздел будет скрыт для студентов до этой даты
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSectionModal(false)}>
            Отмена
          </Button>
          <Button variant="primary" onClick={handleSaveSection}>
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Course Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Вы уверены, что хотите удалить курс <strong>"{course.title}"</strong>?</p>
          <p className="text-danger">
            Это действие необратимо. Будут удалены все разделы, материалы и подписки на курс.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleDeleteCourse} disabled={deleting}>
            {deleting ? 'Удаление...' : 'Удалить курс'}
          </Button>
        </Modal.Footer>
      </Modal>

    </Container>
  );
};

export default CourseEditor;
