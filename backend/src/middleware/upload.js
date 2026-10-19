const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create user-specific subdirectory
    const userDir = path.join(UPLOAD_DIR, req.user?.id || 'anonymous');
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random suffix
    const ext = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const safeName = `${timestamp}-${randomSuffix}${ext}`;
    cb(null, safeName);
  },
});

// File filter - validate actual file type, not just extension
const fileFilter = (req, file, cb) => {
  // Allowed MIME types for images
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
  ];

  // Check MIME type (more secure than extension)
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)'), false);
  }

  cb(null, true);
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 20, // Max 20 files per request
  },
});

// Helper to clean up files for a listing
const cleanupListingFiles = async (listingId, prisma) => {
  try {
    // Get listing to find associated files
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { photos: true },
    });

    if (!listing || !listing.photos) return;

    let photoUrls;
    try {
      photoUrls = JSON.parse(listing.photos);
    } catch {
      return;
    }

    // Delete physical files
    for (const photoUrl of photoUrls) {
      // Extract filename from URL
      const filename = path.basename(photoUrl);
      const filePath = path.join(UPLOAD_DIR, filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    console.error('Error cleaning up files:', error);
  }
};

// Middleware wrapper to handle multer errors
const handleUpload = (req, res, next) => {
  const uploadHandler = upload.array('photos', 20);
  
  uploadHandler(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File quá lớn. Kích thước tối đa là 10MB.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Quá nhiều file. Tối đa 20 file mỗi lần tải lên.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

module.exports = {
  upload,
  handleUpload,
  cleanupListingFiles,
  UPLOAD_DIR,
};
