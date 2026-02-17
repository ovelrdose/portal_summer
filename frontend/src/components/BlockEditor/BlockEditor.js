import React, { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button, ButtonGroup } from 'react-bootstrap';
import BlockToolbar from './BlockToolbar';
import BlockList from './BlockList';
import BlockPreview from './preview/BlockPreview';
import './BlockEditor.css';

const BlockEditor = ({ blocks, sectionId, onBlocksChange, onSave, saving, uploadImage, hideHomework }) => {
  const [previewMode, setPreviewMode] = useState(false);

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

  // Перемещение блока (DnD)
  const handleMoveBlock = useCallback(
    (fromIndex, toIndex) => {
      const updatedBlocks = [...blocks];
      const [movedBlock] = updatedBlocks.splice(fromIndex, 1);
      updatedBlocks.splice(toIndex, 0, movedBlock);

      // Обновляем order
      const reorderedBlocks = updatedBlocks.map((block, index) => ({
        ...block,
        order: index,
      }));

      onBlocksChange(reorderedBlocks);
    },
    [blocks, onBlocksChange]
  );

  const hasChanges = blocks.length > 0;

  return (
    <DndProvider backend={HTML5Backend}>
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
            <BlockList
              blocks={blocks}
              onUpdate={handleUpdateBlock}
              onDelete={handleDeleteBlock}
              onMove={handleMoveBlock}
              sectionId={sectionId}
              uploadImage={uploadImage}
            />
          </>
        ) : (
          <div className="editor-preview-container">
            <BlockPreview blocks={blocks} />
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default BlockEditor;
