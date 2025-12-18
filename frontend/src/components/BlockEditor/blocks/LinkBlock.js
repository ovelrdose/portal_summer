import React, { useState, useEffect } from 'react';

const LinkBlock = ({ data, onChange }) => {
  const [url, setUrl] = useState(data?.url || '');
  const [text, setText] = useState(data?.text || '');
  const [openInNewTab, setOpenInNewTab] = useState(data?.openInNewTab ?? true);
  const [error, setError] = useState('');

  useEffect(() => {
    setUrl(data?.url || '');
    setText(data?.text || '');
    setOpenInNewTab(data?.openInNewTab ?? true);
  }, [data]);

  const validateUrl = (urlString) => {
    try {
      new URL(urlString);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);

    if (newUrl && !validateUrl(newUrl)) {
      setError('Введите корректный URL (например, https://example.com)');
    } else {
      setError('');
    }

    onChange({
      url: newUrl,
      text,
      openInNewTab,
    });
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    onChange({
      url,
      text: newText,
      openInNewTab,
    });
  };

  const handleCheckboxChange = (e) => {
    const newValue = e.target.checked;
    setOpenInNewTab(newValue);
    onChange({
      url,
      text,
      openInNewTab: newValue,
    });
  };

  const isValidUrl = url && validateUrl(url);

  return (
    <div className="link-block">
      <div className="mb-3">
        <label className="form-label">URL ссылки</label>
        <input
          type="url"
          className={`form-control ${error ? 'is-invalid' : ''}`}
          value={url}
          onChange={handleUrlChange}
          placeholder="https://example.com"
        />
        {error && <div className="invalid-feedback">{error}</div>}
      </div>

      <div className="mb-3">
        <label className="form-label">Текст ссылки</label>
        <input
          type="text"
          className="form-control"
          value={text}
          onChange={handleTextChange}
          placeholder="Название ссылки"
        />
        <div className="form-text">
          Если не указан, будет отображаться URL
        </div>
      </div>

      <div className="mb-3 form-check">
        <input
          type="checkbox"
          className="form-check-input"
          id="openInNewTab"
          checked={openInNewTab}
          onChange={handleCheckboxChange}
        />
        <label className="form-check-label" htmlFor="openInNewTab">
          Открывать в новой вкладке
        </label>
      </div>

      {isValidUrl && (
        <div className="link-preview">
          <a
            href={url}
            target={openInNewTab ? '_blank' : '_self'}
            rel={openInNewTab ? 'noopener noreferrer' : ''}
          >
            {text || url}
            {openInNewTab && ' ↗'}
          </a>
        </div>
      )}
    </div>
  );
};

export default LinkBlock;
