const Post = require('../models/Post');
const { deleteFromCloudinary } = require('../config/cloudinary');


exports.createPost = async (req, res, next) => {
    try {
        const { platform, text, images, video, tags, notes, originalDate } = req.body;

        // Validation basique
        if (!platform || !text) {
            return res.status(400).json({
                success: false,
                error: 'Plateforme et texte sont requis'
            });
        }

        // Valider la plateforme
        const validPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'];
        if (!validPlatforms.includes(platform.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: `Plateforme invalide. Valeurs acceptées: ${validPlatforms.join(', ')}`
            });
        }

        // Créer la publication dans Neon
        const post = await Post.create({
            userId: req.user.id,      // UUID de l'utilisateur connecté
            platform,
            text,
            images: images || [],
            video: video || null,
            tags: tags || [],
            notes: notes || '',
            originalDate: originalDate || null
        });

        console.log(`Publication créée: ${post.id} par user ${req.user.id}`);

        res.status(201).json({
            success: true,
            data: post,
            message: 'Publication sauvegardée avec succès !'
        });

    } catch (error) {
        console.error(' Erreur création post:', error);
        
        // Gérer les erreurs PostgreSQL
        if (error.code === '23505') {  
            return res.status(400).json({
                success: false,
                error: 'Cette publication existe déjà'
            });
        }
        
        if (error.code === '23503') {  // Foreign key violation
            return res.status(400).json({
                success: false,
                error: 'Utilisateur invalide'
            });
        }
        
        next(error);
    }
};


exports.getPosts = async (req, res, next) => {
    try {
        const {
            platform,
            limit = 20,
            page = 1,
            search
        } = req.query;

        // Calculer l'offset pour la pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Construire les filtres
        const filters = {
            platform,
            search,
            limit: parseInt(limit),
            offset
        };

        // Récupérer les publications
        const posts = await Post.findByUser(req.user.id, filters);

        // Compter le total pour la pagination
        const total = await Post.countByUser(req.user.id, {
            platform,
            search
        });

        // Récupérer les statistiques
        const stats = await Post.countByPlatform(req.user.id);

        res.status(200).json({
            success: true,
            count: posts.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            stats,
            data: posts
        });

    } catch (error) {
        console.error('Erreur récupération posts:', error);
        next(error);
    }
};


exports.getPost = async (req, res, next) => {
    try {
        // Récupérer la publication par UUID
        const post = await Post.findById(req.params.id);

        // Vérifier que la publication existe
        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Publication non trouvée'
            });
        }

        // Vérifier que l'utilisateur est le propriétaire
        if (post.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Non autorisé à accéder à cette publication'
            });
        }

        res.status(200).json({
            success: true,
            data: post
        });

    } catch (error) {
        console.error('Erreur récupération post:', error);
        
        // Gérer les erreurs d'UUID invalide
        if (error.code === '22P02') {  
            return res.status(400).json({
                success: false,
                error: 'ID invalide'
            });
        }
        
        next(error);
    }
};


exports.updatePost = async (req, res, next) => {
    try {
        // Récupérer la publication
        const post = await Post.findById(req.params.id);

        // Vérifier que la publication existe
        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Publication non trouvée'
            });
        }

        // Vérifier que l'utilisateur est le propriétaire
        if (post.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Non autorisé à modifier cette publication'
            });
        }

        // Champs modifiables
        const allowedFields = ['text', 'tags', 'notes', 'images', 'video'];
        const updates = {};

        Object.keys(req.body).forEach(key => {
            if (allowedFields.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        // Vérifier qu'il y a au moins un champ à mettre à jour
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Aucun champ valide à mettre à jour'
            });
        }

        // Mettre à jour
        const updatedPost = await Post.update(req.params.id, updates);

        console.log(`Publication modifiée: ${updatedPost.id}`);

        res.status(200).json({
            success: true,
            data: updatedPost,
            message: 'Publication mise à jour avec succès'
        });

    } catch (error) {
        console.error('Erreur modification post:', error);
        next(error);
    }
};


exports.deletePost = async (req, res, next) => {
    try {
        // Récupérer la publication
        const post = await Post.findById(req.params.id);

        // Vérifier que la publication existe
        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Publication non trouvée'
            });
        }

        // Vérifier que l'utilisateur est le propriétaire
        if (post.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Non autorisé à supprimer cette publication'
            });
        }

        // Supprimer les médias de Cloudinary
        try {
            // Supprimer les images
            if (post.images && Array.isArray(post.images) && post.images.length > 0) {
                for (const image of post.images) {
                    if (image.publicId) {
                        await deleteFromCloudinary(image.publicId, 'image');
                        console.log(` Image supprimée: ${image.publicId}`);
                    }
                }
            }

            // Supprimer la vidéo
            if (post.video && post.video.publicId) {
                await deleteFromCloudinary(post.video.publicId, 'video');
                console.log(`Vidéo supprimée: ${post.video.publicId}`);
            }
        } catch (cloudinaryError) {
            console.error('Erreur suppression Cloudinary:', cloudinaryError.message);
            // Continuer quand même la suppression du post
        }

        // Supprimer la publication de Neon
        await Post.delete(req.params.id);

        console.log(`Publication supprimée: ${req.params.id}`);

        res.status(200).json({
            success: true,
            message: 'Publication supprimée avec succès',
            data: {}
        });

    } catch (error) {
        console.error('Erreur suppression post:', error);
        next(error);
    }
};


exports.getStats = async (req, res, next) => {
    try {
        // Utiliser la méthode getStats du modèle
        const stats = await Post.getStats(req.user.id);

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Erreur stats:', error);
        next(error);
    }
};

