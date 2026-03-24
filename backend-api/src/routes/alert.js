/**
 * ========================================
 * ROUTES ALERTS
 * ========================================
 * Gère l'envoi d'alertes aux followers
 * 
 * BASE URL: /api/alerts
 * 
 * Routes disponibles:
 * - POST   /api/alerts/send           → Envoyer alerte (PRIVATE)
 * - GET    /api/alerts                → Historique alertes (PRIVATE)
 * - GET    /api/alerts/can-send       → Vérifier limite (PRIVATE)
 * - GET    /api/alerts/stats/overview → Statistiques (PRIVATE)
 * - GET    /api/alerts/:id            → Une alerte (PRIVATE)
 */

const express = require('express');
const router = express.Router();

// Import du controller
const {
    sendAlert,
    getAlerts,
    getAlert,
    canSendAlert,
    getStats
} = require('../controllers/alertController');

// Import middleware auth
const { protect, requireVerified } = require('../middleware/auth');

router.post('/send', protect, requireVerified, sendAlert);


router.get('/', protect, getAlerts);


router.get('/can-send', protect, canSendAlert);


router.get('/stats/overview', protect, getStats);


router.get('/:id', protect, getAlert);

// Export du router
module.exports = router;

