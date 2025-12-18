# Пример использования BlockEditor

## Базовое использование

```jsx
import React, { useState } from 'react';
import BlockEditor from './components/BlockEditor';

function MyComponent() {
  const [blocks, setBlocks] = useState([]);
  const [saving, setSaving] = useState(false);
  const sectionId = 123; // ID текущей секции курса

  const handleSave = async () => {
    setSaving(true);
    try {
      // Сохранение блоков на сервер
      await coursesAPI.updateSection(sectionId, {
        content_elements: blocks
      });
      alert('Изменения сохранены!');
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BlockEditor
      blocks={blocks}
      sectionId={sectionId}
      onBlocksChange={setBlocks}
      onSave={handleSave}
      saving={saving}
    />
  );
}
```

## Интеграция в CourseEditor.js

```jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import BlockEditor from '../../components/BlockEditor';
import { coursesAPI } from '../../services/api';

function CourseEditor() {
  const { courseId } = useParams();
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [saving, setSaving] = useState(false);

  // Загрузка секций
  useEffect(() => {
    if (courseId) {
      loadSections();
    }
  }, [courseId]);

  // Загрузка элементов активной секции
  useEffect(() => {
    if (activeSection) {
      loadBlocks(activeSection.id);
    }
  }, [activeSection]);

  const loadSections = async () => {
    try {
      const response = await coursesAPI.getSections(courseId);
      setSections(response.data);
      if (response.data.length > 0) {
        setActiveSection(response.data[0]);
      }
    } catch (error) {
      console.error('Ошибка загрузки секций:', error);
    }
  };

  const loadBlocks = async (sectionId) => {
    try {
      const response = await coursesAPI.getElements(sectionId);
      // Преобразуем элементы API в формат блоков
      const formattedBlocks = response.data.map(element => ({
        id: element.id,
        type: element.element_type,
        data: element.data,
        order: element.order
      }));
      setBlocks(formattedBlocks);
    } catch (error) {
      console.error('Ошибка загрузки элементов:', error);
    }
  };

  const handleSave = async () => {
    if (!activeSection) return;

    setSaving(true);
    try {
      // Удаляем старые элементы
      const currentElements = await coursesAPI.getElements(activeSection.id);
      for (const element of currentElements.data) {
        await coursesAPI.deleteElement(element.id);
      }

      // Создаем новые элементы
      for (const block of blocks) {
        await coursesAPI.createElement({
          section: activeSection.id,
          element_type: block.type,
          data: block.data,
          order: block.order
        });
      }

      alert('Изменения успешно сохранены!');
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      alert('Ошибка при сохранении изменений');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Редактор курса</h2>

      {/* Выбор секции */}
      <div className="mb-4">
        <label>Секция:</label>
        <select
          className="form-select"
          value={activeSection?.id || ''}
          onChange={(e) => {
            const section = sections.find(s => s.id === parseInt(e.target.value));
            setActiveSection(section);
          }}
        >
          {sections.map(section => (
            <option key={section.id} value={section.id}>
              {section.title}
            </option>
          ))}
        </select>
      </div>

      {/* Блочный редактор */}
      {activeSection && (
        <BlockEditor
          blocks={blocks}
          sectionId={activeSection.id}
          onBlocksChange={setBlocks}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}

export default CourseEditor;
```

## Структура данных блоков

```javascript
// Блок текста
{
  id: 'block-123',
  type: 'text',
  data: {
    html: '<p>Formatted text...</p>',
    json: { /* Tiptap JSON */ }
  },
  order: 0
}

// Блок видео
{
  id: 'block-124',
  type: 'video',
  data: {
    url: 'https://www.youtube.com/watch?v=...',
    title: 'Название видео',
    provider: 'youtube',
    videoId: 'abc123'
  },
  order: 1
}

// Блок изображения
{
  id: 'block-125',
  type: 'image',
  data: {
    url: '/media/uploads/image.jpg',
    alt: 'Описание',
    caption: 'Подпись к изображению',
    filename: 'image.jpg'
  },
  order: 2
}

// Блок ссылки
{
  id: 'block-126',
  type: 'link',
  data: {
    url: 'https://example.com',
    text: 'Текст ссылки',
    openInNewTab: true
  },
  order: 3
}

// Блок домашнего задания
{
  id: 'block-127',
  type: 'homework',
  data: {
    description: 'Описание задания...',
    deadline: '2025-12-31T23:59',
    allowedFormats: ['pdf', 'doc', 'image'],
    maxFileSize: 10
  },
  order: 4
}
```

## Props компонента BlockEditor

- **blocks** (array, required): Массив блоков
- **sectionId** (number, optional): ID секции для привязки загружаемых изображений
- **onBlocksChange** (function, required): Callback при изменении блоков
- **onSave** (function, optional): Callback при нажатии кнопки "Сохранить"
- **saving** (boolean, optional): Флаг процесса сохранения

## Доступные типы блоков

1. **text** - Форматированный текст (Tiptap WYSIWYG)
2. **video** - Видео с YouTube/Vimeo
3. **image** - Загрузка изображений
4. **link** - Внешние ссылки
5. **homework** - Домашние задания

## Особенности

- Drag & Drop для изменения порядка блоков
- Режим предпросмотра
- Валидация URL для видео и ссылок
- Загрузка изображений с preview
- Автоматическое сохранение порядка блоков
- Responsive дизайн
