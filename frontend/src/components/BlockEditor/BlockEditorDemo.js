import React, { useState } from 'react';
import BlockEditor from './BlockEditor';

/**
 * Демо компонент для тестирования BlockEditor
 * Использование: import BlockEditorDemo from './components/BlockEditor/BlockEditorDemo'
 */
const BlockEditorDemo = () => {
  const [blocks, setBlocks] = useState([
    {
      id: 'demo-1',
      type: 'text',
      data: {
        html: '<h2>Добро пожаловать в BlockEditor!</h2><p>Это демонстрация блочного редактора с предзагруженным контентом.</p>',
        json: {}
      },
      order: 0
    },
    {
      id: 'demo-2',
      type: 'video',
      data: {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Пример видео',
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ'
      },
      order: 1
    }
  ]);

  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);

    // Имитация сохранения на сервер
    setTimeout(() => {
      alert('Блоки сохранены!');
      setSaving(false);
    }, 1500);
  };

  const handleBlocksChange = (newBlocks) => {
    setBlocks(newBlocks);
  };

  return (
    <div className="container mt-5">
      <div className="mb-4">
        <h1>BlockEditor - Демонстрация</h1>
        <p className="text-muted">
          Тестовая страница для проверки функционала блочного редактора
        </p>
      </div>

      <BlockEditor
        blocks={blocks}
        sectionId={999}
        onBlocksChange={handleBlocksChange}
        onSave={handleSave}
        saving={saving}
      />

      <div className="mt-4 p-3 bg-light border rounded">
        <h5>Состояние блоков (для отладки):</h5>
        <pre style={{ maxHeight: '300px', overflow: 'auto' }}>
          {JSON.stringify(blocks, null, 2)}
        </pre>
      </div>

      <div className="mt-3 alert alert-info">
        <h6>Инструкции по тестированию:</h6>
        <ol className="mb-0">
          <li>Попробуйте добавить разные типы блоков через кнопку "Добавить элемент"</li>
          <li>Используйте drag & drop (иконка ☰) для изменения порядка</li>
          <li>Переключайтесь между режимами "Редактор" и "Предпросмотр"</li>
          <li>Нажмите "Сохранить изменения" для имитации сохранения</li>
          <li>Проверьте JSON вывод блоков внизу страницы</li>
        </ol>
      </div>
    </div>
  );
};

export default BlockEditorDemo;
