/**
 * Парсинг URL видео и определение провайдера
 * @param {string} url - URL видео
 * @returns {Object|null} - {provider: string, videoId: string, embedUrl: string} или null
 */
export const parseVideoUrl = (url) => {
  if (!url) return null;

  const trimmedUrl = url.trim();

  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of youtubePatterns) {
    const match = trimmedUrl.match(pattern);
    if (match) {
      const videoId = match[1];
      return {
        provider: 'youtube',
        videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`
      };
    }
  }

  // Vimeo patterns
  const vimeoPatterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/
  ];

  for (const pattern of vimeoPatterns) {
    const match = trimmedUrl.match(pattern);
    if (match) {
      const videoId = match[1];
      return {
        provider: 'vimeo',
        videoId,
        embedUrl: `https://player.vimeo.com/video/${videoId}`
      };
    }
  }

  // VK Video patterns
  const vkPatterns = [
    /vk\.com\/video(-?\d+_\d+)/,
    /vk\.com\/video\?z=video(-?\d+_\d+)/,
    /vkvideo\.ru\/video(-?\d+_\d+)/
  ];

  for (const pattern of vkPatterns) {
    const match = trimmedUrl.match(pattern);
    if (match) {
      const videoId = match[1];
      return {
        provider: 'vk',
        videoId,
        embedUrl: `https://vk.com/video_ext.php?oid=${videoId.split('_')[0]}&id=${videoId.split('_')[1]}&hd=2`
      };
    }
  }

  // Rutube patterns
  const rutubePatterns = [
    /rutube\.ru\/video\/([a-zA-Z0-9]+)/,
    /rutube\.ru\/play\/embed\/(\d+)/
  ];

  for (const pattern of rutubePatterns) {
    const match = trimmedUrl.match(pattern);
    if (match) {
      const videoId = match[1];
      return {
        provider: 'rutube',
        videoId,
        embedUrl: `https://rutube.ru/play/embed/${videoId}`
      };
    }
  }

  // Dzen (Яндекс.Дзен) patterns
  const dzenPatterns = [
    /dzen\.ru\/video\/watch\/([a-zA-Z0-9]+)/,
    /dzen\.ru\/embed\/([a-zA-Z0-9]+)/
  ];

  for (const pattern of dzenPatterns) {
    const match = trimmedUrl.match(pattern);
    if (match) {
      const videoId = match[1];
      return {
        provider: 'dzen',
        videoId,
        embedUrl: `https://dzen.ru/embed/${videoId}?from_block=partner&from=zen&mute=0&autoplay=0&tv=0`
      };
    }
  }

  // Если URL похож на embed URL (содержит /embed/ или player), считаем его универсальным
  if (trimmedUrl.includes('/embed/') || trimmedUrl.includes('player.') || trimmedUrl.startsWith('https://')) {
    // Проверяем, что это валидный URL
    try {
      new URL(trimmedUrl);
      return {
        provider: 'custom',
        videoId: trimmedUrl,
        embedUrl: trimmedUrl
      };
    } catch (e) {
      // Не валидный URL
    }
  }

  return null;
};

/**
 * Извлечение embed URL из iframe кода
 * @param {string} iframeCode - HTML код iframe
 * @returns {string|null} - Извлеченный URL или null
 */
export const extractUrlFromIframe = (iframeCode) => {
  if (!iframeCode) return null;

  // Ищем src="..." или src='...'
  const srcMatch = iframeCode.match(/src=["']([^"']+)["']/);
  if (srcMatch) {
    return srcMatch[1];
  }

  return null;
};

/**
 * Получение embed URL для встраивания видео
 * @param {string} provider - провайдер видео
 * @param {string} videoId - ID видео или embed URL
 * @returns {string} - URL для iframe
 */
export const getEmbedUrl = (provider, videoId) => {
  if (provider === 'youtube') {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (provider === 'vimeo') {
    return `https://player.vimeo.com/video/${videoId}`;
  }
  if (provider === 'vk') {
    const [oid, id] = videoId.split('_');
    return `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=2`;
  }
  if (provider === 'rutube') {
    return `https://rutube.ru/play/embed/${videoId}`;
  }
  if (provider === 'dzen') {
    return `https://dzen.ru/embed/${videoId}?from_block=partner&from=zen&mute=0&autoplay=0&tv=0`;
  }
  if (provider === 'custom') {
    // Для custom provider videoId уже является embed URL
    return videoId;
  }
  return '';
};

/**
 * Валидация URL видео
 * @param {string} url - URL видео или iframe код
 * @returns {boolean} - true если валидный
 */
export const isValidVideoUrl = (url) => {
  if (!url) return false;

  // Если это iframe код, пытаемся извлечь URL
  if (url.trim().startsWith('<iframe')) {
    const extractedUrl = extractUrlFromIframe(url);
    if (extractedUrl) {
      return parseVideoUrl(extractedUrl) !== null;
    }
    return false;
  }

  return parseVideoUrl(url) !== null;
};

/**
 * Получение названия провайдера для отображения
 * @param {string} provider - код провайдера
 * @returns {string} - название провайдера
 */
export const getProviderName = (provider) => {
  const names = {
    youtube: 'YouTube',
    vimeo: 'Vimeo',
    vk: 'VK Video',
    rutube: 'Rutube',
    dzen: 'Dzen',
    custom: 'Другой источник'
  };
  return names[provider] || provider;
};
