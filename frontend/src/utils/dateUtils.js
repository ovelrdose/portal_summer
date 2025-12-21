// Utility functions for datetime handling

// Format datetime for datetime-local input (YYYY-MM-DDThh:mm)
export const formatDateTimeLocal = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Convert datetime-local value to ISO string (UTC)
export const dateTimeLocalToISO = (localString) => {
  if (!localString) return null;
  const date = new Date(localString);
  return date.toISOString();
};

// Format date for display (DD.MM.YYYY HH:MM)
export const formatDateTimeDisplay = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

// Check if content is locked
export const isContentLocked = (unlockDatetime) => {
  if (!unlockDatetime) return false;
  return new Date(unlockDatetime) > new Date();
};
