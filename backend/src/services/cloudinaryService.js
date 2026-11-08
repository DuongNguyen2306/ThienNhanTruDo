// Central Cloudinary storage for every image uploaded through the app.
//
// Credentials come from the environment (CLOUDINARY_CLOUD_NAME,
// CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) or a single CLOUDINARY_URL.
// All assets are placed under CLOUDINARY_FOLDER (default "thiennhan").
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');

const ROOT_FOLDER = (process.env.CLOUDINARY_FOLDER || 'thiennhan').replace(/^\/+|\/+$/g, '');

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  // Falls back to CLOUDINARY_URL, which the SDK reads automatically.
  cloudinary.config({ secure: true });
}

function isConfigured() {
  const c = cloudinary.config();
  return Boolean(c.cloud_name && c.api_key && c.api_secret);
}

function assertConfigured() {
  if (!isConfigured()) {
    const err = new Error('Chưa cấu hình Cloudinary (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET)');
    err.status = 500;
    throw err;
  }
}

// Build "<root>/<sub>/<parts...>" with unsafe characters stripped.
function buildFolder(...parts) {
  return [ROOT_FOLDER, ...parts]
    .filter(Boolean)
    .map((p) => String(p).replace(/[^a-zA-Z0-9_\-/]/g, '_'))
    .join('/');
}

function generateName() {
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Upload a Buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {{ folder: string, publicId?: string, resourceType?: 'image'|'raw'|'auto' }} opts
 * @returns {Promise<import('cloudinary').UploadApiResponse>}
 */
function uploadBuffer(buffer, { folder, publicId, resourceType = 'image' } = {}) {
  assertConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId || generateName(),
        resource_type: resourceType,
        overwrite: false,
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

/**
 * Upload a multer file kept in memory (multer.memoryStorage()).
 * PDFs are stored as "raw" assets: Cloudinary blocks PDF delivery for the
 * "image" resource type on new accounts by default.
 */
function uploadMulterFile(file, opts = {}) {
  if (file.mimetype === 'application/pdf') {
    return uploadBuffer(file.buffer, {
      ...opts,
      resourceType: 'raw',
      publicId: `${opts.publicId || generateName()}.pdf`,
    });
  }
  return uploadBuffer(file.buffer, opts);
}

/**
 * Upload a base64 string (raw base64 or a full data URL).
 */
async function uploadBase64(base64, mimeType, opts) {
  assertConfigured();
  const str = String(base64);
  const mime = str.startsWith('data:') ? str.slice(5, str.indexOf(';')) : mimeType || 'image/jpeg';
  const dataUrl = str.startsWith('data:') ? str : `data:${mime};base64,${str}`;
  const isPdf = mime === 'application/pdf';
  const name = opts.publicId || generateName();
  return cloudinary.uploader.upload(dataUrl, {
    folder: opts.folder,
    public_id: isPdf ? `${name}.pdf` : name,
    resource_type: isPdf ? 'raw' : opts.resourceType || 'image',
    overwrite: false,
  });
}

/**
 * Delete an asset by its full public_id. Never throws: storage cleanup
 * failures must not break the request that triggered them.
 */
async function deleteAsset(publicId, resourceType = 'image') {
  if (!publicId || !isConfigured()) return null;
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
  } catch (error) {
    console.error('[cloudinary] delete failed:', publicId, error.message);
    return null;
  }
}

/**
 * Extract the public_id from a Cloudinary delivery URL, e.g.
 * https://res.cloudinary.com/<cloud>/image/upload/v123/thiennhan/a/b.jpg
 *   -> thiennhan/a/b
 * Returns null for non-Cloudinary URLs.
 */
function publicIdFromUrl(url) {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) return null;
  const idx = url.indexOf('/upload/');
  if (idx === -1) return null;
  const isRaw = url.includes('/raw/upload/');
  let segments = url.slice(idx + '/upload/'.length).split(/[?#]/)[0].split('/');
  // Drop transformation segments (e.g. "c_fill,w_200") and the version ("v123").
  while (segments.length > 1 && (/^v\d+$/.test(segments[0]) || /^[a-z]{1,3}_[^/]*$/.test(segments[0]) && segments[0].includes(','))) {
    segments = segments.slice(1);
  }
  if (segments.length > 1 && /^v\d+$/.test(segments[0])) segments = segments.slice(1);
  let id = decodeURIComponent(segments.join('/'));
  // Raw assets keep their extension in the public_id; images do not.
  if (!isRaw) id = id.replace(/\.[a-zA-Z0-9]+$/, '');
  return id || null;
}

module.exports = {
  cloudinary,
  ROOT_FOLDER,
  isConfigured,
  buildFolder,
  generateName,
  uploadBuffer,
  uploadMulterFile,
  uploadBase64,
  deleteAsset,
  publicIdFromUrl,
};
