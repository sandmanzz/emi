// Files attached to an event (2026-11-11, owner: "di event user juga bisa upload file … ditampilkan di
// drawer"). Event Detail → Files opens a drawer to upload, preview (images), download and delete.
// Stored per event key: { [eventKey]: EventFile[] } where
//   EventFile = { id, name, type, size, dataUrl, uploadedBy, uploadedAt (ISO datetime) }
// Data URLs in localStorage (no backend). Backend: POST /events/{id}/files (multipart) → file URL.
const KEY = 'emi_event_files';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export function getEventFiles(eventKey) {
  return readAll()[eventKey] || [];
}

// Returns false when the browser storage is full (the caller shows a message).
export function saveEventFiles(eventKey, files) {
  const all = readAll();
  all[eventKey] = files;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}
