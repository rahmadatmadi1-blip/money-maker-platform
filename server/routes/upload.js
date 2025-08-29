const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const { auth } = require('../middleware/auth');
const router = express.Router();

// File storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads', req.uploadType || 'general');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
    audio: ['audio/mp3', 'audio/wav', 'audio/ogg'],
    archive: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed']
  };

  const uploadType = req.uploadType || 'general';
  let allowed = [];

  switch (uploadType) {
    case 'avatar':
    case 'product-image':
    case 'service-image':
    case 'content-image':
      allowed = allowedTypes.image;
      break;
    case 'product-file':
    case 'content-file':
      allowed = [...allowedTypes.document, ...allowedTypes.archive, ...allowedTypes.video, ...allowedTypes.audio];
      break;
    case 'service-portfolio':
      allowed = [...allowedTypes.image, ...allowedTypes.video];
      break;
    default:
      allowed = Object.values(allowedTypes).flat();
  }

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed for ${uploadType}`), false);
  }
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Maximum 10 files per request
  }
});

// Middleware to set upload type
const setUploadType = (type) => {
  return (req, res, next) => {
    req.uploadType = type;
    next();
  };
};

// Image processing middleware
const processImage = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    for (const file of req.files) {
      if (file.mimetype.startsWith('image/')) {
        const inputPath = file.path;
        const outputPath = inputPath.replace(path.extname(inputPath), '_processed.webp');
        
        // Process image with Sharp
        await sharp(inputPath)
          .resize(1200, 1200, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .webp({ quality: 85 })
          .toFile(outputPath);
        
        // Update file info
        file.processedPath = outputPath;
        file.processedFilename = path.basename(outputPath);
      }
    }
    next();
  } catch (error) {
    console.error('Image processing error:', error);
    next(error);
  }
};

// @route   POST /api/upload/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', 
  auth, 
  setUploadType('avatar'),
  upload.single('avatar'),
  processImage,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const fileUrl = `/uploads/avatar/${req.file.processedFilename || req.file.filename}`;
      
      // Update user avatar
      const User = require('../models/User');
      await User.findByIdAndUpdate(req.user._id, {
        'avatar.url': fileUrl,
        'avatar.filename': req.file.processedFilename || req.file.filename
      });

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        file: {
          url: fileUrl,
          filename: req.file.processedFilename || req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });

    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload avatar'
      });
    }
  }
);

// @route   POST /api/upload/product-images
// @desc    Upload product images
// @access  Private
router.post('/product-images',
  auth,
  setUploadType('product-image'),
  upload.array('images', 5),
  processImage,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const uploadedFiles = req.files.map(file => ({
        url: `/uploads/product-image/${file.processedFilename || file.filename}`,
        filename: file.processedFilename || file.filename,
        size: file.size,
        mimetype: file.mimetype,
        alt: req.body.alt || ''
      }));

      res.json({
        success: true,
        message: 'Product images uploaded successfully',
        files: uploadedFiles
      });

    } catch (error) {
      console.error('Product images upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload product images'
      });
    }
  }
);

// @route   POST /api/upload/product-files
// @desc    Upload product files (digital products)
// @access  Private
router.post('/product-files',
  auth,
  setUploadType('product-file'),
  upload.array('files', 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const uploadedFiles = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/product-file/${file.filename}`,
        filename: file.filename,
        size: file.size,
        type: file.mimetype
      }));

      res.json({
        success: true,
        message: 'Product files uploaded successfully',
        files: uploadedFiles
      });

    } catch (error) {
      console.error('Product files upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload product files'
      });
    }
  }
);

// @route   POST /api/upload/service-images
// @desc    Upload service images
// @access  Private
router.post('/service-images',
  auth,
  setUploadType('service-image'),
  upload.array('images', 5),
  processImage,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const uploadedFiles = req.files.map(file => ({
        url: `/uploads/service-image/${file.processedFilename || file.filename}`,
        filename: file.processedFilename || file.filename,
        size: file.size,
        mimetype: file.mimetype,
        alt: req.body.alt || ''
      }));

      res.json({
        success: true,
        message: 'Service images uploaded successfully',
        files: uploadedFiles
      });

    } catch (error) {
      console.error('Service images upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload service images'
      });
    }
  }
);

// @route   POST /api/upload/service-portfolio
// @desc    Upload service portfolio files
// @access  Private
router.post('/service-portfolio',
  auth,
  setUploadType('service-portfolio'),
  upload.array('files', 10),
  processImage,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const uploadedFiles = req.files.map(file => ({
        title: req.body.title || file.originalname,
        description: req.body.description || '',
        url: `/uploads/service-portfolio/${file.processedFilename || file.filename}`,
        filename: file.processedFilename || file.filename,
        size: file.size,
        type: file.mimetype
      }));

      res.json({
        success: true,
        message: 'Portfolio files uploaded successfully',
        files: uploadedFiles
      });

    } catch (error) {
      console.error('Portfolio upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload portfolio files'
      });
    }
  }
);

// @route   POST /api/upload/content-media
// @desc    Upload content media files
// @access  Private
router.post('/content-media',
  auth,
  setUploadType('content-file'),
  upload.array('files', 10),
  processImage,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const uploadedFiles = req.files.map(file => {
        let type = 'document';
        if (file.mimetype.startsWith('image/')) type = 'image';
        else if (file.mimetype.startsWith('video/')) type = 'video';
        else if (file.mimetype.startsWith('audio/')) type = 'audio';

        return {
          type,
          name: file.originalname,
          url: `/uploads/content-file/${file.processedFilename || file.filename}`,
          filename: file.processedFilename || file.filename,
          size: file.size
        };
      });

      res.json({
        success: true,
        message: 'Content media uploaded successfully',
        files: uploadedFiles
      });

    } catch (error) {
      console.error('Content media upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload content media'
      });
    }
  }
);

// @route   DELETE /api/upload/file/:filename
// @desc    Delete uploaded file
// @access  Private
router.delete('/file/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const { type } = req.query;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'File type is required'
      });
    }

    const filePath = path.join(__dirname, '../uploads', type, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete file
    fs.unlinkSync(filePath);
    
    // Also delete processed version if exists
    const processedPath = filePath.replace(path.extname(filePath), '_processed.webp');
    if (fs.existsSync(processedPath)) {
      fs.unlinkSync(processedPath);
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

// @route   GET /api/upload/files
// @desc    Get user's uploaded files
// @access  Private
router.get('/files', auth, async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    
    // This is a simplified version - in production, you'd want to store file metadata in database
    const uploadPath = path.join(__dirname, '../uploads', type || 'general');
    
    if (!fs.existsSync(uploadPath)) {
      return res.json({
        success: true,
        files: [],
        pagination: {
          current: 1,
          pages: 0,
          total: 0,
          limit: parseInt(limit)
        }
      });
    }

    const files = fs.readdirSync(uploadPath)
      .filter(file => !file.includes('_processed'))
      .map(filename => {
        const filePath = path.join(uploadPath, filename);
        const stats = fs.statSync(filePath);
        
        return {
          filename,
          url: `/uploads/${type || 'general'}/${filename}`,
          size: stats.size,
          uploadedAt: stats.birthtime,
          type: path.extname(filename)
        };
      })
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedFiles = files.slice(startIndex, endIndex);

    res.json({
      success: true,
      files: paginatedFiles,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(files.length / limit),
        total: files.length,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get files'
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 50MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 10 files per request'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    message: error.message || 'Upload failed'
  });
});

module.exports = router;