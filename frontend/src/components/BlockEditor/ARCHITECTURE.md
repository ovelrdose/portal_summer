# Архитектура BlockEditor

## Визуальная структура компонентов

```
┌─────────────────────────────────────────────────────────┐
│                    BlockEditor.js                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │           BlockEditor Header                       │  │
│  │  [Редактор|Предпросмотр]  [Сохранить изменения]  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │           BlockToolbar.js                          │  │
│  │  Добавить блок: [Dropdown ▼]                       │  │
│  │    ├─ 📝 Текст                                     │  │
│  │    ├─ 🎥 Видео                                     │  │
│  │    ├─ 🖼 Изображение                               │  │
│  │    ├─ 🔗 Ссылка                                    │  │
│  │    └─ 📋 Домашнее задание                          │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │           BlockList.js                             │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │         BlockItem.js (#1)                    │  │  │
│  │  │  [☰] [Text] ..................... [🗑]      │  │  │
│  │  │  ┌───────────────────────────────────────┐  │  │  │
│  │  │  │      TextBlock.js (Tiptap)            │  │  │  │
│  │  │  │  [B][I][H2][H3][•][1.]["]           │  │  │  │
│  │  │  │  ┌─────────────────────────────────┐  │  │  │  │
│  │  │  │  │ Content here...                 │  │  │  │  │
│  │  │  │  └─────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │         BlockItem.js (#2)                    │  │  │
│  │  │  [☰] [Video] .................... [🗑]      │  │  │
│  │  │  ┌───────────────────────────────────────┐  │  │  │
│  │  │  │      VideoBlock.js                    │  │  │  │
│  │  │  │  Title: [____________]                │  │  │  │
│  │  │  │  URL:   [____________]                │  │  │  │
│  │  │  │  ┌─────────────────────────────────┐  │  │  │  │
│  │  │  │  │   [YouTube/Vimeo iframe]        │  │  │  │  │
│  │  │  │  └─────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │         BlockItem.js (#3)                    │  │  │
│  │  │  [☰] [Image] .................... [🗑]      │  │  │
│  │  │  ┌───────────────────────────────────────┐  │  │  │
│  │  │  │      ImageBlock.js                    │  │  │  │
│  │  │  │  ┌─────────────────────────────────┐  │  │  │  │
│  │  │  │  │   [Upload area or preview]      │  │  │  │  │
│  │  │  │  └─────────────────────────────────┘  │  │  │  │
│  │  │  │  Alt:     [____________]              │  │  │  │
│  │  │  │  Caption: [____________]              │  │  │  │
│  │  │  └───────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Поток данных

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │ Взаимодействие
       ▼
┌──────────────────────────┐
│    BlockEditor           │
│  state: blocks[]         │
│  state: previewMode      │
└────┬─────────────────┬───┘
     │                 │
     │ Добавить блок   │ Изменить порядок (DnD)
     ▼                 ▼
┌────────────┐    ┌──────────────┐
│ BlockList  │◄───│  BlockItem   │
└────┬───────┘    └──────┬───────┘
     │                   │
     │ Рендеринг         │ onChange
     ▼                   ▼
┌───────────────────────────────┐
│  Конкретный тип блока         │
│  - TextBlock                  │
│  - VideoBlock                 │
│  - ImageBlock                 │
│  - LinkBlock                  │
│  - HomeworkBlock              │
└───────────┬───────────────────┘
            │
            │ onChange(newData)
            ▼
┌───────────────────────────────┐
│  onBlocksChange(updatedBlocks)│
└───────────────────────────────┘
            │
            ▼
┌───────────────────────────────┐
│  Parent Component             │
│  (CourseEditor)               │
└───────────────────────────────┘
```

## State Management

### BlockEditor (главный компонент)
```javascript
State:
  - previewMode: boolean

Props:
  - blocks: Block[]
  - sectionId: number
  - onBlocksChange: (blocks) => void
  - onSave: () => void
  - saving: boolean

Methods:
  - handleAddBlock(type)
  - handleUpdateBlock(id, data)
  - handleDeleteBlock(id)
  - handleMoveBlock(from, to)
```

### BlockList
```javascript
Props:
  - blocks: Block[]
  - onUpdate: (id, block) => void
  - onDelete: (id) => void
  - onMove: (from, to) => void
  - sectionId: number

Render:
  - Карта блоков → BlockItem[]
```

### BlockItem
```javascript
Props:
  - block: Block
  - index: number
  - onUpdate: (id, block) => void
  - onDelete: (id) => void
  - onMove: (from, to) => void
  - sectionId: number

Hooks:
  - useDrag(): для drag & drop
  - useDrop(): для drop zone

Render:
  - Header: drag handle, badge, delete
  - Content: соответствующий компонент блока
```

### Конкретные блоки

#### TextBlock
```javascript
Props:
  - data: { html, json }
  - onChange: (data) => void

State:
  - editor: Tiptap instance

Methods:
  - Toolbar actions (bold, italic, etc.)
  - onUpdate → onChange({ html, json })
```

#### VideoBlock
```javascript
Props:
  - data: { url, title, provider, videoId }
  - onChange: (data) => void

State:
  - url: string
  - title: string
  - error: string

Methods:
  - handleUrlChange (+ validation)
  - handleTitleChange
```

#### ImageBlock
```javascript
Props:
  - data: { url, alt, caption, filename }
  - onChange: (data) => void
  - sectionId: number

State:
  - uploading: boolean
  - error: string
  - dragOver: boolean

Methods:
  - handleFileSelect
  - handleDrop
  - handleAltChange
  - handleCaptionChange
  - API: coursesAPI.uploadImage()
```

#### LinkBlock
```javascript
Props:
  - data: { url, text, openInNewTab }
  - onChange: (data) => void

State:
  - url: string
  - text: string
  - openInNewTab: boolean
  - error: string

Methods:
  - validateUrl
  - handleUrlChange
  - handleTextChange
  - handleCheckboxChange
```

#### HomeworkBlock
```javascript
Props:
  - data: { description, deadline, allowedFormats, maxFileSize }
  - onChange: (data) => void

State:
  - description: string
  - deadline: string
  - allowedFormats: string[]
  - maxFileSize: number

Methods:
  - handleDescriptionChange
  - handleDeadlineChange
  - handleFormatToggle
  - handleMaxFileSizeChange
```

## Utilities

### videoUtils.js
```javascript
parseVideoUrl(url: string): { provider, videoId } | null
getEmbedUrl(provider: string, videoId: string): string
isValidVideoUrl(url: string): boolean
```

## API Integration

### coursesAPI методы

```javascript
// Загрузка изображения
uploadImage(file: File, sectionId?: number): Promise<{ url: string }>

// Изменение порядка (опционально)
reorderElements(items: { id, order }[]): Promise<{ success: boolean }>
```

## React DnD Integration

```javascript
<DndProvider backend={HTML5Backend}>
  <BlockEditor>
    {blocks.map(block => (
      <BlockItem
        useDrag={...}  // Позволяет перетаскивание
        useDrop={...}  // Обрабатывает drop
      />
    ))}
  </BlockEditor>
</DndProvider>
```

## Tiptap Integration

```javascript
useEditor({
  extensions: [
    StarterKit,           // Базовые расширения
    Link,                 // Ссылки
    Image,                // Изображения
    Placeholder,          // Placeholder текст
  ],
  content: data?.html,
  onUpdate: ({ editor }) => {
    onChange({
      html: editor.getHTML(),
      json: editor.getJSON()
    });
  }
})
```

## Стилизация

### CSS классы

```css
/* Главный контейнер */
.block-editor

/* Элементы блока */
.block-item
.block-item.dragging      /* При перетаскивании */
.block-item.drop-target   /* При hover drop zone */

/* Drag handle */
.drag-handle

/* Toolbar */
.block-toolbar
.editor-toolbar
.editor-toolbar button
.editor-toolbar button.is-active

/* Tiptap */
.editor-content
.ProseMirror

/* Upload */
.upload-area
.upload-area.dragging

/* Preview */
.block-preview
.preview-text
.preview-video
.preview-image
.preview-link
.preview-homework
```

## Жизненный цикл блока

```
1. User clicks "Add Block" → BlockToolbar
2. handleAddBlock(type) → BlockEditor
3. Create new block with generateBlockId()
4. blocks.push(newBlock)
5. onBlocksChange(updatedBlocks) → Parent
6. Parent updates state
7. Re-render BlockList
8. BlockItem renders appropriate block component
9. User edits → onChange in block component
10. handleUpdateBlock → BlockEditor
11. Update blocks array
12. onBlocksChange → Parent
13. User clicks Save → onSave() → Parent
14. Parent sends to API
```

## Error Handling

```javascript
// ImageBlock
try {
  await coursesAPI.uploadImage(file, sectionId);
} catch (error) {
  setError(error.response?.data?.error || 'Upload failed');
}

// VideoBlock
if (!isValidVideoUrl(url)) {
  setError('Invalid YouTube/Vimeo URL');
}

// LinkBlock
if (!validateUrl(url)) {
  setError('Invalid URL format');
}
```

## Performance Optimizations

1. useCallback для handlers в BlockEditor
2. Memo для BlockItem (при необходимости)
3. Lazy loading для preview iframe
4. Debounce для text editor onChange
5. Image optimization перед upload

## Accessibility

- Semantic HTML (button, label, input)
- ARIA labels на toolbar кнопках
- Keyboard navigation в редакторе
- Alt текст для изображений
- Focus management
- Screen reader friendly

## Responsive Behavior

```css
@media (max-width: 768px) {
  /* Stack header vertically */
  .block-editor-header { flex-direction: column; }

  /* Reduce toolbar button size */
  .editor-toolbar button { padding: 5px 10px; }

  /* Adjust iframe height */
  .video-preview iframe { height: 250px; }
}
```
