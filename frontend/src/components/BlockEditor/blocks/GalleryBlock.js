import React, { useState, useRef } from 'react';
import { Button, Form, Row, Col, Spinner } from 'react-bootstrap';
import { coursesAPI } from '../../../services/api';

const GalleryBlock = ({ data, onChange, sectionId, uploadImage }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const images = data?.images || [];

  const handleFilesSelect = async (files) => {
    if (!files || files.length === 0) return;

    const validFiles = [];
    let hasErrors = false;

    // Валидация всех файлов
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith('image/')) {
        setError('Все файлы должны быть изображениями');
        hasErrors = true;
        break;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('Размер каждого файла не должен превышать 10MB');
        hasErrors = true;
        break;
      }

      validFiles.push(file);
    }

    if (hasErrors) {
      return;
    }

    setError('');
    setUploading(true);

    try {
      const uploadFn = uploadImage || ((f, s) => coursesAPI.uploadImage(f, s));
      const newImages = [];

      // Загрузка всех изображений последовательно
      for (const file of validFiles) {
        const response = await uploadFn(file, sectionId);
        newImages.push({
          url: response.data.url,
          caption: '',
          alt: '',
        });
      }

      onChange({
        ...data,
        images: [...images, ...newImages],
      });
    } catch (err) {
      console.error('Ошибка загрузки изображений:', err);
      setError(err.response?.data?.error || 'Ошибка при загрузке изображений');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    handleFilesSelect(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFilesSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleImageUpdate = (index, field, value) => {
    const updatedImages = [...images];
    updatedImages[index] = {
      ...updatedImages[index],
      [field]: value,
    };
    onChange({
      ...data,
      images: updatedImages,
    });
  };

  const handleImageDelete = (index) => {
    const updatedImages = images.filter((_, i) => i !== index);
    onChange({
      ...data,
      images: updatedImages,
    });
  };

  return (
    <div className="gallery-block">
      {images.length === 0 ? (
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
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {uploading ? (
            <div>
              <Spinner animation="border" variant="primary" className="mb-3" />
              <p className="mb-0">Загрузка изображений...</p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖼️</div>
              <p className="mb-2">
                <strong>Нажмите или перетащите файлы</strong>
              </p>
              <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                Поддерживаются JPG, PNG, GIF (макс. 10MB каждый)
              </p>
              <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                Можно загрузить несколько изображений одновременно
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <Row className="gallery-grid g-3 mb-3">
            {images.map((image, index) => (
              <Col key={index} xs={12} md={6} lg={4}>
                <div className="gallery-item">
                  <div className="gallery-item-preview">
                    <img
                      src={image.url}
                      alt={image.alt || `Изображение ${index + 1}`}
                      className="img-fluid"
                    />
                  </div>
                  <div className="gallery-item-fields mt-2">
                    <Form.Group className="mb-2">
                      <Form.Label className="small mb-1">Подпись</Form.Label>
                      <Form.Control
                        type="text"
                        size="sm"
                        value={image.caption || ''}
                        onChange={(e) => handleImageUpdate(index, 'caption', e.target.value)}
                        placeholder="Подпись к изображению"
                      />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label className="small mb-1">Alt текст</Form.Label>
                      <Form.Control
                        type="text"
                        size="sm"
                        value={image.alt || ''}
                        onChange={(e) => handleImageUpdate(index, 'alt', e.target.value)}
                        placeholder="Описание для доступности"
                      />
                    </Form.Group>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleImageDelete(index)}
                      className="w-100"
                    >
                      🗑 Удалить
                    </Button>
                  </div>
                </div>
              </Col>
            ))}
          </Row>

          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Загрузка...
                </>
              ) : (
                <>➕ Добавить еще изображения</>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <small className="text-muted">
              Всего изображений: {images.length}
            </small>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger mt-3 mb-0" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default GalleryBlock;
