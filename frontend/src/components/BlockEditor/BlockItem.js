import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Badge, Button } from 'react-bootstrap';
import TextBlock from './blocks/TextBlock';
import VideoBlock from './blocks/VideoBlock';
import ImageBlock from './blocks/ImageBlock';
import LinkBlock from './blocks/LinkBlock';
import HomeworkBlock from './blocks/HomeworkBlock';

const ITEM_TYPE = 'BLOCK';

const BlockItem = ({ block, index, onUpdate, onDelete, onMove, sectionId }) => {
  const ref = useRef(null);

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    hover: (item, monitor) => {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(ref));

  const getBlockTypeLabel = (type) => {
    const labels = {
      text: 'Текст',
      video: 'Видео',
      image: 'Изображение',
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
      link: 'info',
      homework: 'warning',
    };
    return variants[type] || 'secondary';
  };

  const renderBlockContent = () => {
    const handleChange = (newData) => {
      onUpdate(block.id, { ...block, data: newData });
    };

    switch (block.type) {
      case 'text':
        return <TextBlock data={block.data} onChange={handleChange} />;
      case 'video':
        return <VideoBlock data={block.data} onChange={handleChange} />;
      case 'image':
        return (
          <ImageBlock
            data={block.data}
            onChange={handleChange}
            sectionId={sectionId}
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

  return (
    <div
      ref={ref}
      className={`block-item ${isDragging ? 'dragging' : ''} ${isOver ? 'drop-target' : ''}`}
    >
      <div className="block-item-header">
        <div className="drag-handle" title="Перетащите для изменения порядка">
          ☰
        </div>
        <Badge bg={getBlockTypeBadgeVariant(block.type)} className="block-type-badge">
          {getBlockTypeLabel(block.type)}
        </Badge>
        <div className="block-item-actions">
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
      <div className="block-item-content">
        {renderBlockContent()}
      </div>
    </div>
  );
};

export default BlockItem;
