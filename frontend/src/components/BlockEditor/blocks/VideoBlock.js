import React, { useState, useEffect } from 'react';
import { Alert, Badge } from 'react-bootstrap';
import { parseVideoUrl, getEmbedUrl, isValidVideoUrl, extractUrlFromIframe, getProviderName } from '../utils/videoUtils';

const VideoBlock = ({ data, onChange }) => {
  const [url, setUrl] = useState(data?.url || '');
  const [title, setTitle] = useState(data?.title || '');
  const [error, setError] = useState('');
  const [detectedProvider, setDetectedProvider] = useState(null);

  useEffect(() => {
    setUrl(data?.url || '');
    setTitle(data?.title || '');
    if (data?.provider) {
      setDetectedProvider(data.provider);
    }
  }, [data]);

  const handleUrlChange = (e) => {
    let inputValue = e.target.value.trim();
    setUrl(inputValue);

    if (!inputValue) {
      setError('');
      setDetectedProvider(null);
      onChange({
        url: '',
        title,
        provider: null,
        videoId: null,
      });
      return;
    }

    // Если это iframe код, извлекаем URL
    if (inputValue.startsWith('<iframe')) {
      const extractedUrl = extractUrlFromIframe(inputValue);
      if (extractedUrl) {
        inputValue = extractedUrl;
        setUrl(extractedUrl); // Обновляем поле ввода на чистый URL
      } else {
        setError('Не удалось извлечь URL из iframe кода');
        setDetectedProvider(null);
        return;
      }
    }

    if (!isValidVideoUrl(inputValue)) {
      setError('Неверный URL. Поддерживаются: YouTube, Vimeo, VK Video, Rutube, Dzen или любой embed URL');
      setDetectedProvider(null);
    } else {
      setError('');
      const parsed = parseVideoUrl(inputValue);
      setDetectedProvider(parsed?.provider || null);
      onChange({
        url: inputValue,
        title,
        provider: parsed?.provider || null,
        videoId: parsed?.videoId || null,
      });
    }
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    onChange({
      url,
      title: newTitle,
      provider: data?.provider || null,
      videoId: data?.videoId || null,
    });
  };

  const videoData = parseVideoUrl(url);
  const embedUrl = videoData ? getEmbedUrl(videoData.provider, videoData.videoId) : null;

  return (
    <div className="video-block">
      <div className="mb-3">
        <label className="form-label">Название видео</label>
        <input
          type="text"
          className="form-control"
          value={title}
          onChange={handleTitleChange}
          placeholder="Введите название видео"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">
          URL видео или код iframe
          {detectedProvider && (
            <Badge bg="success" className="ms-2">
              {getProviderName(detectedProvider)}
            </Badge>
          )}
        </label>
        <textarea
          className={`form-control ${error ? 'is-invalid' : ''}`}
          value={url}
          onChange={handleUrlChange}
          placeholder="Вставьте URL видео или код <iframe>..."
          rows={3}
          style={{ fontFamily: 'monospace', fontSize: '0.9em' }}
        />
        {error && <div className="invalid-feedback">{error}</div>}
        <div className="form-text">
          <strong>Поддерживаемые платформы:</strong>
          <ul className="mb-0 mt-1">
            <li>YouTube (youtube.com, youtu.be)</li>
            <li>Vimeo (vimeo.com)</li>
            <li>VK Video (vk.com/video, vkvideo.ru)</li>
            <li>Rutube (rutube.ru)</li>
            <li>Dzen (dzen.ru)</li>
            <li>Любой другой embed URL</li>
          </ul>
          <div className="mt-2">
            <small className="text-muted">
              Вы можете вставить обычную ссылку на видео или embed URL, или целый код iframe - система автоматически определит формат
            </small>
          </div>
        </div>
      </div>

      {embedUrl && (
        <div className="video-preview">
          {title && <h5 className="mb-3">{title}</h5>}
          <Alert variant="info" className="mb-2">
            <small>
              <strong>Предпросмотр:</strong> Видео встроено с {getProviderName(detectedProvider)}
            </small>
          </Alert>
          <div className="ratio ratio-16x9">
            <iframe
              src={embedUrl}
              title={title || 'Видео'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoBlock;
