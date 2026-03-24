const Follower = require('../models/Follower');
const { sendEmail } = require('../utils/sendEmail');

/**
 * @desc    S'abonner à un créateur (ABONNEMENT)
 * @route   POST /api/followers/subscribe
 * @access  Public
 */
exports.subscribe = async (req, res, next) => {
    try {
        const { creatorId, email, name, platforms } = req.body;

        // Validation
        if (!creatorId || !email) {
            return res.status(400).json({
                success: false,
                error: 'Créateur et email requis'
            });
        }

        // Valider format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Email invalide'
            });
        }

        //  Créer le follower
        const follower = await Follower.create({
            creatorId,
            email,
            name,
            platforms: platforms || []
        });

        // Envoyer email de vérification
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-follower/${follower.verificationToken}`;
        
        try {
            await sendEmail({
                to: follower.email,
                subject: 'Confirmez votre abonnement SafePost',
                html: `
                    <h2>Bienvenue !</h2>
                    <p>Merci de vous être abonné à la liste de secours.</p>
                    <p>Pour recevoir les alertes, veuillez confirmer votre email :</p>
                    <a href="${verificationUrl}" style="
                        display: inline-block;
                        padding: 12px 24px;
                        background-color: #2563EB;
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                        margin: 20px 0;
                    ">Confirmer mon email</a>
                    <p style="color: #6B7280; font-size: 14px;">
                        Ce lien expire dans 24 heures.
                    </p>
                `
            });
        } catch (emailError) {
            console.error('Erreur envoi email:', emailError.message);
            // Ne pas bloquer l'inscription si l'email échoue
        }

        console.log(`Nouveau follower: ${email} pour créateur ${creatorId}`);

        res.status(201).json({
            success: true,
            message: 'Abonnement réussi ! Vérifiez votre email pour confirmer.',
            data: {
                id: follower.id,
                email: follower.email,
                isVerified: follower.isVerified
            }
        });

    } catch (error) {
        console.error('Erreur subscribe:', error);
        
        if (error.message.includes('déjà abonné')) {
            return res.status(400).json({
                success: false,
                error: 'Vous êtes déjà abonné à ce créateur'
            });
        }
        
        next(error);
    }
};

/**
 * @desc    Vérifier email d'un follower
 * @route   GET /api/followers/verify/:token
 * @access  Public
 */
exports.verifyFollower = async (req, res, next) => {
    try {
        const { token } = req.params;

        // Vérifier le follower
        const follower = await Follower.verify(token);

        if (!follower) {
            return res.status(400).json({
                success: false,
                error: 'Token invalide ou expiré'
            });
        }

        console.log(`Email vérifié: ${follower.email}`);

        // Rediriger vers page de succès
        res.redirect(`${process.env.FRONTEND_URL}/verification-success`);

    } catch (error) {
        console.error('Erreur verifyFollower:', error);
        next(error);
    }
};

/**
 * @desc    Récupérer mes followers (CRÉATEUR)
 * @route   GET /api/followers
 * @access  Private (créateur connecté)
 */
exports.getMyFollowers = async (req, res, next) => {
    try {
        const {
            verified,
            platform,
            limit = 100,
            page = 1
        } = req.query;

        // Calculer offset
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Construire filtres
        const filters = {
            limit: parseInt(limit),
            offset
        };

        if (verified === 'true') {
            filters.verified = true;
        }

        if (platform) {
            filters.platform = platform;
        }

        // Récupérer les followers
        const followers = await Follower.findByCreator(req.user.id, filters);

        // Compter le total
        const total = await Follower.countByCreator(req.user.id);
        const verifiedCount = await Follower.countByCreator(req.user.id, true);

        res.status(200).json({
            success: true,
            count: followers.length,
            total,
            verified: verifiedCount,
            unverified: total - verifiedCount,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            data: followers
        });

    } catch (error) {
        console.error('Erreur getMyFollowers:', error);
        next(error);
    }
};

/**
 * @desc    Supprimer un follower
 * @route   DELETE /api/followers/:id
 * @access  Private (créateur connecté)
 */
exports.deleteFollower = async (req, res, next) => {
    try {
        // Récupérer le follower
        const follower = await Follower.findById(req.params.id);

        if (!follower) {
            return res.status(404).json({
                success: false,
                error: 'Abonné non trouvé'
            });
        }

        // Vérifier que c'est bien son follower
        if (follower.creatorId !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Non autorisé'
            });
        }

        // Supprimer
        await Follower.delete(req.params.id);

        console.log(`Follower supprimé: ${follower.email}`);

        res.status(200).json({
            success: true,
            message: 'Abonné supprimé avec succès',
            data: {}
        });

    } catch (error) {
        console.error('Erreur deleteFollower:', error);
        next(error);
    }
};

/**
 * @desc    Se désabonner (FOLLOWER)
 * @route   GET /api/followers/unsubscribe/:token
 * @access  Public
 */
exports.unsubscribe = async (req, res, next) => {
    try {
        const { token } = req.params;

        // Trouver le follower par token
        const follower = await Follower.findByUnsubscribeToken(token);

        if (!follower) {
            return res.status(404).json({
                success: false,
                error: 'Abonnement non trouvé'
            });
        }

        //  Supprimer
        await Follower.delete(follower.id);

        console.log(`Désinscription: ${follower.email}`);

        // Rediriger vers page de confirmation
        res.redirect(`${process.env.FRONTEND_URL}/unsubscribe-success`);

    } catch (error) {
        console.error('Erreur unsubscribe:', error);
        next(error);
    }
};

/**
 * @desc    Récupérer statistiques followers
 * @route   GET /api/followers/stats
 * @access  Private (créateur connecté)
 */
exports.getStats = async (req, res, next) => {
    try {
        const stats = await Follower.getStats(req.user.id);

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Erreur getStats followers:', error);
        next(error);
    }
};
