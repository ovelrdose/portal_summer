import React, { useState, useEffect } from 'react';
import { parseVideoUrl, getEmbedUrl, isValidVideoUrl } from '../utils/videoUtils';

const VideoBlock = ({ data, onChange }) => {
  const [url, setUrl] = useState(data?.url || '');
  const [title, setTitle] = useState(data?.title || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setUrl(data?.url || '');
    setTitle(data?.title || '');
  }, [data]);

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);

    if (newUrl && !isValidVideoUrl(newUrl)) {
      setError('Неверный URL. Поддерживаются только YouTube и Vimeo');
    } else {
      setError('');
      const parsed = parseVideoUrl(newUrl);
      onChange({
        url: newUrl,
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
        <label className="form-label">URL видео (YouTube или Vimeo)</label>
        <input
          type="url"
          className={`form-control ${error ? 'is-invalid' : ''}`}
          value={url}
          onChange={handleUrlChange}
          placeholder="https://www.youtube.com/watch?v=..."
        />
        {error && <div className="invalid-feedback">{error}</div>}
        <div className="form-text">
          Поддерживаются ссылки YouTube и Vimeo
        </div>
      </div>

      {embedUrl && (
        <div className="video-preview">
          {title && <h5 className="mb-3">{title}</h5>}
          <iframe
            src={embedUrl}
            title={title || 'Видео'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
};

export default VideoBlock;
