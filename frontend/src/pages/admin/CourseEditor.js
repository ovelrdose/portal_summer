import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Form, Button, Spinner, Alert,
  ListGroup, Modal, Badge
} from 'react-bootstrap';
import { coursesAPI } from '../../services/api';

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
  const [showElementModal, setShowElementModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editingElement, setEditingElement] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);

  const [sectionForm, setSectionForm] = useState({ title: '', order: 0 });
  const [elementForm, setElementForm] = useState({
    content_type: 'text',
    title: '',
    text_content: '',
    link_url: '',
    link_text: '',
    homework_description: '',
    order: 0,
  });

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
      loadCourse();
    } catch (error) {
      setError('Ошибка удаления раздела');
    }
  };

  // Element handlers
  const openElementModal = (sectionId, element = null) => {
    setSelectedSectionId(sectionId);
    if (element) {
      setEditingElement(element);
      setElementForm({
        content_type: element.content_type,
        title: element.title || '',
        text_content: element.text_content || '',
        link_url: element.link_url || '',
        link_text: element.link_text || '',
        homework_description: element.homework_description || '',
        order: element.order,
      });
    } else {
      setEditingElement(null);
      const section = sections.find((s) => s.id === sectionId);
      setElementForm({
        content_type: 'text',
        title: '',
        text_content: '',
        link_url: '',
        link_text: '',
        homework_description: '',
        order: section?.elements?.length || 0,
      });
    }
    setShowElementModal(true);
  };

  const handleSaveElement = async () => {
    try {
      const data = {
        ...elementForm,
        order: isNaN(elementForm.order) ? 0 : elementForm.order,
      };
      if (editingElement) {
        await coursesAPI.updateElement(editingElement.id, data);
      } else {
        await coursesAPI.createElement({ ...data, section: parseInt(selectedSectionId, 10) });
      }
      loadCourse();
      setShowElementModal(false);
    } catch (error) {
      console.error('Element save error:', error.response?.data || error);
      const errorMsg = error.response?.data
        ? JSON.stringify(error.response.data)
        : 'Ошибка сохранения элемента';
      setError(errorMsg);
    }
  };

  const handleDeleteElement = async (elementId) => {
    if (!window.confirm('Удалить элемент?')) return;
    try {
      await coursesAPI.deleteElement(elementId);
      loadCourse();
    } catch (error) {
      setError('Ошибка удаления элемента');
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
                  sections.map((section) => (
                    <Card key={section.id} className="mb-3">
                      <Card.Header className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{section.title}</strong>
                          {!section.is_published && (
                            <Badge bg="warning" className="ms-2">Скрыт</Badge>
                          )}
                        </div>
                        <div>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => openSectionModal(section)}
                          >
                            Редактировать
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteSection(section.id)}
                          >
                            Удалить
                          </Button>
                        </div>
                      </Card.Header>
                      <ListGroup variant="flush">
                        {section.elements?.map((element) => (
                          <ListGroup.Item
                            key={element.id}
                            className="d-flex justify-content-between align-items-center"
                          >
                            <div>
                              <Badge bg="info" className="me-2">
                                {element.content_type === 'text' && 'Текст'}
                                {element.content_type === 'image' && 'Изображение'}
                                {element.content_type === 'link' && 'Ссылка'}
                                {element.content_type === 'homework' && 'ДЗ'}
                              </Badge>
                              {element.title || 'Без названия'}
                            </div>
                            <div>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => openElementModal(section.id, element)}
                              >
                                Редактировать
                              </Button>
                              <Button
                                variant="link"
                                size="sm"
                                className="text-danger"
                                onClick={() => handleDeleteElement(element.id)}
                              >
                                Удалить
                              </Button>
                            </div>
                          </ListGroup.Item>
                        ))}
                        <ListGroup.Item>
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => openElementModal(section.id)}
                          >
                            + Добавить элемент
                          </Button>
                        </ListGroup.Item>
                      </ListGroup>
                    </Card>
                  ))
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
                onClick={() => navigate('/portal/courses')}
              >
                Вернуться к курсам
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

      {/* Element Modal */}
      <Modal show={showElementModal} onHide={() => setShowElementModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingElement ? 'Редактировать элемент' : 'Добавить элемент'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Тип контента</Form.Label>
            <Form.Select
              value={elementForm.content_type}
              onChange={(e) => setElementForm({ ...elementForm, content_type: e.target.value })}
            >
              <option value="text">Текст</option>
              <option value="image">Изображение</option>
              <option value="link">Ссылка</option>
              <option value="homework">Домашнее задание</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Заголовок</Form.Label>
            <Form.Control
              type="text"
              value={elementForm.title}
              onChange={(e) => setElementForm({ ...elementForm, title: e.target.value })}
            />
          </Form.Group>

          {elementForm.content_type === 'text' && (
            <Form.Group className="mb-3">
              <Form.Label>Текст</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={elementForm.text_content}
                onChange={(e) => setElementForm({ ...elementForm, text_content: e.target.value })}
              />
            </Form.Group>
          )}

          {elementForm.content_type === 'link' && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>URL ссылки</Form.Label>
                <Form.Control
                  type="url"
                  value={elementForm.link_url}
                  onChange={(e) => setElementForm({ ...elementForm, link_url: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Текст ссылки</Form.Label>
                <Form.Control
                  type="text"
                  value={elementForm.link_text}
                  onChange={(e) => setElementForm({ ...elementForm, link_text: e.target.value })}
                />
              </Form.Group>
            </>
          )}

          {elementForm.content_type === 'homework' && (
            <Form.Group className="mb-3">
              <Form.Label>Описание задания</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={elementForm.homework_description}
                onChange={(e) => setElementForm({ ...elementForm, homework_description: e.target.value })}
              />
            </Form.Group>
          )}

          <Form.Group>
            <Form.Label>Порядок</Form.Label>
            <Form.Control
              type="number"
              value={elementForm.order}
              onChange={(e) => setElementForm({ ...elementForm, order: parseInt(e.target.value) })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowElementModal(false)}>
            Отмена
          </Button>
          <Button variant="primary" onClick={handleSaveElement}>
            Сохранить
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CourseEditor;
