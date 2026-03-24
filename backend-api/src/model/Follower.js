const { query } = require('../config/database');
const crypto = require('crypto');


class Follower {
    /**
     * CRÉER UN FOLLOWER (ABONNEMENT)
     * 
     * @param {Object} data - Données du follower
     * @param {String} data.creatorId - UUID du créateur
     * @param {String} data.email - Email du follower
     * @param {String} data.name - Nom du follower (optionnel)
     * @param {Array} data.platforms - Plateformes suivies
     * @returns {Object} Follower créé
     */
    static async create(data) {
        // Générer les tokens
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const unsubscribeToken = crypto.randomBytes(32).toString('hex');
        
        // Expiration vérification: 24h
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        const sql = `
            INSERT INTO followers (
                creator_id,
                email,
                name,
                platforms,
                verification_token,
                verification_token_expires,
                unsubscribe_token
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        
        const params = [
            data.creatorId,
            data.email.toLowerCase().trim(),
            data.name || null,
            data.platforms || [],
            verificationToken,
            verificationExpires,
            unsubscribeToken
        ];
        
        try {
            const result = await query(sql, params);
            return this.formatFollower(result.rows[0]);
        } catch (error) {
            // Gérer contrainte unique
            if (error.code === '23505') {
                throw new Error('Cet email est déjà abonné à ce créateur');
            }
            throw error;
        }
    }
    
    /**
     * TROUVER UN FOLLOWER PAR ID
     * 
     * @param {String} id - UUID du follower
     * @returns {Object|null} Follower ou null
     */
    static async findById(id) {
        const sql = `
            SELECT * FROM followers
            WHERE id = $1;
        `;
        
        try {
            const result = await query(sql, [id]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return this.formatFollower(result.rows[0]);
        } catch (error) {
            console.error('Erreur findById follower:', error.message);
            throw error;
        }
    }
    
    /**
     * TROUVER PAR TOKEN DE VÉRIFICATION
     * 
     * @param {String} token - Token de vérification
     * @returns {Object|null} Follower ou null
     */
    static async findByVerificationToken(token) {
        const sql = `
            SELECT * FROM followers
            WHERE verification_token = $1
            AND verification_token_expires > NOW();
        `;
        
        try {
            const result = await query(sql, [token]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return this.formatFollower(result.rows[0]);
        } catch (error) {
            console.error('Erreur findByVerificationToken:', error.message);
            throw error;
        }
    }
    
    /**
     * TROUVER PAR TOKEN DE DÉSINSCRIPTION
     * 
     * @param {String} token - Token de désinscription
     * @returns {Object|null} Follower ou null
     */
    static async findByUnsubscribeToken(token) {
        const sql = `
            SELECT * FROM followers
            WHERE unsubscribe_token = $1;
        `;
        
        try {
            const result = await query(sql, [token]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return this.formatFollower(result.rows[0]);
        } catch (error) {
            console.error('Erreur findByUnsubscribeToken:', error.message);
            throw error;
        }
    }
    
    /**
     * RÉCUPÉRER TOUS LES FOLLOWERS D'UN CRÉATEUR
     * 
     * @param {String} creatorId - UUID du créateur
     * @param {Object} filters - Filtres optionnels
     * @param {Boolean} filters.verified - Seulement vérifiés
     * @param {String} filters.platform - Filtrer par plateforme
     * @param {Number} filters.limit - Limite
     * @param {Number} filters.offset - Offset
     * @returns {Array} Liste des followers
     */
    static async findByCreator(creatorId, filters = {}) {
        let sql = `
            SELECT * FROM followers
            WHERE creator_id = $1
        `;
        
        const params = [creatorId];
        let paramIndex = 2;
        
        // Filtre: seulement vérifiés
        if (filters.verified === true) {
            sql += ` AND is_verified = TRUE`;
        }
        
        // Filtre: plateforme spécifique
        if (filters.platform) {
            sql += ` AND $${paramIndex} = ANY(platforms)`;
            params.push(filters.platform);
            paramIndex++;
        }
        
        // Tri par date (plus récent en premier)
        sql += ` ORDER BY created_at DESC`;
        
        // Pagination
        const limit = filters.limit || 100;
        const offset = filters.offset || 0;
        
        sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        
        try {
            const result = await query(sql, params);
            return result.rows.map(row => this.formatFollower(row));
        } catch (error) {
            console.error('Erreur findByCreator:', error.message);
            throw error;
        }
    }
    
    /**
     * COMPTER LES FOLLOWERS D'UN CRÉATEUR
     * 
     * @param {String} creatorId - UUID du créateur
     * @param {Boolean} verifiedOnly - Compter seulement vérifiés
     * @returns {Number} Nombre de followers
     */
    static async countByCreator(creatorId, verifiedOnly = false) {
        let sql = `
            SELECT COUNT(*) as total
            FROM followers
            WHERE creator_id = $1
        `;
        
        if (verifiedOnly) {
            sql += ` AND is_verified = TRUE`;
        }
        
        try {
            const result = await query(sql, [creatorId]);
            return parseInt(result.rows[0].total);
        } catch (error) {
            console.error('Erreur countByCreator:', error.message);
            throw error;
        }
    }
    
    /**
     * VÉRIFIER UN FOLLOWER (EMAIL CONFIRMÉ)
     * 
     * @param {String} token - Token de vérification
     * @returns {Object|null} Follower vérifié ou null
     */
    static async verify(token) {
        const sql = `
            UPDATE followers
            SET is_verified = TRUE,
                verification_token = NULL,
                verification_token_expires = NULL,
                updated_at = NOW()
            WHERE verification_token = $1
            AND verification_token_expires > NOW()
            RETURNING *;
        `;
        
        try {
            const result = await query(sql, [token]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return this.formatFollower(result.rows[0]);
        } catch (error) {
            console.error('Erreur verify follower:', error.message);
            throw error;
        }
    }
    
    /**
     * INCRÉMENTER LE COMPTEUR D'ALERTES REÇUES
     * 
     * @param {String} followerId - UUID du follower
     * @returns {Boolean} Succès
     */
    static async incrementAlertsReceived(followerId) {
        const sql = `
            UPDATE followers
            SET alerts_received = alerts_received + 1,
                last_alert_date = NOW(),
                updated_at = NOW()
            WHERE id = $1;
        `;
        
        try {
            await query(sql, [followerId]);
            return true;
        } catch (error) {
            console.error('Erreur incrementAlertsReceived:', error.message);
            return false;
        }
    }
    
    /**
     * SUPPRIMER UN FOLLOWER (DÉSINSCRIPTION)
     * 
     * @param {String} id - UUID du follower
     * @returns {Boolean} Succès
     */
    static async delete(id) {
        const sql = `
            DELETE FROM followers
            WHERE id = $1
            RETURNING id;
        `;
        
        try {
            const result = await query(sql, [id]);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Erreur delete follower:', error.message);
            throw error;
        }
    }
    
    /**
     * STATISTIQUES D'UN CRÉATEUR
     * 
     * @param {String} creatorId - UUID du créateur
     * @returns {Object} Statistiques
     */
    static async getStats(creatorId) {
        try {
            // Total followers
            const totalResult = await query(
                'SELECT COUNT(*) as total FROM followers WHERE creator_id = $1',
                [creatorId]
            );
            const total = parseInt(totalResult.rows[0].total);
            
            // Followers vérifiés
            const verifiedResult = await query(
                'SELECT COUNT(*) as count FROM followers WHERE creator_id = $1 AND is_verified = TRUE',
                [creatorId]
            );
            const verified = parseInt(verifiedResult.rows[0].count);
            
            // Followers non vérifiés
            const unverified = total - verified;
            
            // Par plateforme (seulement vérifiés)
            const platformsResult = await query(
                `SELECT unnest(platforms) as platform, COUNT(*) as count
                 FROM followers
                 WHERE creator_id = $1 AND is_verified = TRUE
                 GROUP BY platform`,
                [creatorId]
            );
            
            const byPlatform = {};
            platformsResult.rows.forEach(row => {
                byPlatform[row.platform] = parseInt(row.count);
            });
            
            // Nouveaux cette semaine
            const weekResult = await query(
                `SELECT COUNT(*) as count FROM followers
                 WHERE creator_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
                [creatorId]
            );
            const newThisWeek = parseInt(weekResult.rows[0].count);
            
            return {
                total,
                verified,
                unverified,
                byPlatform,
                newThisWeek
            };
        } catch (error) {
            console.error('Erreur getStats:', error.message);
            throw error;
        }
    }
    
    /**
     * ===== FORMATER UN FOLLOWER =====
     * Convertit les données PostgreSQL en objet propre
     * 
     * @param {Object} row - Ligne PostgreSQL
     * @returns {Object} Follower formaté
     */
    static formatFollower(row) {
        if (!row) return null;
        
        return {
            id: row.id,
            creatorId: row.creator_id,
            email: row.email,
            name: row.name,
            platforms: row.platforms || [],
            isVerified: row.is_verified,
            verificationToken: row.verification_token,
            verificationTokenExpires: row.verification_token_expires,
            unsubscribeToken: row.unsubscribe_token,
            alertsReceived: row.alerts_received,
            lastAlertDate: row.last_alert_date,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}

module.exports = Follower;
