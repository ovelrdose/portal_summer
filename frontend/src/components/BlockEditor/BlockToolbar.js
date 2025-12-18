import React from 'react';
import { Dropdown } from 'react-bootstrap';

const BlockToolbar = ({ onAddBlock }) => {
  const blockTypes = [
    {
      type: 'text',
      label: 'Текст',
      icon: '📝',
      description: 'Форматированный текст',
    },
    {
      type: 'video',
      label: 'Видео',
      icon: '🎥',
      description: 'YouTube или Vimeo',
    },
    {
      type: 'image',
      label: 'Изображение',
      icon: '🖼',
      description: 'Загрузить картинку',
    },
    {
      type: 'link',
      label: 'Ссылка',
      icon: '🔗',
      description: 'Внешняя ссылка',
    },
    {
      type: 'homework',
      label: 'Домашнее задание',
      icon: '📋',
      description: 'Задание для студентов',
    },
  ];

  return (
    <div className="block-toolbar">
      <div className="d-flex align-items-center justify-content-between">
        <h6 className="mb-0">Добавить блок:</h6>
        <Dropdown>
          <Dropdown.Toggle variant="primary" id="add-block-dropdown">
            <span style={{ marginRight: '8px' }}>➕</span>
            Добавить элемент
          </Dropdown.Toggle>

          <Dropdown.Menu>
            {blockTypes.map((blockType) => (
              <Dropdown.Item
                key={blockType.type}
                onClick={() => onAddBlock(blockType.type)}
              >
                <div className="block-type-item">
                  <span className="block-type-icon">{blockType.icon}</span>
                  <div>
                    <strong>{blockType.label}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                      {blockType.description}
                    </div>
                  </div>
                </div>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </div>
  );
};

export default BlockToolbar;
