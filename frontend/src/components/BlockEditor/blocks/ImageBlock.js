import React, { useState, useRef } from 'react';
import { coursesAPI } from '../../../services/api';

const ImageBlock = ({ data, onChange, sectionId, uploadImage }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Валидация типа файла
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите файл изображения');
      return;
    }

    // Валидация размера (макс. 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Размер файла не должен превышать 10MB');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const uploadFn = uploadImage || ((f, s) => coursesAPI.uploadImage(f, s));
      const response = await uploadFn(file, sectionId);
      onChange({
        ...data,
        url: response.data.url,
        filename: file.name,
      });
    } catch (err) {
      console.error('Ошибка загрузки изображения:', err);
      setError(err.response?.data?.error || 'Ошибка при загрузке изображения');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleAltChange = (e) => {
    onChange({
      ...data,
      alt: e.target.value,
    });
  };

  const handleCaptionChange = (e) => {
    onChange({
      ...data,
      caption: e.target.value,
    });
  };

  return (
    <div className="image-block">
      {!data?.url ? (
        <div
          className={`upload-area ${dragOver ? 'dragging' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {uploading ? (
            <div>
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Загрузка...</span>
              </div>
              <p className="mb-0">Загрузка изображения...</p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
              <p className="mb-2">
                <strong>Нажмите или перетащите файл</strong>
              </p>
              <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                Поддерживаются JPG, PNG, GIF (макс. 10MB)
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="image-preview">
            <img src={data.url} alt={data.alt || 'Изображение'} />
          </div>

          <div className="mb-3">
            <label className="form-label">Альтернативный текст (для доступности)</label>
            <input
              type="text"
              className="form-control"
              value={data.alt || ''}
              onChange={handleAltChange}
              placeholder="Описание изображения"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Подпись</label>
            <input
              type="text"
              className="form-control"
              value={data.caption || ''}
              onChange={handleCaptionChange}
              placeholder="Подпись к изображению"
            />
          </div>

          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => {
              onChange({ url: null, alt: '', caption: '', filename: '' });
            }}
          >
            🗑 Удалить изображение
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger mt-3" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageBlock;
