const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure local uploads directory exists for fallback
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const isCloudinaryConfigured = () => {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  return name && name !== 'your_cloud_name' && key && key !== 'your_api_key' && secret && secret !== 'your_api_secret';
};

/**
 * Upload a file buffer either to Cloudinary (if configured) or to local uploads fallback
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - { originalname, mimetype, folder, tags }
 * @returns {Promise<{ public_id: string, secure_url: string }>}
 */
const uploadFile = async (buffer, options = {}) => {
  const { originalname = 'document', folder = 'carecarry/reports', tags = [] } = options;

  if (isCloudinaryConfigured()) {
    try {
      return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
            access_mode: 'authenticated',
            tags,
          },
          (error, result) => {
            if (error) {
              console.warn('[Cloudinary Error, falling back to local storage]:', error.message);
              reject(error);
            } else {
              resolve({
                public_id: result.public_id,
                secure_url: result.secure_url,
              });
            }
          }
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    } catch (cloudErr) {
      console.warn('[Cloudinary upload failed, using local storage fallback]:', cloudErr.message);
      // Fall through to local fallback
    }
  }

  // Local storage fallback
  const ext = path.extname(originalname);
  const baseName = path.basename(originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueName = `${baseName}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  const filePath = path.join(UPLOADS_DIR, uniqueName);

  await fs.promises.writeFile(filePath, buffer);

  const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const localUrl = `${baseUrl}/uploads/${uniqueName}`;

  return {
    public_id: `local_${uniqueName}`,
    secure_url: localUrl,
  };
};

module.exports = { uploadFile, isCloudinaryConfigured };
