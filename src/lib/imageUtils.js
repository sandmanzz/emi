// Image / file helpers for uploads (2026-11-11). The app has no backend, so uploads are kept as data
// URLs in localStorage. Photos are shrunk first (longest side ≤ maxSide, JPEG) so a phone photo of
// a few MB becomes ~100 KB and many fit in storage. A backend replaces this with real file uploads.

export const MAX_FILE_BYTES = 2 * 1024 * 1024; // non-image files kept as-is up to 2 MB

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// Image file → shrunk JPEG data URL. GIF/SVG are kept as they are (animation / vector).
export async function imageFileToDataUrl(file, maxSide = 1000, quality = 0.82) {
  const src = await readAsDataUrl(file);
  if (/image\/(gif|svg)/.test(file.type)) return src;
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

// Any file → { name, type, size, dataUrl }. Images are shrunk; other files must be ≤ MAX_FILE_BYTES.
export async function fileToUpload(file) {
  if (file.type.startsWith('image/')) {
    const dataUrl = await imageFileToDataUrl(file);
    return { name: file.name, type: file.type.includes('gif') || file.type.includes('svg') ? file.type : 'image/jpeg', size: Math.round(dataUrl.length * 0.75), dataUrl };
  }
  if (file.size > MAX_FILE_BYTES) throw new Error(`"${file.name}" is larger than 2 MB.`);
  return { name: file.name, type: file.type || 'application/octet-stream', size: file.size, dataUrl: await readAsDataUrl(file) };
}

export function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
