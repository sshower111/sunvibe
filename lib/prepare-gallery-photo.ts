/** Convert on the device: smaller requests, normalized orientation, no EXIF/GPS metadata. */
export async function prepareGalleryPhoto(file: File): Promise<File> {
  if (!file.size || file.size > 30 * 1024 * 1024) throw new Error('Choose a photo smaller than 30 MB.');
  const heic = /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);
  if (!heic && !/\.(jpe?g|png|webp|gif|avif)$/i.test(file.name) && !/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type)) {
    throw new Error('Choose a JPG, HEIC, PNG, WebP, GIF, or AVIF photo. Videos are not supported.');
  }
  let source: Blob = file;
  if (heic) {
    try {
      const { heicTo } = await import('heic-to/csp');
      source = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 }) as Blob;
    } catch { throw new Error('This HEIC photo could not be opened. Try sharing it from Photos as a JPG.'); }
  }
  const url = URL.createObjectURL(source);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('This photo could not be opened. Try a different photo or export it as JPG.')); img.src = url; });
    const scale = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not prepare this photo. Please try another browser.');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.88, 0.75, 0.6]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= 3 * 1024 * 1024) {
        canvas.width = canvas.height = 0;
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
      }
    }
    throw new Error('This photo is too large to upload. Try a smaller photo.');
  } finally { URL.revokeObjectURL(url); img.src = ''; }
}
