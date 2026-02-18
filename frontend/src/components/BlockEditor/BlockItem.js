import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge, Button, Form, Collapse } from 'react-bootstrap';
import TextBlock from './blocks/TextBlock';
import VideoBlock from './blocks/VideoBlock';
import ImageBlock from './blocks/ImageBlock';
import GalleryBlock from './blocks/GalleryBlock';
import LinkBlock from './blocks/LinkBlock';
import HomeworkBlock from './blocks/HomeworkBlock';
import { formatDateTimeLocal, dateTimeLocalToISO } from '../../utils/dateUtils';

const BlockItem = ({ block, onUpdate, onDelete, sectionId, uploadImage, isDraggingAny }) => {
  const [showSettings, setShowSettings] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getBlockTypeLabel = (type) => {
    const labels = {
      text: 'Текст',
      video: 'Видео',
      image: 'Изображение',
      gallery: 'Галерея',
      link: 'Ссылка',
      homework: 'Д/З',
    };
    return labels[type] || type;
  };

  const getBlockTypeBadgeVariant = (type) => {
    const variants = {
      text: 'primary',
      video: 'danger',
      image: 'success',
      gallery: 'warning',
      link: 'info',
      homework: 'warning',
    };
    return variants[type] || 'secondary';
  };

  const handlePublishDatetimeChange = (e) => {
    const value = e.target.value;
    onUpdate(block.id, {
      ...block,
      publish_datetime: value ? dateTimeLocalToISO(value) : null,
    });
  };

  const handleTitleChange = (e) => {
    const value = e.target.value;
    onUpdate(block.id, {
      ...block,
      title: value,
    });
  };

  const renderBlockContent = () => {
    const handleChange = (newData) => {
      onUpdate(block.id, { ...block, data: newData });
    };

    switch (block.type) {
      case 'text':
        return (
          <TextBlock
            data={block.data}
            onChange={handleChange}
            sectionId={sectionId}
            uploadImage={uploadImage}
          />
        );
      case 'video':
        return <VideoBlock data={block.data} onChange={handleChange} />;
      case 'image':
        return (
          <ImageBlock
            data={block.data}
            onChange={handleChange}
            sectionId={sectionId}
            uploadImage={uploadImage}
          />
        );
      case 'gallery':
        return (
          <GalleryBlock
            data={block.data}
            onChange={handleChange}
            sectionId={sectionId}
            uploadImage={uploadImage}
          />
        );
      case 'link':
        return <LinkBlock data={block.data} onChange={handleChange} />;
      case 'homework':
        return <HomeworkBlock data={block.data} onChange={handleChange} />;
      default:
        return <div className="text-muted">Неизвестный тип блока: {block.type}</div>;
    }
  };

  // Collapse all blocks (including the ghost placeholder) when any drag is active.
  // @dnd-kit re-measures heights on every render (MeasuringStrategy.Always),
  // so the sorting transitions are calculated using the compact heights — no jank.
  const isCollapsed = isDraggingAny;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`block-item ${isDragging ? 'dragging' : ''} ${isCollapsed ? 'collapsed' : ''}`}
    >
      <div className="block-item-header">
        {/* attributes + listeners are placed only on the handle so that
            inputs, buttons and editors inside the block still receive
            normal pointer/keyboard events. */}
        <div
          className="drag-handle"
          title="Перетащите для изменения порядка"
          {...attributes}
          {...listeners}
        >
          ☰
        </div>
        <Badge bg={getBlockTypeBadgeVariant(block.type)} className="block-type-badge">
          {getBlockTypeLabel(block.type)}
        </Badge>
        {block.publish_datetime && (
          <Badge bg="secondary" className="ms-1" title="Дата публикации установлена">
            <i className="bi bi-clock"></i>
          </Badge>
        )}
        <div className="block-item-actions">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            title="Настройки блока"
            className="me-1"
          >
            ⚙️
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => onDelete(block.id)}
            title="Удалить блок"
          >
            🗑
          </Button>
        </div>
      </div>

      <Collapse in={showSettings && !isCollapsed}>
        <div className="block-item-settings p-3 bg-light border-bottom">
          <Form.Group className="mb-2">
            <Form.Label className="small mb-1">Заголовок блока (опционально)</Form.Label>
            <Form.Control
              type="text"
              size="sm"
              value={block.title || ''}
              onChange={handleTitleChange}
              placeholder="Введите заголовок"
            />
          </Form.Group>
          <Form.Group className="mb-0">
            <Form.Label className="small mb-1">Дата и время открытия (опционально)</Form.Label>
            <Form.Control
              type="datetime-local"
              size="sm"
              value={formatDateTimeLocal(block.publish_datetime)}
              onChange={handlePublishDatetimeChange}
            />
            <Form.Text className="text-muted">
              Если указано, элемент будет скрыт для студентов до этой даты
            </Form.Text>
          </Form.Group>
        </div>
      </Collapse>

      <div className="block-item-content" style={isCollapsed ? { display: 'none' } : undefined}>
        {renderBlockContent()}
      </div>
    </div>
  );
};

export default BlockItem;
