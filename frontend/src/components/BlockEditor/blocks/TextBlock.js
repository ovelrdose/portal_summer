import React, { useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Extension } from '@tiptap/core';
import { coursesAPI } from '../../../services/api';
import { Modal, Button, Form } from 'react-bootstrap';

// Расширение для размера шрифта
const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

// Расширение для Image с поддержкой дополнительных атрибутов
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          if (!attributes.style) {
            return {};
          }
          return { style: attributes.style };
        },
      },
      class: {
        default: 'editor-image',
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          return { class: attributes.class };
        },
      },
      'data-float': {
        default: null,
        parseHTML: element => element.getAttribute('data-float'),
        renderHTML: attributes => {
          if (!attributes['data-float']) {
            return {};
          }
          return { 'data-float': attributes['data-float'] };
        },
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return { width: attributes.width };
        },
      },
    };
  },
});

const TextBlock = ({ data, onChange, sectionId, uploadImage }) => {
  const [uploading, setUploading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageSettings, setImageSettings] = useState({
    float: 'none',
    width: '100',
  });
  const fileInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      CustomImage.configure({
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
      Placeholder.configure({
        placeholder: 'Начните вводить текст...',
      }),
    ],
    content: data?.html || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const json = editor.getJSON();
      onChange({ html, json });
    },
  });

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const url = window.prompt('Введите URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    // Валидация типа файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите файл изображения');
      return;
    }

    // Валидация размера (макс. 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10MB');
      return;
    }

    setUploading(true);

    try {
      const uploadFn = uploadImage || ((f, s) => coursesAPI.uploadImage(f, s));
      const response = await uploadFn(file, sectionId);
      const imageUrl = response.data.url;

      setSelectedImage(imageUrl);
      setShowImageModal(true);
    } catch (err) {
      console.error('Ошибка загрузки изображения:', err);
      alert(err.response?.data?.error || 'Ошибка при загрузке изображения');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const insertImage = () => {
    if (!selectedImage) return;

    let style = '';
    let className = 'editor-image';

    // Размер
    const widthPercent = parseInt(imageSettings.width) || 100;

    // Обтекание
    if (imageSettings.float === 'left') {
      style = `float: left; margin: 0 20px 10px 0; width: ${widthPercent}%; max-width: ${widthPercent}%;`;
      className += ' float-left';
    } else if (imageSettings.float === 'right') {
      style = `float: right; margin: 0 0 10px 20px; width: ${widthPercent}%; max-width: ${widthPercent}%;`;
      className += ' float-right';
    } else {
      style = `width: ${widthPercent}%; max-width: ${widthPercent}%;`;
    }

    editor
      .chain()
      .focus()
      .setImage({
        src: selectedImage,
        style: style,
        class: className,
        'data-float': imageSettings.float,
        width: `${widthPercent}%`,
      })
      .run();

    setShowImageModal(false);
    setSelectedImage(null);
    setImageSettings({ float: 'none', width: '100' });
  };

  const addImageFromUrl = () => {
    const url = window.prompt('Введите URL изображения:');
    if (url) {
      setSelectedImage(url);
      setShowImageModal(true);
    }
  };

  return (
    <div className="text-block">
      <div className="editor-content">
        <div className="editor-toolbar">
          {/* Выбор шрифта */}
          <select
            className="toolbar-select"
            onChange={(e) => {
              if (e.target.value === '') {
                editor.chain().focus().unsetFontFamily().run();
              } else {
                editor.chain().focus().setFontFamily(e.target.value).run();
              }
            }}
            value={editor.getAttributes('textStyle').fontFamily || ''}
            title="Шрифт"
          >
            <option value="">Шрифт по умолчанию</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Verdana, sans-serif">Verdana</option>
            <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
            <option value="Impact, fantasy">Impact</option>
          </select>

          {/* Выбор размера шрифта */}
          <select
            className="toolbar-select"
            onChange={(e) => {
              if (e.target.value === '') {
                editor.chain().focus().unsetFontSize().run();
              } else {
                editor.chain().focus().setFontSize(e.target.value).run();
              }
            }}
            value={editor.getAttributes('textStyle').fontSize || ''}
            title="Размер шрифта"
          >
            <option value="">Размер</option>
            <option value="12px">12px</option>
            <option value="14px">14px</option>
            <option value="16px">16px</option>
            <option value="18px">18px</option>
            <option value="20px">20px</option>
            <option value="24px">24px</option>
            <option value="28px">28px</option>
            <option value="32px">32px</option>
            <option value="36px">36px</option>
            <option value="48px">48px</option>
          </select>

          <span className="toolbar-separator">|</span>

          {/* Форматирование текста */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
            title="Жирный"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
            title="Курсив"
          >
            <em>I</em>
          </button>

          <span className="toolbar-separator">|</span>

          {/* Заголовки */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
            title="Заголовок 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
            title="Заголовок 3"
          >
            H3
          </button>

          <span className="toolbar-separator">|</span>

          {/* Выравнивание */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
            title="Выровнять по левому краю"
          >
            ⬅️
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
            title="Выровнять по центру"
          >
            ↔️
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
            title="Выровнять по правому краю"
          >
            ➡️
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}
            title="Выровнять по ширине"
          >
            ⬌
          </button>

          <span className="toolbar-separator">|</span>

          {/* Списки */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            title="Маркированный список"
          >
            • Список
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            title="Нумерованный список"
          >
            1. Список
          </button>

          <span className="toolbar-separator">|</span>

          {/* Цитата */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'is-active' : ''}
            title="Цитата"
          >
            " Цитата
          </button>

          <span className="toolbar-separator">|</span>

          {/* Ссылка */}
          <button
            type="button"
            onClick={setLink}
            className={editor.isActive('link') ? 'is-active' : ''}
            title="Добавить ссылку"
          >
            🔗 Ссылка
          </button>

          {/* Изображения */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Загрузить изображение"
            disabled={uploading}
          >
            {uploading ? '⏳' : '🖼'} {uploading ? 'Загрузка...' : 'Изображение'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <button
            type="button"
            onClick={addImageFromUrl}
            title="Добавить изображение по URL"
          >
            🌐 URL
          </button>

          <span className="toolbar-separator">|</span>

          {/* Разделитель */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Горизонтальная линия"
          >
            ―
          </button>

          <span className="toolbar-separator">|</span>

          {/* Отмена/Повтор */}
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Отменить"
          >
            ↶
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Повторить"
          >
            ↷
          </button>
        </div>
        <EditorContent editor={editor} />
      </div>

      {/* Модальное окно настроек изображения */}
      <Modal show={showImageModal} onHide={() => setShowImageModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Настройки изображения</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedImage && (
            <div className="mb-3">
              <img
                src={selectedImage}
                alt="Предпросмотр"
                style={{ width: '100%', borderRadius: '6px' }}
              />
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Обтекание текстом</Form.Label>
            <Form.Select
              value={imageSettings.float}
              onChange={(e) =>
                setImageSettings({ ...imageSettings, float: e.target.value })
              }
            >
              <option value="none">Без обтекания</option>
              <option value="left">Слева от текста</option>
              <option value="right">Справа от текста</option>
            </Form.Select>
            <Form.Text className="text-muted">
              Как текст будет обтекать изображение
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Размер изображения: {imageSettings.width}%</Form.Label>
            <Form.Range
              min="20"
              max="100"
              step="10"
              value={imageSettings.width}
              onChange={(e) =>
                setImageSettings({ ...imageSettings, width: e.target.value })
              }
            />
            <Form.Text className="text-muted">
              {imageSettings.float !== 'none'
                ? 'Для обтекания рекомендуется 30-50%'
                : 'Процент от ширины блока'}
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImageModal(false)}>
            Отмена
          </Button>
          <Button variant="primary" onClick={insertImage}>
            Вставить изображение
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TextBlock;
