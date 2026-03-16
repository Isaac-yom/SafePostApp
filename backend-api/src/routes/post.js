const express = require('express');
const router = express.Router();

// Import du controller des publications
const {
    createPost,      // Créer une publication
    getPosts,        // Récupérer toutes les publications
    getPost,         // Récupérer une publication
    updatePost,      // Modifier une publication
    deletePost,      // Supprimer une publication
    getStats         // Statistiques
} = require('../controllers/postController');

// Import des middlewares d'authentification
const { protect, requireVerified } = require('../middleware/auth');
// protect: Vérifie que l'utilisateur est connecté (JWT valide)
// requireVerified: Vérifie que l'email est vérifié


router.route('/')
    .get(protect, getPosts)
    .post(protect, requireVerified, createPost);


router.get('/stats/overview', protect, getStats);


router.route('/:id')
    .get(protect, getPost)
    .put(protect, requireVerified, updatePost)
    .delete(protect, requireVerified, deletePost);

// Export du router pour l'utiliser dans server.js
module.exports = router;

