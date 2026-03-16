/*
  Multer = bibliothèque Node.js pour gérer les fichiers
  uploadés via formulaires multipart/form-data
*/
const multer = require('multer');
const path = require('path');

/*
  ===== CONFIGURATION DU STOCKAGE =====
  On utilise memoryStorage pour stocker les fichiers en mémoire
  temporairement avant de les envoyer à Cloudinary
 */
const storage = multer.memoryStorage();

/*
  ===== FILTRE DES TYPES DE FICHIERS =====
  Définit quels types de fichiers sont autorisés 
*/
const fileFilter = (req, file, cb) => {
    // Types MIME autorisés pour les images
    const allowedImageTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
    ];

    // Types MIME autorisés pour les vidéos
    const allowedVideoTypes = [
        'video/mp4',
        'video/quicktime',      // .mov
        'video/x-msvideo',      // .avi
        'video/mpeg'
    ];

    // Combiner tous les types autorisés
    const allAllowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

    // Vérifier si le type du fichier est autorisé
    if (allAllowedTypes.includes(file.mimetype)) {
        // Accepter le fichier
        cb(null, true);
    } else {
        // Rejeter le fichier avec un message d'erreur
        cb(
            new Error(
                'Type de fichier non supporté. ' +
                'Images autorisées: JPG, PNG, GIF, WEBP. ' +
                'Vidéos autorisées: MP4, MOV, AVI, MPEG'
            ),
            false
        );
    }
};

/*
  ===== CONFIGURATION MULTER =====
  Définit les options de Multer
*/
const upload = multer({
    storage: storage,           // Utiliser le stockage en mémoire
    
    limits: {
        fileSize: 100 * 1024 * 1024  // 100MB maximum par fichier
    },
    
    fileFilter: fileFilter      // Appliquer le filtre de types
});

/**
  ===== MIDDLEWARES D'UPLOAD =====
*/

// Upload d'un seul fichier
// Champ du formulaire: "file"
const uploadSingle = upload.single('file');

// Upload de plusieurs fichiers
// Champ du formulaire: "files"
// Maximum 10 fichiers
const uploadMultiple = upload.array('files', 10);

// Upload de plusieurs champs
// Exemple: { images: 5 fichiers max, video: 1 fichier }
const uploadFields = upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'video', maxCount: 1 }
]);

/**
  ===== GESTIONNAIRE D'ERREURS MULTER =====
  Middleware pour gérer proprement les erreurs Multer
 */
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Erreur Multer spécifique
        
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'Fichier trop volumineux. Maximum: 100MB'
            });
        }
        
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: 'Trop de fichiers. Maximum: 10 fichiers'
            });
        }
        
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                error: 'Champ de fichier inattendu'
            });
        }
        
        // Autres erreurs Multer
        return res.status(400).json({
            success: false,
            error: `Erreur upload: ${err.message}`
        });
    }
    
    // Si ce n'est pas une erreur Multer, passer au middleware suivant
    next(err);
};

/*
  ===== VALIDATEURS DE FICHIERS =====
  Fonctions pour valider les fichiers après upload
*/

/*
  Valider qu'un fichier est une image
*/
const isImage = (mimetype) => {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return imageTypes.includes(mimetype);
};

/*
  Valider qu'un fichier est une vidéo
*/
const isVideo = (mimetype) => {
    const videoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];
    return videoTypes.includes(mimetype);
};

/*
  Valider la taille d'une image (max 5MB)
*/
const isValidImageSize = (size) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    return size <= maxSize;
};

/*
  Valider la taille d'une vidéo (max 50MB)
*/
const isValidVideoSize = (size) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    return size <= maxSize;
};

/*
  ===== EXPORTS =====
*/
module.exports = {
    uploadSingle,           // Upload 1 fichier
    uploadMultiple,         // Upload plusieurs fichiers
    uploadFields,           // Upload champs multiples
    handleMulterError,      // Gestionnaire d'erreurs
    isImage,               // Vérifier si image
    isVideo,               // Vérifier si vidéo
    isValidImageSize,      // Vérifier taille image
    isValidVideoSize       // Vérifier taille vidéo
};

