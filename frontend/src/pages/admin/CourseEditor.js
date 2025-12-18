import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Form, Button, Spinner, Alert,
  Modal, Badge, Accordion
} from 'react-bootstrap';
import { coursesAPI } from '../../services/api';
import BlockEditor from '../../components/BlockEditor';

const CourseEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [course, setCourse] = useState({
    title: '',
    short_description: '',
    description: '',
    is_published: false,
  });
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({ title: '', order: 0 });

  // BlockEditor states
  const [sectionBlocks, setSectionBlocks] = useState({}); // { sectionId: blocks[] }
  const [savingSectionId, setSavingSectionId] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  // Преобразование элементов API в формат блоков для BlockEditor
  const apiElementsToBlocks = (elements) => {
    return (elements || []).map((el) => ({
      id: el.id,
      type: el.content_type,
      data: el.data || {},
      order: el.order,
      title: el.title || '',
      is_published: el.is_published,
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

  useEffect(() => {
    if (isEdit) {
      loadCourse();
    }
  }, [isEdit, loadCourse]);

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (isEdit) {
        await coursesAPI.updateCourse(id, course);
        setSuccess('Курс сохранен');
      } else {
        const response = await coursesAPI.createCourse(course);
        navigate(`/admin/courses/${response.data.id}/edit`);
      }
    } catch (err) {
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

  // Section handlers
  const openSectionModal = (section = null) => {
    if (section) {
      setEditingSection(section);
      setSectionForm({ title: section.title, order: section.order });
    } else {
      setEditingSection(null);
      setSectionForm({ title: '', order: sections.length });
    }
    setShowSectionModal(true);
  };

  const handleSaveSection = async () => {
    try {
      const data = {
        title: sectionForm.title,
        order: isNaN(sectionForm.order) ? 0 : sectionForm.order,
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
                className="w-100"
                onClick={() => navigate(isEdit ? `/portal/courses/${id}` : '/portal/courses')}
              >
                {isEdit ? 'Закончить редактирование' : 'Вернуться к курсам'}
              </Button>
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
          <Form.Group>
            <Form.Label>Порядок</Form.Label>
            <Form.Control
              type="number"
              value={sectionForm.order}
              onChange={(e) => setSectionForm({ ...sectionForm, order: parseInt(e.target.value) })}
            />
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

    </Container>
  );
};

export default CourseEditor;
