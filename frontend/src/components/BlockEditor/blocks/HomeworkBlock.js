import React, { useState, useEffect, useRef } from 'react';
import { coursesAPI } from '../../../services/api';

const HomeworkBlock = ({ data, onChange }) => {
  const [description, setDescription] = useState(data?.description || '');
  const [deadline, setDeadline] = useState(data?.deadline || '');
  const [allowedFormats, setAllowedFormats] = useState(data?.allowedFormats || []);
  const [maxFileSize, setMaxFileSize] = useState(data?.maxFileSize || 10);
  const [taskFileUrl, setTaskFileUrl] = useState(data?.task_file_url || '');
  const [taskFileName, setTaskFileName] = useState(data?.task_file_name || '');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setDescription(data?.description || '');
    setDeadline(data?.deadline || '');
    setAllowedFormats(data?.allowedFormats || []);
    setMaxFileSize(data?.maxFileSize || 10);
    setTaskFileUrl(data?.task_file_url || '');
    setTaskFileName(data?.task_file_name || '');
  }, [data]);

  const fileFormats = [
    { value: 'pdf', label: 'PDF' },
    { value: 'doc', label: 'DOC/DOCX' },
    { value: 'txt', label: 'TXT' },
    { value: 'zip', label: 'ZIP/RAR' },
    { value: 'image', label: 'Изображения (JPG, PNG)' },
    { value: 'video', label: 'Видео (MP4, AVI)' },
  ];

  const notifyChange = (updates) => {
    onChange({
      description,
      deadline,
      allowedFormats,
      maxFileSize,
      task_file_url: taskFileUrl,
      task_file_name: taskFileName,
      ...updates,
    });
  };

  const handleDescriptionChange = (e) => {
    const val = e.target.value;
    setDescription(val);
    notifyChange({ description: val });
  };

  const handleDeadlineChange = (e) => {
    const val = e.target.value;
    setDeadline(val);
    notifyChange({ deadline: val });
  };

  const handleFormatToggle = (format) => {
    const newFormats = allowedFormats.includes(format)
      ? allowedFormats.filter((f) => f !== format)
      : [...allowedFormats, format];
    setAllowedFormats(newFormats);
    notifyChange({ allowedFormats: newFormats });
  };

  const handleMaxFileSizeChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setMaxFileSize(val);
    notifyChange({ maxFileSize: val });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadError('');
    setUploading(true);
    try {
      const response = await coursesAPI.uploadHomeworkTaskFile(file);
      const { url, filename } = response.data;
      setTaskFileUrl(url);
      setTaskFileName(filename);
      notifyChange({ task_file_url: url, task_file_name: filename });
    } catch (err) {
      const msg = err.response?.data?.error || 'Ошибка загрузки файла';
      setUploadError(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = () => {
    setTaskFileUrl('');
    setTaskFileName('');
    notifyChange({ task_file_url: '', task_file_name: '' });
  };

  const getFileIcon = (filename) => {
    if (!filename) return 'bi-file-earmark';
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'bi-file-earmark-pdf';
    if (['doc', 'docx'].includes(ext)) return 'bi-file-earmark-word';
    if (['xls', 'xlsx'].includes(ext)) return 'bi-file-earmark-excel';
    if (['ppt', 'pptx'].includes(ext)) return 'bi-file-earmark-ppt';
    if (['zip', 'rar'].includes(ext)) return 'bi-file-earmark-zip';
    if (ext === 'txt') return 'bi-file-earmark-text';
    return 'bi-file-earmark';
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
          <strong>Файл с заданием</strong>
        </label>
        {taskFileUrl ? (
          <div className="d-flex align-items-center gap-2 p-2 border rounded bg-light">
            <i className={`bi ${getFileIcon(taskFileName)} fs-5 text-primary`}></i>
            <span className="text-truncate flex-grow-1 small">{taskFileName}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={handleRemoveFile}
              title="Удалить файл"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        ) : (
          <>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="d-none"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    Загрузка...
                  </>
                ) : (
                  <>
                    <i className="bi bi-paperclip me-1"></i>
                    Прикрепить файл задания
                  </>
                )}
              </button>
            </div>
            {uploadError && (
              <div className="text-danger small mt-1">{uploadError}</div>
            )}
            <div className="form-text">
              PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, ZIP, RAR — до 50 МБ
            </div>
          </>
        )}
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
          {taskFileUrl && (
            <li>
              <strong>Файл задания:</strong>{' '}
              <i className={`bi ${getFileIcon(taskFileName)} me-1`}></i>
              {taskFileName}
            </li>
          )}
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
