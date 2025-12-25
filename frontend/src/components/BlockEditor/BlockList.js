import React from 'react';
import BlockItem from './BlockItem';

const BlockList = ({ blocks, onUpdate, onDelete, onMove, sectionId, uploadImage }) => {
  if (!blocks || blocks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📦</div>
        <h3>Нет элементов</h3>
        <p>Добавьте первый элемент, используя кнопку выше</p>
      </div>
    );
  }

  return (
    <div className="block-list">
      {blocks.map((block, index) => (
        <BlockItem
          key={block.id}
          block={block}
          index={index}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onMove={onMove}
          sectionId={sectionId}
          uploadImage={uploadImage}
        />
      ))}
    </div>
  );
};

export default BlockList;
