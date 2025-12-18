# BlockEditor - Быстрый старт

## Что реализовано

Блочный редактор контента для образовательного портала с 5 типами блоков:

1. **Текст** - WYSIWYG редактор (Tiptap)
2. **Видео** - YouTube/Vimeo
3. **Изображение** - Загрузка файлов
4. **Ссылка** - Внешние ссылки
5. **Домашнее задание** - Конфигурация заданий

## Возможности

- Drag & Drop для изменения порядка блоков
- Режим предпросмотра
- Валидация данных
- Responsive дизайн
- Bootstrap 5 интеграция

## Быстрая проверка

### 1. Запустить демо

```jsx
// В App.js или вашем роутере
import BlockEditorDemo from './components/BlockEditor/BlockEditorDemo';

<Route path="/demo/block-editor" element={<BlockEditorDemo />} />
```

Откройте: `http://localhost:3000/demo/block-editor`

### 2. Базовое использование

```jsx
import React, { useState } from 'react';
import BlockEditor from './components/BlockEditor';

function MyComponent() {
  const [blocks, setBlocks] = useState([]);

  return (
    <BlockEditor
      blocks={blocks}
      onBlocksChange={setBlocks}
    />
  );
}
```

### 3. С сохранением

```jsx
import { coursesAPI } from './services/api';

const [saving, setSaving] = useState(false);

const handleSave = async () => {
  setSaving(true);
  try {
    // Ваша логика сохранения
    await coursesAPI.updateSection(sectionId, { content_elements: blocks });
    alert('Сохранено!');
  } catch (error) {
    console.error(error);
  } finally {
    setSaving(false);
  }
};

<BlockEditor
  blocks={blocks}
  sectionId={123}
  onBlocksChange={setBlocks}
  onSave={handleSave}
  saving={saving}
/>
```

## Структура файлов

```
frontend/src/components/BlockEditor/
├── BlockEditor.js              - Главный компонент
├── BlockEditor.css             - Стили
├── blocks/                     - Типы блоков
│   ├── TextBlock.js
│   ├── VideoBlock.js
│   ├── ImageBlock.js
│   ├── LinkBlock.js
│   └── HomeworkBlock.js
├── preview/BlockPreview.js     - Предпросмотр
└── utils/videoUtils.js         - Утилиты
```

## Документация

Подробная документация в директории `src/components/BlockEditor/`:

- **README.md** - Основная документация
- **INTEGRATION_GUIDE.md** - Пошаговая интеграция
- **USAGE_EXAMPLE.md** - Примеры кода
- **ARCHITECTURE.md** - Архитектура
- **CHECKLIST.md** - Checklist
- **FILES_SUMMARY.md** - Сводка файлов

## Backend требования

Для работы загрузки изображений необходим endpoint:

```python
POST /api/elements/upload_image/
Content-Type: multipart/form-data
Fields: image (file), section_id (optional)
Response: { "url": "/media/uploads/..." }
```

## Установленные пакеты

```bash
@tiptap/react@3.13.0
@tiptap/starter-kit
@tiptap/extension-link
@tiptap/extension-image
@tiptap/extension-placeholder
react-dnd@16.0.1
react-dnd-html5-backend
```

## Статус

**Готово к использованию**

- Все компоненты реализованы
- Стили применены
- Документация написана
- Build успешен
- Требуется только backend endpoint и интеграция

## Интеграция в CourseEditor

Пример в `src/components/BlockEditor/INTEGRATION_GUIDE.md` (Step 4)

Быстрый вариант:

```jsx
// В CourseEditor.js
import BlockEditor from '../../components/BlockEditor';

// Внутри компонента
<BlockEditor
  blocks={currentSectionBlocks}
  sectionId={currentSectionId}
  onBlocksChange={setCurrentSectionBlocks}
  onSave={handleSaveBlocks}
  saving={savingBlocks}
/>
```

## Проблемы?

1. Смотрите `INTEGRATION_GUIDE.md` Step 8 "Возможные проблемы"
2. Проверьте console на ошибки
3. Убедитесь что все пакеты установлены: `npm list @tiptap/react react-dnd`

## Файлы для ознакомления

Рекомендуемый порядок чтения:

1. `frontend/BLOCK_EDITOR_SUMMARY.md` - общая сводка
2. `src/components/BlockEditor/README.md` - основы
3. `src/components/BlockEditor/INTEGRATION_GUIDE.md` - интеграция
4. `src/components/BlockEditor/USAGE_EXAMPLE.md` - примеры
5. `src/components/BlockEditor/ARCHITECTURE.md` - детали

## Контакты

Все файлы содержат подробные комментарии.
Для дополнительной помощи см. документацию выше.
