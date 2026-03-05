const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const crypto = require('crypto');

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = [
    'uploads/properties',
    'uploads/profiles',
    'uploads/documents',
    'uploads/temp'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Generate unique filename
const generateFilename = (originalname) => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalname);
  return `${timestamp}-${random}${ext}`;
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/temp/';
    
    if (file.fieldname === 'images' || file.fieldname === 'propertyImages') {
      uploadPath = 'uploads/properties/';
    } else if (file.fieldname === 'profileImage') {
      uploadPath = 'uploads/profiles/';
    } else if (file.fieldname === 'documents' || file.fieldname === 'verificationDocuments') {
      uploadPath = 'uploads/documents/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const filename = generateFilename(file.originalname);
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedDocumentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const allowedTypes = [...allowedImageTypes, ...allowedDocumentTypes];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : 5 * 1024 * 1024, // 5MB default
  },
  fileFilter: fileFilter
});

// Image optimization middleware
const optimizeImage = async (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const processImage = async (file) => {
    if (file.mimetype.startsWith('image/')) {
      const optimizedPath = file.path.replace(/\.\w+$/, '-optimized$&');
      
      try {
        await sharp(file.path)
          .resize(1200, 800, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 80 })
          .toFile(optimizedPath);
        
        // Replace original with optimized
        fs.unlinkSync(file.path);
        fs.renameSync(optimizedPath, file.path);
        
        // Create thumbnail
        const thumbnailPath = file.path.replace(/\.\w+$/, '-thumb$&');
        await sharp(file.path)
          .resize(300, 200, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 60 })
          .toFile(thumbnailPath);
        
        // Store thumbnail path in request
        if (!req.thumbnails) req.thumbnails = [];
        req.thumbnails.push({
          original: file.path,
          thumbnail: thumbnailPath
        });
      } catch (error) {
        console.error('Image optimization error:', error);
      }
    }
  };

  try {
    if (req.file) {
      await processImage(req.file);
    } else if (req.files) {
      if (Array.isArray(req.files)) {
        for (const file of req.files) {
          await processImage(file);
        }
      } else {
        for (const field in req.files) {
          for (const file of req.files[field]) {
            await processImage(file);
          }
        }
      }
    }
  } catch (error) {
    console.error('Image processing error:', error);
  }

  next();
};

// Clean up temp files on error
const cleanupTempFiles = (err, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (unlinkErr) => {
      if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
    });
  }
  
  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach(file => {
        fs.unlink(file.path, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
        });
      });
    } else {
      Object.values(req.files).forEach(fileArray => {
        fileArray.forEach(file => {
          fs.unlink(file.path, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
          });
        });
      });
    }
  }
  
  next(err);
};

// Upload middleware wrappers
const uploadSingle = (fieldName) => {
  return [upload.single(fieldName), optimizeImage];
};

const uploadMultiple = (fieldName, maxCount = 10) => {
  return [upload.array(fieldName, maxCount), optimizeImage];
};

const uploadFields = (fields) => {
  return [upload.fields(fields), optimizeImage];
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  cleanupTempFiles,
  optimizeImage
};