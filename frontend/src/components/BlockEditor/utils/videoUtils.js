/**
 * Парсинг URL видео и определение провайдера
 * @param {string} url - URL видео
 * @returns {Object|null} - {provider: 'youtube'|'vimeo', videoId: string} или null
 */
export const parseVideoUrl = (url) => {
  if (!url) return null;

  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      return { provider: 'youtube', videoId: match[1] };
    }
  }

  // Vimeo patterns
  const vimeoPatterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/
  ];

  for (const pattern of vimeoPatterns) {
    const match = url.match(pattern);
    if (match) {
      return { provider: 'vimeo', videoId: match[1] };
    }
  }

  return null;
};

/**
 * Получение embed URL для встраивания видео
 * @param {string} provider - 'youtube' или 'vimeo'
 * @param {string} videoId - ID видео
 * @returns {string} - URL для iframe
 */
export const getEmbedUrl = (provider, videoId) => {
  if (provider === 'youtube') {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (provider === 'vimeo') {
    return `https://player.vimeo.com/video/${videoId}`;
  }
  return '';
};

/**
 * Валидация URL видео
 * @param {string} url - URL видео
 * @returns {boolean} - true если валидный URL YouTube или Vimeo
 */
export const isValidVideoUrl = (url) => {
  return parseVideoUrl(url) !== null;
};
