import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button, ButtonGroup, Badge } from 'react-bootstrap';
import BlockToolbar from './BlockToolbar';
import BlockList from './BlockList';
import BlockPreview from './preview/BlockPreview';
import './BlockEditor.css';

const BLOCK_TYPE_LABELS = {
  text: 'Текст',
  video: 'Видео',
  image: 'Изображение',
  gallery: 'Галерея',
  link: 'Ссылка',
  homework: 'Д/З',
};

const BLOCK_TYPE_VARIANTS = {
  text: 'primary',
  video: 'danger',
  image: 'success',
  gallery: 'warning',
  link: 'info',
  homework: 'warning',
};

const BlockEditor = ({ blocks, sectionId, onBlocksChange, onSave, saving, uploadImage, hideHomework }) => {
  const [previewMode, setPreviewMode] = useState(false);
  const [activeBlock, setActiveBlock] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require 8px of movement before a drag starts — prevents
        // accidental drags when the user clicks buttons inside a block.
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Генерация уникального ID для блока
  const generateBlockId = () => {
    return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Добавление нового блока
  const handleAddBlock = useCallback(
    (type) => {
      const newBlock = {
        id: generateBlockId(),
        type,
        data: {},
        order: blocks.length,
      };

      const updatedBlocks = [...blocks, newBlock];
      onBlocksChange(updatedBlocks);
    },
    [blocks, onBlocksChange]
  );

  // Обновление блока
  const handleUpdateBlock = useCallback(
    (blockId, updatedBlock) => {
      const updatedBlocks = blocks.map((block) =>
        block.id === blockId ? updatedBlock : block
      );
      onBlocksChange(updatedBlocks);
    },
    [blocks, onBlocksChange]
  );

  // Удаление блока
  const handleDeleteBlock = useCallback(
    (blockId) => {
      if (window.confirm('Удалить этот элемент?')) {
        const updatedBlocks = blocks.filter((block) => block.id !== blockId);
        // Пересчитываем order
        const reorderedBlocks = updatedBlocks.map((block, index) => ({
          ...block,
          order: index,
        }));
        onBlocksChange(reorderedBlocks);
      }
    },
    [blocks, onBlocksChange]
  );

  // DnD — начало перетаскивания: сохраняем активный блок для DragOverlay
  const handleDragStart = useCallback(
    (event) => {
      const { active } = event;
      const found = blocks.find((b) => b.id === active.id);
      setActiveBlock(found || null);
    },
    [blocks]
  );

  // DnD — завершение перетаскивания: переставляем блоки через arrayMove
  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      setActiveBlock(null);

      if (!over || active.id === over.id) return;

      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);

      const reordered = arrayMove(blocks, oldIndex, newIndex).map((block, index) => ({
        ...block,
        order: index,
      }));

      onBlocksChange(reordered);
    },
    [blocks, onBlocksChange]
  );

  const hasChanges = blocks.length > 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
    >
      <div className="block-editor">
        <div className="block-editor-header">
          <h3 className="block-editor-title">
            {previewMode ? 'Предпросмотр' : 'Редактор контента'}
          </h3>
          <div className="block-editor-actions">
            <ButtonGroup>
              <Button
                variant={!previewMode ? 'primary' : 'outline-primary'}
                onClick={() => setPreviewMode(false)}
              >
                ✏️ Редактор
              </Button>
              <Button
                variant={previewMode ? 'primary' : 'outline-primary'}
                onClick={() => setPreviewMode(true)}
              >
                👁 Предпросмотр
              </Button>
            </ButtonGroup>
            {onSave && (
              <Button
                variant="success"
                onClick={onSave}
                disabled={saving || !hasChanges}
              >
                {saving ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                    Сохранение...
                  </>
                ) : (
                  <>💾 Сохранить изменения</>
                )}
              </Button>
            )}
          </div>
        </div>

        {!previewMode ? (
          <>
            <BlockToolbar onAddBlock={handleAddBlock} hideHomework={hideHomework} />
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <BlockList
                blocks={blocks}
                onUpdate={handleUpdateBlock}
                onDelete={handleDeleteBlock}
                sectionId={sectionId}
                uploadImage={uploadImage}
                isDraggingAny={!!activeBlock}
              />
            </SortableContext>
          </>
        ) : (
          <div className="editor-preview-container">
            <BlockPreview blocks={blocks} />
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeBlock ? (
          <div className="block-drag-overlay">
            <div className="drag-handle">☰</div>
            <Badge
              bg={BLOCK_TYPE_VARIANTS[activeBlock.type] || 'secondary'}
              className="block-type-badge"
            >
              {BLOCK_TYPE_LABELS[activeBlock.type] || activeBlock.type}
            </Badge>
            {activeBlock.title && (
              <span className="drag-overlay-title ms-2 text-muted small">
                {activeBlock.title}
              </span>
            )}
            <span className="ms-auto text-muted small">Перетащите в нужное место</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default BlockEditor;
