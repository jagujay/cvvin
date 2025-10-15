const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp'); // For image processing
const router = express.Router();

// Import services and middleware
const UserProfileService = require('../services/user.service');
const authMiddleware = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger.utils');

// Initialize services
const userService = new UserProfileService();

/**
 * GET /api/images/:fileId
 * Serve image with optional resizing and optimization
 */
router.get('/:fileId',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { fileId } = req.params;
      const { w, h, q, format } = req.query; // width, height, quality, format
      const userId = req.user.id;
      
      // Get file info from database
      const fileInfo = await userService.getFileInfo(fileId, userId);
      
      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          error: 'Image not found',
          message: 'Image does not exist or you do not have access to it'
        });
      }
      
      // Check if it's an image
      if (!fileInfo.mimeType.startsWith('image/')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type',
          message: 'File is not an image'
        });
      }
      
      // Check if file exists on filesystem
      if (fileInfo.storageMethod === 'filesystem') {
        const filePath = path.join(process.cwd(), fileInfo.filePath);
        
        try {
          await fs.access(filePath);
          
          // If no resizing parameters, serve original
          if (!w && !h && !q && !format) {
            res.setHeader('Content-Type', fileInfo.mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${fileInfo.fileName}"`);
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
            
            const fileStream = require('fs').createReadStream(filePath);
            fileStream.pipe(res);
            return;
          }
          
          // Process image with Sharp
          let sharpInstance = sharp(filePath);
          
          // Resize if parameters provided
          if (w || h) {
            const width = w ? parseInt(w) : null;
            const height = h ? parseInt(h) : null;
            sharpInstance = sharpInstance.resize(width, height, {
              fit: 'inside',
              withoutEnlargement: true
            });
          }
          
          // Set quality if provided
          const quality = q ? parseInt(q) : 80;
          
          // Convert format if provided
          if (format === 'webp') {
            sharpInstance = sharpInstance.webp({ quality });
            res.setHeader('Content-Type', 'image/webp');
          } else if (format === 'jpeg' || format === 'jpg') {
            sharpInstance = sharpInstance.jpeg({ quality });
            res.setHeader('Content-Type', 'image/jpeg');
          } else if (format === 'png') {
            sharpInstance = sharpInstance.png({ quality });
            res.setHeader('Content-Type', 'image/png');
          } else {
            // Keep original format
            res.setHeader('Content-Type', fileInfo.mimeType);
          }
          
          res.setHeader('Content-Disposition', `inline; filename="${fileInfo.fileName}"`);
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          
          // Stream processed image
          sharpInstance.pipe(res);
          
          Logger.info(`Image served: ${fileInfo.fileName} by user: ${req.user.email}`);
          
        } catch (error) {
          Logger.error(`Image not found on filesystem: ${filePath}`, error);
          return res.status(404).json({
            success: false,
            error: 'Image not found',
            message: 'Image exists in database but not on filesystem'
          });
        }
      } else {
        // Handle database-stored images (BYTEA) - future implementation
        return res.status(501).json({
          success: false,
          error: 'Not implemented',
          message: 'Database image serving not yet implemented'
        });
      }
      
    } catch (error) {
      Logger.error('Image serving failed', error);
      res.status(500).json({
        success: false,
        error: 'Image serving failed',
        message: error.message
      });
    }
  })
);

/**
 * GET /api/images/:fileId/thumbnail
 * Generate and serve thumbnail
 */
router.get('/:fileId/thumbnail',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { fileId } = req.params;
      const { size = '150' } = req.query; // Default 150x150
      const userId = req.user.id;
      
      // Get file info from database
      const fileInfo = await userService.getFileInfo(fileId, userId);
      
      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          error: 'Image not found',
          message: 'Image does not exist or you do not have access to it'
        });
      }
      
      // Check if it's an image
      if (!fileInfo.mimeType.startsWith('image/')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type',
          message: 'File is not an image'
        });
      }
      
      const thumbnailSize = parseInt(size);
      
      if (fileInfo.storageMethod === 'filesystem') {
        const filePath = path.join(process.cwd(), fileInfo.filePath);
        
        try {
          await fs.access(filePath);
          
          // Generate thumbnail
          const thumbnail = await sharp(filePath)
            .resize(thumbnailSize, thumbnailSize, {
              fit: 'cover',
              position: 'center'
            })
            .jpeg({ quality: 80 })
            .toBuffer();
          
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Content-Disposition', `inline; filename="thumb_${fileInfo.fileName}"`);
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          res.setHeader('Content-Length', thumbnail.length);
          
          res.send(thumbnail);
          
          Logger.info(`Thumbnail generated: ${fileInfo.fileName} (${thumbnailSize}x${thumbnailSize}) by user: ${req.user.email}`);
          
        } catch (error) {
          Logger.error(`Image not found on filesystem: ${filePath}`, error);
          return res.status(404).json({
            success: false,
            error: 'Image not found',
            message: 'Image exists in database but not on filesystem'
          });
        }
      } else {
        return res.status(501).json({
          success: false,
          error: 'Not implemented',
          message: 'Database image serving not yet implemented'
        });
      }
      
    } catch (error) {
      Logger.error('Thumbnail generation failed', error);
      res.status(500).json({
        success: false,
        error: 'Thumbnail generation failed',
        message: error.message
      });
    }
  })
);

/**
 * GET /api/images/:fileId/info
 * Get image metadata
 */
router.get('/:fileId/info',
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireActiveUser.bind(authMiddleware),
  asyncHandler(async (req, res) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;
      
      // Get file info from database
      const fileInfo = await userService.getFileInfo(fileId, userId);
      
      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          error: 'Image not found',
          message: 'Image does not exist or you do not have access to it'
        });
      }
      
      // Check if it's an image
      if (!fileInfo.mimeType.startsWith('image/')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type',
          message: 'File is not an image'
        });
      }
      
      let imageMetadata = {};
      
      if (fileInfo.storageMethod === 'filesystem') {
        const filePath = path.join(process.cwd(), fileInfo.filePath);
        
        try {
          await fs.access(filePath);
          
          // Get image metadata using Sharp
          const metadata = await sharp(filePath).metadata();
          
          imageMetadata = {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            channels: metadata.channels,
            density: metadata.density,
            hasAlpha: metadata.hasAlpha,
            space: metadata.space
          };
          
        } catch (error) {
          Logger.error(`Image not found on filesystem: ${filePath}`, error);
          return res.status(404).json({
            success: false,
            error: 'Image not found',
            message: 'Image exists in database but not on filesystem'
          });
        }
      }
      
      res.json({
        success: true,
        data: {
          fileId: fileInfo.id,
          fileName: fileInfo.fileName,
          fileSize: fileInfo.fileSize,
          mimeType: fileInfo.mimeType,
          storageMethod: fileInfo.storageMethod,
          createdAt: fileInfo.createdAt,
          metadata: imageMetadata,
          urls: {
            original: `/api/images/${fileId}`,
            thumbnail: `/api/images/${fileId}/thumbnail`,
            resized: (w, h) => `/api/images/${fileId}?w=${w}&h=${h}`,
            optimized: (format, quality) => `/api/images/${fileId}?format=${format}&q=${quality}`
          }
        }
      });
      
    } catch (error) {
      Logger.error('Failed to get image info', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get image info',
        message: error.message
      });
    }
  })
);

module.exports = router;
