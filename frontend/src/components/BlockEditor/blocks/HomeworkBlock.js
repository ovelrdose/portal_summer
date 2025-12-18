import React, { useState, useEffect } from 'react';

const HomeworkBlock = ({ data, onChange }) => {
  const [description, setDescription] = useState(data?.description || '');
  const [deadline, setDeadline] = useState(data?.deadline || '');
  const [allowedFormats, setAllowedFormats] = useState(data?.allowedFormats || []);
  const [maxFileSize, setMaxFileSize] = useState(data?.maxFileSize || 10);

  useEffect(() => {
    setDescription(data?.description || '');
    setDeadline(data?.deadline || '');
    setAllowedFormats(data?.allowedFormats || []);
    setMaxFileSize(data?.maxFileSize || 10);
  }, [data]);

  const fileFormats = [
    { value: 'pdf', label: 'PDF' },
    { value: 'doc', label: 'DOC/DOCX' },
    { value: 'txt', label: 'TXT' },
    { value: 'zip', label: 'ZIP/RAR' },
    { value: 'image', label: 'Изображения (JPG, PNG)' },
    { value: 'video', label: 'Видео (MP4, AVI)' },
  ];

  const handleDescriptionChange = (e) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    onChange({
      description: newDescription,
      deadline,
      allowedFormats,
      maxFileSize,
    });
  };

  const handleDeadlineChange = (e) => {
    const newDeadline = e.target.value;
    setDeadline(newDeadline);
    onChange({
      description,
      deadline: newDeadline,
      allowedFormats,
      maxFileSize,
    });
  };

  const handleFormatToggle = (format) => {
    const newFormats = allowedFormats.includes(format)
      ? allowedFormats.filter((f) => f !== format)
      : [...allowedFormats, format];

    setAllowedFormats(newFormats);
    onChange({
      description,
      deadline,
      allowedFormats: newFormats,
      maxFileSize,
    });
  };

  const handleMaxFileSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    setMaxFileSize(newSize);
    onChange({
      description,
      deadline,
      allowedFormats,
      maxFileSize: newSize,
    });
  };

  return (
    <div className="homework-block">
      <div className="mb-3">
        <label className="form-label">
          <strong>Описание домашнего задания</strong>
        </label>
        <textarea
          className="form-control"
          rows="5"
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Опишите задание: что нужно сделать, какие требования..."
        />
      </div>

      <div className="mb-3">
        <label className="form-label">
          <strong>Дедлайн</strong>
        </label>
        <input
          type="datetime-local"
          className="form-control"
          value={deadline}
          onChange={handleDeadlineChange}
        />
        <div className="form-text">
          Срок сдачи работы (необязательно)
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">
          <strong>Допустимые форматы файлов</strong>
        </label>
        <div className="homework-formats">
          {fileFormats.map((format) => (
            <div key={format.value} className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id={`format-${format.value}`}
                checked={allowedFormats.includes(format.value)}
                onChange={() => handleFormatToggle(format.value)}
              />
              <label className="form-check-label" htmlFor={`format-${format.value}`}>
                {format.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">
          <strong>Максимальный размер файла (MB)</strong>
        </label>
        <input
          type="number"
          className="form-control"
          min="1"
          max="100"
          value={maxFileSize}
          onChange={handleMaxFileSizeChange}
        />
        <div className="form-text">
          От 1 до 100 MB
        </div>
      </div>

      <div className="homework-config">
        <h6>Предпросмотр конфигурации:</h6>
        <ul className="mb-0">
          <li>
            <strong>Форматы:</strong>{' '}
            {allowedFormats.length > 0
              ? allowedFormats.map((f) => fileFormats.find((ff) => ff.value === f)?.label).join(', ')
              : 'Не указаны'}
          </li>
          <li>
            <strong>Макс. размер:</strong> {maxFileSize} MB
          </li>
          {deadline && (
            <li>
              <strong>Дедлайн:</strong>{' '}
              {new Date(deadline).toLocaleString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default HomeworkBlock;
