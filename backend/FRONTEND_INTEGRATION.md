# Frontend Integration Guide

Руководство по интеграции блочного редактора на фронтенде (React).

## Структура данных

### ContentElement Response Format

```typescript
interface ContentElement {
    id: number;
    section: number;
    content_type: 'text' | 'video' | 'image' | 'link' | 'homework';
    title: string;
    data: BlockData;
    order: number;
    is_published: boolean;
}

type BlockData =
    | TextBlockData
    | VideoBlockData
    | ImageBlockData
    | LinkBlockData
    | HomeworkBlockData;

interface TextBlockData {
    version: 1;
    type: 'text';
    html: string;
}

interface VideoBlockData {
    version: 1;
    type: 'video';
    url: string;
    provider: 'youtube' | 'vimeo';
    video_id: string;
}

interface ImageBlockData {
    version: 1;
    type: 'image';
    url: string;
    alt: string;
    caption?: string;
}

interface LinkBlockData {
    version: 1;
    type: 'link';
    url: string;
    text: string;
    open_in_new_tab: boolean;
}

interface HomeworkBlockData {
    version: 1;
    type: 'homework';
    description: string;
    deadline: string | null;
    max_file_size_mb: number;
    allowed_extensions: string[];
}
```

## API Service для React

### api/contentElements.js

```javascript
import api from './api';  // Ваш axios instance с токеном

export const contentElementsAPI = {
    // Получить все элементы секции
    getBySection: (sectionId) => {
        return api.get(`/content-elements/?section=${sectionId}`);
    },

    // Получить один элемент
    get: (id) => {
        return api.get(`/content-elements/${id}/`);
    },

    // Создать элемент
    create: (data) => {
        return api.post('/content-elements/', data);
    },

    // Обновить элемент
    update: (id, data) => {
        return api.put(`/content-elements/${id}/`, data);
    },

    // Частичное обновление
    patch: (id, data) => {
        return api.patch(`/content-elements/${id}/`, data);
    },

    // Удалить элемент
    delete: (id) => {
        return api.delete(`/content-elements/${id}/`);
    },

    // Загрузить изображение
    uploadImage: (file) => {
        const formData = new FormData();
        formData.append('image', file);

        return api.post('/content-elements/upload_image/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    // Изменить порядок элементов
    reorder: (items) => {
        return api.post('/content-elements/reorder/', { items });
    }
};
```

## React компоненты

### BlockRenderer.jsx - Рендер блоков

```jsx
import React from 'react';
import DOMPurify from 'dompurify';

const BlockRenderer = ({ element }) => {
    const { content_type, title, data } = element;

    const renderBlock = () => {
        switch (content_type) {
            case 'text':
                return <TextBlock title={title} data={data} />;
            case 'video':
                return <VideoBlock title={title} data={data} />;
            case 'image':
                return <ImageBlock title={title} data={data} />;
            case 'link':
                return <LinkBlock title={title} data={data} />;
            case 'homework':
                return <HomeworkBlock title={title} data={data} />;
            default:
                return <div>Неизвестный тип блока</div>;
        }
    };

    return (
        <div className="content-block mb-4">
            {renderBlock()}
        </div>
    );
};

const TextBlock = ({ title, data }) => {
    const sanitizedHtml = DOMPurify.sanitize(data.html);

    return (
        <div className="text-block">
            {title && <h4>{title}</h4>}
            <div
                className="content"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
        </div>
    );
};

const VideoBlock = ({ title, data }) => {
    const getEmbedUrl = () => {
        if (data.provider === 'youtube') {
            return `https://www.youtube.com/embed/${data.video_id}`;
        } else if (data.provider === 'vimeo') {
            return `https://player.vimeo.com/video/${data.video_id}`;
        }
        return '';
    };

    return (
        <div className="video-block">
            {title && <h4>{title}</h4>}
            <div className="ratio ratio-16x9">
                <iframe
                    src={getEmbedUrl()}
                    title={title}
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
            </div>
        </div>
    );
};

const ImageBlock = ({ title, data }) => {
    return (
        <div className="image-block text-center">
            {title && <h4>{title}</h4>}
            <img
                src={data.url}
                alt={data.alt}
                className="img-fluid"
            />
            {data.caption && (
                <p className="text-muted mt-2">
                    <small>{data.caption}</small>
                </p>
            )}
        </div>
    );
};

const LinkBlock = ({ title, data }) => {
    return (
        <div className="link-block">
            {title && <h5>{title}</h5>}
            <a
                href={data.url}
                target={data.open_in_new_tab ? '_blank' : '_self'}
                rel={data.open_in_new_tab ? 'noopener noreferrer' : ''}
                className="btn btn-outline-primary"
            >
                {data.text || 'Перейти по ссылке'}
                {data.open_in_new_tab && (
                    <i className="bi bi-box-arrow-up-right ms-2"></i>
                )}
            </a>
        </div>
    );
};

const HomeworkBlock = ({ title, data }) => {
    const isExpired = data.deadline && new Date(data.deadline) < new Date();

    return (
        <div className="homework-block border rounded p-3 bg-light">
            {title && <h4>{title}</h4>}
            <p>{data.description}</p>

            {data.deadline && (
                <p className={`mb-2 ${isExpired ? 'text-danger' : 'text-muted'}`}>
                    <strong>Срок сдачи:</strong> {new Date(data.deadline).toLocaleString()}
                    {isExpired && ' (Просрочено)'}
                </p>
            )}

            <p className="text-muted mb-2">
                <small>
                    Максимальный размер: {data.max_file_size_mb} МБ
                </small>
            </p>

            <p className="text-muted mb-3">
                <small>
                    Допустимые форматы: {data.allowed_extensions.join(', ')}
                </small>
            </p>

            <button className="btn btn-primary">
                Загрузить работу
            </button>
        </div>
    );
};

export default BlockRenderer;
```

### BlockEditor.jsx - Редактор блоков

```jsx
import React, { useState } from 'react';
import { contentElementsAPI } from '../services/api/contentElements';

const BlockEditor = ({ sectionId, onSuccess }) => {
    const [blockType, setBlockType] = useState('text');
    const [formData, setFormData] = useState({
        title: '',
        data: {}
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload = {
                section: sectionId,
                content_type: blockType,
                title: formData.title,
                data: formData.data,
                order: 0,
                is_published: true
            };

            await contentElementsAPI.create(payload);

            // Сброс формы
            setFormData({ title: '', data: {} });

            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            setError(err.response?.data || 'Ошибка создания блока');
        } finally {
            setLoading(false);
        }
    };

    const renderTypeSpecificFields = () => {
        switch (blockType) {
            case 'text':
                return (
                    <div className="mb-3">
                        <label className="form-label">HTML контент</label>
                        <textarea
                            className="form-control"
                            rows="5"
                            value={formData.data.html || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                data: { ...formData.data, html: e.target.value }
                            })}
                            required
                        />
                    </div>
                );

            case 'video':
                return (
                    <div className="mb-3">
                        <label className="form-label">URL видео (YouTube или Vimeo)</label>
                        <input
                            type="url"
                            className="form-control"
                            value={formData.data.url || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                data: { ...formData.data, url: e.target.value }
                            })}
                            placeholder="https://www.youtube.com/watch?v=..."
                            required
                        />
                    </div>
                );

            case 'image':
                return (
                    <ImageUploadField
                        formData={formData}
                        setFormData={setFormData}
                    />
                );

            case 'link':
                return (
                    <>
                        <div className="mb-3">
                            <label className="form-label">URL</label>
                            <input
                                type="url"
                                className="form-control"
                                value={formData.data.url || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    data: { ...formData.data, url: e.target.value }
                                })}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Текст ссылки</label>
                            <input
                                type="text"
                                className="form-control"
                                value={formData.data.text || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    data: { ...formData.data, text: e.target.value }
                                })}
                                required
                            />
                        </div>
                        <div className="mb-3 form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="openInNewTab"
                                checked={formData.data.open_in_new_tab || false}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    data: { ...formData.data, open_in_new_tab: e.target.checked }
                                })}
                            />
                            <label className="form-check-label" htmlFor="openInNewTab">
                                Открывать в новой вкладке
                            </label>
                        </div>
                    </>
                );

            case 'homework':
                return (
                    <>
                        <div className="mb-3">
                            <label className="form-label">Описание задания</label>
                            <textarea
                                className="form-control"
                                rows="4"
                                value={formData.data.description || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    data: { ...formData.data, description: e.target.value }
                                })}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Дедлайн (опционально)</label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                onChange={(e) => setFormData({
                                    ...formData,
                                    data: {
                                        ...formData.data,
                                        deadline: e.target.value ? new Date(e.target.value).toISOString() : null
                                    }
                                })}
                            />
                        </div>
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <div className="block-editor card p-4">
            <h4>Добавить блок контента</h4>

            {error && (
                <div className="alert alert-danger">
                    {JSON.stringify(error)}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label className="form-label">Тип блока</label>
                    <select
                        className="form-select"
                        value={blockType}
                        onChange={(e) => {
                            setBlockType(e.target.value);
                            setFormData({ title: '', data: {} });
                        }}
                    >
                        <option value="text">Текст</option>
                        <option value="video">Видео</option>
                        <option value="image">Изображение</option>
                        <option value="link">Ссылка</option>
                        <option value="homework">Домашнее задание</option>
                    </select>
                </div>

                <div className="mb-3">
                    <label className="form-label">Заголовок (опционально)</label>
                    <input
                        type="text"
                        className="form-control"
                        value={formData.title}
                        onChange={(e) => setFormData({
                            ...formData,
                            title: e.target.value
                        })}
                    />
                </div>

                {renderTypeSpecificFields()}

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                >
                    {loading ? 'Создание...' : 'Создать блок'}
                </button>
            </form>
        </div>
    );
};

const ImageUploadField = ({ formData, setFormData }) => {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Показываем превью
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Загружаем на сервер
        setUploading(true);
        try {
            const response = await contentElementsAPI.uploadImage(file);
            setFormData({
                ...formData,
                data: {
                    ...formData.data,
                    url: response.data.url,
                    alt: file.name,
                    caption: ''
                }
            });
        } catch (error) {
            alert('Ошибка загрузки изображения: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <div className="mb-3">
                <label className="form-label">Изображение</label>
                <input
                    type="file"
                    className="form-control"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileChange}
                    disabled={uploading}
                    required
                />
                {uploading && <small className="text-muted">Загрузка...</small>}
            </div>

            {preview && (
                <div className="mb-3">
                    <img src={preview} alt="Preview" className="img-thumbnail" style={{ maxHeight: '200px' }} />
                </div>
            )}

            <div className="mb-3">
                <label className="form-label">Alt текст</label>
                <input
                    type="text"
                    className="form-control"
                    value={formData.data.alt || ''}
                    onChange={(e) => setFormData({
                        ...formData,
                        data: { ...formData.data, alt: e.target.value }
                    })}
                    required
                />
            </div>

            <div className="mb-3">
                <label className="form-label">Подпись (опционально)</label>
                <input
                    type="text"
                    className="form-control"
                    value={formData.data.caption || ''}
                    onChange={(e) => setFormData({
                        ...formData,
                        data: { ...formData.data, caption: e.target.value }
                    })}
                />
            </div>
        </>
    );
};

export default BlockEditor;
```

### DragDropReorder.jsx - Drag & Drop для изменения порядка

```jsx
import React, { useState, useEffect } from 'react';
import { contentElementsAPI } from '../services/api/contentElements';

const DragDropReorder = ({ sectionId }) => {
    const [elements, setElements] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);

    useEffect(() => {
        loadElements();
    }, [sectionId]);

    const loadElements = async () => {
        const response = await contentElementsAPI.getBySection(sectionId);
        setElements(response.data);
    };

    const handleDragStart = (e, index) => {
        setDraggedItem(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();

        if (draggedItem === null || draggedItem === index) return;

        const newElements = [...elements];
        const draggedElement = newElements[draggedItem];

        newElements.splice(draggedItem, 1);
        newElements.splice(index, 0, draggedElement);

        setElements(newElements);
        setDraggedItem(index);
    };

    const handleDragEnd = async () => {
        setDraggedItem(null);

        // Сохраняем новый порядок на сервер
        const items = elements.map((el, index) => ({
            id: el.id,
            order: index
        }));

        try {
            await contentElementsAPI.reorder(items);
        } catch (error) {
            console.error('Ошибка сохранения порядка:', error);
            // Перезагружаем элементы при ошибке
            loadElements();
        }
    };

    return (
        <div className="drag-drop-list">
            {elements.map((element, index) => (
                <div
                    key={element.id}
                    className={`list-item ${draggedItem === index ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                >
                    <div className="drag-handle">
                        <i className="bi bi-grip-vertical"></i>
                    </div>
                    <div className="item-content">
                        <strong>{element.content_type}</strong>: {element.title || 'Без заголовка'}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DragDropReorder;
```

## CSS стили

```css
/* BlockRenderer styles */
.content-block {
    margin-bottom: 2rem;
}

.text-block .content {
    line-height: 1.6;
}

.video-block {
    max-width: 800px;
    margin: 0 auto;
}

.image-block img {
    max-width: 100%;
    height: auto;
}

.homework-block {
    background-color: #f8f9fa;
    border-left: 4px solid #007bff;
}

/* DragDrop styles */
.drag-drop-list {
    margin: 1rem 0;
}

.list-item {
    display: flex;
    align-items: center;
    padding: 1rem;
    margin-bottom: 0.5rem;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 0.25rem;
    cursor: move;
    transition: all 0.2s;
}

.list-item:hover {
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.list-item.dragging {
    opacity: 0.5;
}

.drag-handle {
    margin-right: 1rem;
    color: #6c757d;
}

.item-content {
    flex: 1;
}
```

## Интеграция с существующим кодом

### Обновление страницы курса

```jsx
import React, { useState, useEffect } from 'react';
import BlockRenderer from '../components/BlockRenderer';
import BlockEditor from '../components/BlockEditor';
import { contentElementsAPI } from '../services/api/contentElements';

const SectionContent = ({ sectionId, isOwner }) => {
    const [elements, setElements] = useState([]);

    useEffect(() => {
        loadElements();
    }, [sectionId]);

    const loadElements = async () => {
        const response = await contentElementsAPI.getBySection(sectionId);
        setElements(response.data);
    };

    return (
        <div className="section-content">
            {/* Отображение блоков */}
            {elements.map(element => (
                <BlockRenderer key={element.id} element={element} />
            ))}

            {/* Форма добавления блоков (только для владельца) */}
            {isOwner && (
                <BlockEditor
                    sectionId={sectionId}
                    onSuccess={loadElements}
                />
            )}
        </div>
    );
};

export default SectionContent;
```

## Проверка и отладка

### Проверить, что данные приходят в правильном формате

```javascript
// В DevTools Console
fetch('/api/content-elements/?section=1', {
    headers: {
        'Authorization': `Token ${localStorage.getItem('token')}`
    }
})
.then(r => r.json())
.then(data => console.log(data));
```

### Проверить валидацию

```javascript
// Попробуйте создать блок с невалидными данными
const invalidData = {
    section: 1,
    content_type: 'video',
    title: 'Test',
    data: {
        url: 'https://invalid-url.com'  // Не YouTube и не Vimeo
    }
};

fetch('/api/content-elements/', {
    method: 'POST',
    headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(invalidData)
})
.then(r => r.json())
.then(data => console.log(data));  // Должна быть ошибка валидации
```

## Дополнительные библиотеки

Рекомендуется установить:

```bash
npm install dompurify  # Для санитизации HTML
npm install react-quill  # Rich text редактор для TEXT блоков (опционально)
npm install react-beautiful-dnd  # Более продвинутый drag-and-drop (опционально)
```
