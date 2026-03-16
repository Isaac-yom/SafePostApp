const express = require('express');
const router = express.Router();

// Import du controller upload
const {
    uploadImage,
    uploadVideo,
    deleteFile
} = require('../controllers/uploadController');

// Import des middlewares
const { protect, requireVerified } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');

router.post(
    '/image',
    protect,
    requireVerified,
    uploadLimiter,
    uploadImage
);


router.post(
    '/video',
    protect,
    requireVerified,
    uploadLimiter,
    uploadVideo
);


router.delete(
    '/:publicId',
    protect,
    requireVerified,
    deleteFile
);

// Export du router
module.exports = router;

