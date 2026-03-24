const Alert = require('../models/Alert');
const Follower = require('../models/Follower');
const { sendAlertEmail } = require('../utils/sendEmail');

/**
 * @desc    Envoyer une alerte à tous les followers
 * @route   POST /api/alerts/send
 * @access  Private (créateur connecté)
 */
exports.sendAlert = async (req, res, next) => {
    try {
        const {
            platform,
            bannedAccount,
            newAccountLink,
            newAccountName,
            message
        } = req.body;

        // 1. Validation
        if (!platform || !bannedAccount || !newAccountLink) {
            return res.status(400).json({
                success: false,
                error: 'Plateforme, compte banni et nouveau lien requis'
            });
        }

        // Valider la plateforme
        const validPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'];
        if (!validPlatforms.includes(platform.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: `Plateforme invalide. Valeurs: ${validPlatforms.join(', ')}`
            });
        }

        // 2. Vérifier la limite (3 alertes/jour)
        const canSend = await Alert.canSendAlert(req.user.id);
        
        if (!canSend) {
            return res.status(429).json({
                success: false,
                error: 'Limite atteinte: 3 alertes maximum par jour'
            });
        }

        // 3. Créer l'alerte dans la DB
        const alert = await Alert.create({
            creatorId: req.user.id,
            platform: platform.toLowerCase(),
            bannedAccount,
            newAccountLink,
            newAccountName,
            message
        });

        console.log(`Nouvelle alerte créée: ${alert.id}`);

        // 4. Mettre statut en "sending"
        await Alert.update(alert.id, { status: 'sending' });

        // 5. Récupérer les followers VÉRIFIÉS de cette plateforme
        const followers = await Follower.findByCreator(req.user.id, {
            verified: true,
            platform: platform.toLowerCase()
        });

        if (followers.length === 0) {
            // Aucun follower vérifié
            await Alert.update(alert.id, {
                status: 'failed',
                emails_sent: 0,
                emails_failed: 0
            });

            return res.status(200).json({
                success: true,
                message: 'Aucun follower vérifié pour cette plateforme',
                data: {
                    id: alert.id,
                    emailsSent: 0,
                    emailsFailed: 0
                }
            });
        }

        console.log(`Envoi à ${followers.length} followers...`);

        // 6. Envoyer les emails en PARALLÈLE (plus rapide)
        let emailsSent = 0;
        let emailsFailed = 0;
        const errors = [];

        // Données pour le template email
        const alertData = {
            creatorName: req.user.name || req.user.email,
            platform: platform.toLowerCase(),
            bannedAccount,
            newAccountLink,
            newAccountName,
            message
        };

        // Envoyer tous les emails en parallèle
        const emailPromises = followers.map(async (follower) => {
            try {
                // URL de désinscription
                const unsubscribeUrl = `${process.env.FRONTEND_URL}/api/followers/unsubscribe/${follower.unsubscribeToken}`;
                
                // Envoyer l'email
                const result = await sendAlertEmail(
                    follower.email,
                    alertData,
                    unsubscribeUrl
                );

                if (result.success) {
                    emailsSent++;
                    // Incrémenter compteur du follower
                    await Follower.incrementAlertsReceived(follower.id);
                } else {
                    emailsFailed++;
                    errors.push({
                        email: follower.email,
                        error: result.error
                    });
                }
            } catch (error) {
                emailsFailed++;
                errors.push({
                    email: follower.email,
                    error: error.message
                });
            }
        });

        // Attendre que tous les emails soient envoyés
        await Promise.all(emailPromises);

        // 7. Déterminer le statut final
        let status = 'sent';
        if (emailsSent === 0) {
            status = 'failed';
        } else if (emailsFailed > 0) {
            status = 'partial';
        }

        // 8. Mettre à jour l'alerte
        await Alert.update(alert.id, {
            status,
            emails_sent: emailsSent,
            emails_failed: emailsFailed,
            errors: JSON.stringify(errors),
            sent_at: new Date()
        });

        console.log(`Alerte envoyée: ${emailsSent} succès, ${emailsFailed} échecs`);

        res.status(200).json({
            success: true,
            message: 'Alerte envoyée avec succès',
            data: {
                id: alert.id,
                emailsSent,
                emailsFailed,
                status,
                errors: errors.length > 0 ? errors : undefined
            }
        });

    } catch (error) {
        console.error('Erreur sendAlert:', error);
        next(error);
    }
};

/**
 * @desc    Récupérer l'historique des alertes
 * @route   GET /api/alerts
 * @access  Private (créateur connecté)
 */
exports.getAlerts = async (req, res, next) => {
    try {
        const {
            platform,
            status,
            limit = 50,
            page = 1
        } = req.query;

        // Calculer offset
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Construire filtres
        const filters = {
            limit: parseInt(limit),
            offset
        };

        if (platform) {
            filters.platform = platform;
        }

        if (status) {
            filters.status = status;
        }

        // Récupérer les alertes
        const alerts = await Alert.findByCreator(req.user.id, filters);

        // Compter le total
        const total = await Alert.countByCreator(req.user.id);

        res.status(200).json({
            success: true,
            count: alerts.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            data: alerts
        });

    } catch (error) {
        console.error('Erreur getAlerts:', error);
        next(error);
    }
};

/**
 * @desc    Récupérer une alerte spécifique
 * @route   GET /api/alerts/:id
 * @access  Private (créateur connecté)
 */
exports.getAlert = async (req, res, next) => {
    try {
        // Récupérer l'alerte
        const alert = await Alert.findById(req.params.id);

        if (!alert) {
            return res.status(404).json({
                success: false,
                error: 'Alerte non trouvée'
            });
        }

        // Vérifier que c'est bien son alerte
        if (alert.creatorId !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Non autorisé'
            });
        }

        res.status(200).json({
            success: true,
            data: alert
        });

    } catch (error) {
        console.error('Erreur getAlert:', error);
        next(error);
    }
};

/**
 * @desc    Vérifier si peut envoyer une alerte
 * @route   GET /api/alerts/can-send
 * @access  Private (créateur connecté)
 */
exports.canSendAlert = async (req, res, next) => {
    try {
        const canSend = await Alert.canSendAlert(req.user.id);

        // Compter alertes envoyées aujourd'hui
        const { query } = require('../config/database');
        const result = await query(
            `SELECT COUNT(*) as count FROM alerts
             WHERE creator_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
            [req.user.id]
        );
        
        const alertsToday = parseInt(result.rows[0].count);

        res.status(200).json({
            success: true,
            data: {
                canSend,
                alertsToday,
                maxPerDay: 3,
                remaining: 3 - alertsToday
            }
        });

    } catch (error) {
        console.error('Erreur canSendAlert:', error);
        next(error);
    }
};

/**
 * @desc    Récupérer statistiques des alertes
 * @route   GET /api/alerts/stats/overview
 * @access  Private (créateur connecté)
 */
exports.getStats = async (req, res, next) => {
    try {
        const stats = await Alert.getStats(req.user.id);

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Erreur getStats alerts:', error);
        next(error);
    }
};

