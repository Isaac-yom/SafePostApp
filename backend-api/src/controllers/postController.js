// Import
const Post = require('../models/Post');
const { deleteFromCloudinary } = require('../config/cloudinary');

// Function createPost
exports.createPost = async (req, res, next) => {
    try {
        const { platform, text, images, video, tags, notes, originalDate } = req.body;  

        // Validation
        if(!platform || !text) {
            return res.status(400).json({
                success: false,
                error: 'Plateforme et texte sont requis'
            });
        }

        // Création de la publication
        const post = await Post.create({
            user: req.user.id,
            platform,
            text,
            images: images || [],
            video: video || null,
            tags: tags || [],
            notes: notes || '',
            originalDate: originalDate || null
        });

        console.log(`Publication créée: ${post._id} par ${req.user.email}`);
    
        res.status(201).json({
            success: true,
            data: post,
            message: 'Publication sauvegardée avec succès'
        });

    } catch (error) {
        console.error('Erreur création post:', error);
        next(error); 
    }
}

// Récupération des posts
exports.getPosts = async (req, res, next) => {
    try {
        const { platform, limit = 20, page = 1, search } = req.query; 

        const query = { user: req.user.id };   

        // Recherche par plateforme
        if(platform) {
            query.platform = platform.toLowerCase();  
        }

        // Recherche textuelle
        if (search) {
            query.$text = { $search: search };  
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);  
        
        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip)
            .lean(); 

        const total = await Post.countDocuments(query);     
    
             
    } catch (error) {
        
    }
};
