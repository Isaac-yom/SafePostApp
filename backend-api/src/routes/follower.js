
const express = require('express');
const router = express.Router();

// Import du controller
const {
    subscribe,
    verifyFollower,
    getMyFollowers,
    deleteFollower,
    unsubscribe,
    getStats
} = require('../controllers/followerController');

// Import middleware auth
const { protect } = require('../middleware/auth');
// protect = Vérifie que l'utilisateur est connecté (JWT valide)

// Import rate limiter
const { emailLimiter } = require('../middleware/rateLimiter');


router.post('/subscribe', emailLimiter, subscribe);


router.get('/verify/:token', verifyFollower);


router.get('/unsubscribe/:token', unsubscribe);


router.get('/', protect, getMyFollowers);


router.get('/stats', protect, getStats);


router.delete('/:id', protect, deleteFollower);

// Export du router
module.exports = router;

