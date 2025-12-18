# Руководство по интеграции BlockEditor

## Шаг 1: Проверка установки пакетов

Все необходимые пакеты уже установлены:

```bash
✓ @tiptap/react@3.13.0
✓ @tiptap/starter-kit
✓ @tiptap/extension-link
✓ @tiptap/extension-image
✓ @tiptap/extension-placeholder
✓ react-dnd@16.0.1
✓ react-dnd-html5-backend
```

## Шаг 2: Структура файлов

Все файлы созданы в `src/components/BlockEditor/`:

```
BlockEditor/
├── index.js                      ✓ Создан
├── BlockEditor.js                ✓ Создан
├── BlockEditor.css               ✓ Создан
├── BlockList.js                  ✓ Создан
├── BlockItem.js                  ✓ Создан
├── BlockToolbar.js               ✓ Создан
├── blocks/
│   ├── TextBlock.js              ✓ Создан
│   ├── VideoBlock.js             ✓ Создан
│   ├── ImageBlock.js             ✓ Создан
│   ├── LinkBlock.js              ✓ Создан
│   └── HomeworkBlock.js          ✓ Создан
├── preview/
│   └── BlockPreview.js           ✓ Создан
├── utils/
│   └── videoUtils.js             ✓ Создан
├── README.md                     ✓ Создан
├── USAGE_EXAMPLE.md              ✓ Создан
└── INTEGRATION_GUIDE.md          ✓ Создан (этот файл)
```

## Шаг 3: Обновление API сервиса

API сервис `src/services/api.js` обновлен с добавлением методов:

```javascript
// ✓ Добавлено в coursesAPI
uploadImage: (file, sectionId) => Promise
reorderElements: (items) => Promise
```

## Шаг 4: Интеграция в CourseEditor

### Вариант A: Полная замена существующего редактора

Если у вас есть `src/pages/admin/CourseEditor.js`:

```jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import BlockEditor from '../../components/BlockEditor';
import { coursesAPI } from '../../services/api';

function CourseEditor() {
  const { courseId, sectionId } = useParams();
  const [blocks, setBlocks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlocks();
  }, [sectionId]);

  const loadBlocks = async () => {
    if (!sectionId) return;

    setLoading(true);
    try {
      const response = await coursesAPI.getElements(sectionId);
      const formattedBlocks = response.data.map(element => ({
        id: element.id,
        type: element.element_type,
        data: element.data,
        order: element.order
      }));
      setBlocks(formattedBlocks);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      alert('Ошибка при загрузке элементов');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Удаляем старые элементы
      const currentElements = await coursesAPI.getElements(sectionId);
      await Promise.all(
        currentElements.data.map(el => coursesAPI.deleteElement(el.id))
      );

      // Создаем новые
      await Promise.all(
        blocks.map((block, index) =>
          coursesAPI.createElement({
            section: sectionId,
            element_type: block.type,
            data: block.data,
            order: index
          })
        )
      );

      alert('Изменения сохранены!');
      await loadBlocks(); // Перезагрузка с сервера
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Загрузка...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <BlockEditor
        blocks={blocks}
        sectionId={sectionId}
        onBlocksChange={setBlocks}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

export default CourseEditor;
```

### Вариант B: Добавление в существующий компонент

Если у вас уже есть страница редактирования курса:

```jsx
import BlockEditor from '../../components/BlockEditor';

// В вашем компоненте:
<Tab eventKey="content" title="Контент">
  <BlockEditor
    blocks={currentSectionBlocks}
    sectionId={currentSectionId}
    onBlocksChange={setCurrentSectionBlocks}
    onSave={handleSaveBlocks}
    saving={savingBlocks}
  />
</Tab>
```

## Шаг 5: Добавление маршрута (если нужно)

В `src/App.js` или вашем роутере:

```jsx
import CourseEditor from './pages/admin/CourseEditor';

// В Routes:
<Route path="/admin/courses/:courseId/section/:sectionId/edit" element={<CourseEditor />} />
```

## Шаг 6: Тестирование

### Базовый тест
1. Откройте страницу редактора курса
2. Добавьте текстовый блок через панель инструментов
3. Введите текст и используйте форматирование
4. Добавьте видео блок с YouTube URL
5. Попробуйте drag & drop для изменения порядка
6. Переключитесь в режим предпросмотра
7. Сохраните изменения

### Тест загрузки изображений
1. Добавьте блок изображения
2. Перетащите файл или нажмите для выбора
3. Заполните alt текст и подпись
4. Проверьте preview

### Тест домашнего задания
1. Добавьте блок ДЗ
2. Заполните описание
3. Установите дедлайн
4. Выберите форматы файлов
5. Проверьте preview конфигурации

## Шаг 7: Backend интеграция (требуется)

Убедитесь, что на backend есть endpoints:

```python
# apps/courses/views.py

# Загрузка изображения
POST /api/elements/upload_image/
- Принимает: multipart/form-data с полями 'image' и 'section_id'
- Возвращает: { "url": "/media/uploads/..." }

# Изменение порядка элементов (опционально)
POST /api/elements/reorder/
- Принимает: { "items": [{ "id": 1, "order": 0 }, ...] }
- Возвращает: { "success": true }
```

Если этих endpoints нет, нужно будет их создать на backend.

## Шаг 8: Возможные проблемы и решения

### Проблема: Ошибка при загрузке изображения

**Решение:** Проверьте CORS настройки и endpoint `/api/elements/upload_image/`

### Проблема: Drag & Drop не работает

**Решение:** Убедитесь, что `DndProvider` обернут правильно и используется `HTML5Backend`

### Проблема: Стили не применяются

**Решение:** Убедитесь, что `BlockEditor.css` импортируется в `BlockEditor.js`

### Проблема: Видео не встраивается

**Решение:** Проверьте, что URL валидный YouTube или Vimeo. Используйте полный URL.

## Шаг 9: Кастомизация (опционально)

### Изменение цветов

В `BlockEditor.css` можно изменить:

```css
/* Цвет primary */
.block-item.drop-target {
  border: 2px dashed #YOUR_COLOR;
}

/* Цвет активной кнопки в toolbar */
.editor-toolbar button.is-active {
  background: #YOUR_COLOR;
}
```

### Добавление нового типа блока

1. Создайте новый компонент в `blocks/YourBlock.js`
2. Добавьте в `BlockToolbar.js` в массив `blockTypes`
3. Добавьте в `BlockItem.js` в switch case `renderBlockContent`
4. Добавьте в `BlockPreview.js` в switch case `renderBlock`

## Шаг 10: Production готовность

Перед деплоем:

1. Проверьте все console.log и удалите ненужные
2. Добавьте error boundaries
3. Оптимизируйте изображения
4. Протестируйте на разных браузерах
5. Проверьте mobile версию
6. Настройте CDN для медиа файлов

## Готово!

BlockEditor полностью интегрирован и готов к использованию.

Для вопросов и примеров смотрите:
- `README.md` - Общая документация
- `USAGE_EXAMPLE.md` - Примеры кода
- `INTEGRATION_GUIDE.md` - Это руководство
