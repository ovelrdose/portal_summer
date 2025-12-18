import React from 'react';
import { getEmbedUrl } from '../utils/videoUtils';

const BlockPreview = ({ blocks }) => {
  if (!blocks || blocks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">👁</div>
        <h3>Предпросмотр пуст</h3>
        <p>Добавьте элементы в редакторе, чтобы увидеть их здесь</p>
      </div>
    );
  }

  const renderBlock = (block) => {
    switch (block.type) {
      case 'text':
        return renderTextBlock(block);
      case 'video':
        return renderVideoBlock(block);
      case 'image':
        return renderImageBlock(block);
      case 'link':
        return renderLinkBlock(block);
      case 'homework':
        return renderHomeworkBlock(block);
      default:
        return null;
    }
  };

  const renderTextBlock = (block) => {
    if (!block.data?.html) return null;
    return (
      <div
        className="preview-text"
        dangerouslySetInnerHTML={{ __html: block.data.html }}
      />
    );
  };

  const renderVideoBlock = (block) => {
    if (!block.data?.provider || !block.data?.videoId) return null;

    const embedUrl = getEmbedUrl(block.data.provider, block.data.videoId);

    return (
      <div className="preview-video">
        {block.data.title && <h4>{block.data.title}</h4>}
        <iframe
          src={embedUrl}
          title={block.data.title || 'Видео'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  };

  const renderImageBlock = (block) => {
    if (!block.data?.url) return null;

    return (
      <div className="preview-image">
        <img src={block.data.url} alt={block.data.alt || 'Изображение'} />
        {block.data.caption && <div className="caption">{block.data.caption}</div>}
      </div>
    );
  };

  const renderLinkBlock = (block) => {
    if (!block.data?.url) return null;

    return (
      <div className="preview-link">
        <a
          href={block.data.url}
          target={block.data.openInNewTab ? '_blank' : '_self'}
          rel={block.data.openInNewTab ? 'noopener noreferrer' : ''}
        >
          {block.data.text || block.data.url}
          {block.data.openInNewTab && ' ↗'}
        </a>
      </div>
    );
  };

  const renderHomeworkBlock = (block) => {
    if (!block.data?.description) return null;

    const fileFormats = [
      { value: 'pdf', label: 'PDF' },
      { value: 'doc', label: 'DOC/DOCX' },
      { value: 'txt', label: 'TXT' },
      { value: 'zip', label: 'ZIP/RAR' },
      { value: 'image', label: 'Изображения' },
      { value: 'video', label: 'Видео' },
    ];

    return (
      <div className="preview-homework">
        <h4>📋 Домашнее задание</h4>
        <div className="preview-homework-content">{block.data.description}</div>
        <div className="preview-homework-meta">
          {block.data.deadline && (
            <div className="mb-2">
              <strong>Срок сдачи:</strong>{' '}
              {new Date(block.data.deadline).toLocaleString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
          {block.data.allowedFormats && block.data.allowedFormats.length > 0 && (
            <div className="mb-2">
              <strong>Допустимые форматы:</strong>{' '}
              {block.data.allowedFormats
                .map((f) => fileFormats.find((ff) => ff.value === f)?.label)
                .join(', ')}
            </div>
          )}
          {block.data.maxFileSize && (
            <div>
              <strong>Макс. размер файла:</strong> {block.data.maxFileSize} MB
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="block-preview">
      {blocks.map((block, index) => (
        <div key={block.id || index} className="preview-block">
          {renderBlock(block)}
        </div>
      ))}
    </div>
  );
};

export default BlockPreview;
