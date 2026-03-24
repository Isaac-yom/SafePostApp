const { query } = require('../config/database');

class Alert {
    /**
     * CRÉER UNE ALERTE
     * 
     * @param {Object} data - Données de l'alerte
     * @param {String} data.creatorId - UUID du créateur
     * @param {String} data.platform - Plateforme (tiktok, instagram, etc.)
     * @param {String} data.bannedAccount - Compte banni
     * @param {String} data.newAccountLink - Lien nouveau compte
     * @param {String} data.newAccountName - Nom nouveau compte
     * @param {String} data.message - Message personnalisé
     * @returns {Object} Alerte créée
     */
    static async create(data) {
        const sql = `
            INSERT INTO alerts (
                creator_id,
                platform,
                banned_account,
                new_account_link,
                new_account_name,
                message,
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        
        const params = [
            data.creatorId,
            data.platform.toLowerCase(),
            data.bannedAccount,
            data.newAccountLink,
            data.newAccountName || null,
            data.message || null,
            'pending' // Statut initial
        ];
        
        try {
            const result = await query(sql, params);
            return this.formatAlert(result.rows[0]);
        } catch (error) {
            console.error('Erreur create alert:', error.message);
            throw error;
        }
    }
    
    /**
     * TROUVER UNE ALERTE PAR ID
     * 
     * @param {String} id - UUID de l'alerte
     * @returns {Object|null} Alerte ou null
     */
    static async findById(id) {
        const sql = `
            SELECT * FROM alerts
            WHERE id = $1;
        `;
        
        try {
            const result = await query(sql, [id]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return this.formatAlert(result.rows[0]);
        } catch (error) {
            console.error('Erreur findById alert:', error.message);
            throw error;
        }
    }
    
    /**
     * RÉCUPÉRER TOUTES LES ALERTES D'UN CRÉATEUR
     * 
     * @param {String} creatorId - UUID du créateur
     * @param {Object} filters - Filtres optionnels
     * @param {String} filters.platform - Filtrer par plateforme
     * @param {String} filters.status - Filtrer par statut
     * @param {Number} filters.limit - Limite
     * @param {Number} filters.offset - Offset
     * @returns {Array} Liste des alertes
     */
    static async findByCreator(creatorId, filters = {}) {
        let sql = `
            SELECT * FROM alerts
            WHERE creator_id = $1
        `;
        
        const params = [creatorId];
        let paramIndex = 2;
        
        // Filtre par plateforme
        if (filters.platform) {
            sql += ` AND platform = $${paramIndex}`;
            params.push(filters.platform);
            paramIndex++;
        }
        
        // Filtre par statut
        if (filters.status) {
            sql += ` AND status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }
        
        // Tri par date (plus récent en premier)
        sql += ` ORDER BY created_at DESC`;
        
        // Pagination
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        
        sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        
        try {
            const result = await query(sql, params);
            return result.rows.map(row => this.formatAlert(row));
        } catch (error) {
            console.error('Erreur findByCreator alert:', error.message);
            throw error;
        }
    }
    
    /**
     * METTRE À JOUR UNE ALERTE
     * 
     * @param {String} id - UUID de l'alerte
     * @param {Object} updates - Champs à mettre à jour
     * @returns {Object} Alerte mise à jour
     */
    static async update(id, updates) {
        const fields = [];
        const params = [];
        let paramIndex = 1;
        
        // Champs modifiables
        const allowedFields = [
            'status',
            'emails_sent',
            'emails_failed',
            'errors',
            'sent_at'
        ];
        
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = $${paramIndex}`);
                params.push(updates[key]);
                paramIndex++;
            }
        });
        
        if (fields.length === 0) {
            throw new Error('Aucun champ valide à mettre à jour');
        }
        
        // Ajouter updated_at
        fields.push(`updated_at = NOW()`);
        
        const sql = `
            UPDATE alerts
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *;
        `;
        
        params.push(id);
        
        try {
            const result = await query(sql, params);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return this.formatAlert(result.rows[0]);
        } catch (error) {
            console.error('Erreur update alert:', error.message);
            throw error;
        }
    }
    
    /**
     * COMPTER LES ALERTES D'UN CRÉATEUR
     * 
     * @param {String} creatorId - UUID du créateur
     * @returns {Number} Nombre d'alertes
     */
    static async countByCreator(creatorId) {
        const sql = `
            SELECT COUNT(*) as total
            FROM alerts
            WHERE creator_id = $1;
        `;
        
        try {
            const result = await query(sql, [creatorId]);
            return parseInt(result.rows[0].total);
        } catch (error) {
            console.error('Erreur countByCreator alert:', error.message);
            throw error;
        }
    }
    
    /**
     * VÉRIFIER SI LE CRÉATEUR PEUT ENVOYER UNE ALERTE
     * Limite: 3 alertes par jour
     * 
     * @param {String} creatorId - UUID du créateur
     * @returns {Boolean} Peut envoyer ou non
     */
    static async canSendAlert(creatorId) {
        const sql = `
            SELECT COUNT(*) as count
            FROM alerts
            WHERE creator_id = $1
            AND created_at >= NOW() - INTERVAL '24 hours';
        `;
        
        try {
            const result = await query(sql, [creatorId]);
            const count = parseInt(result.rows[0].count);
            
            // Limite: 3 alertes par jour
            return count < 3;
        } catch (error) {
            console.error('Erreur canSendAlert:', error.message);
            throw error;
        }
    }
    
    /**
     * STATISTIQUES DES ALERTES D'UN CRÉATEUR
     * 
     * @param {String} creatorId - UUID du créateur
     * @returns {Object} Statistiques
     */
    static async getStats(creatorId) {
        try {
            // Total alertes
            const totalResult = await query(
                'SELECT COUNT(*) as total FROM alerts WHERE creator_id = $1',
                [creatorId]
            );
            const total = parseInt(totalResult.rows[0].total);
            
            // Par plateforme
            const platformsResult = await query(
                `SELECT platform, COUNT(*) as count
                 FROM alerts
                 WHERE creator_id = $1
                 GROUP BY platform`,
                [creatorId]
            );
            
            const byPlatform = {};
            platformsResult.rows.forEach(row => {
                byPlatform[row.platform] = parseInt(row.count);
            });
            
            // Par statut
            const statusResult = await query(
                `SELECT status, COUNT(*) as count
                 FROM alerts
                 WHERE creator_id = $1
                 GROUP BY status`,
                [creatorId]
            );
            
            const byStatus = {};
            statusResult.rows.forEach(row => {
                byStatus[row.status] = parseInt(row.count);
            });
            
            // Total emails envoyés
            const emailsResult = await query(
                `SELECT SUM(emails_sent) as total_sent, SUM(emails_failed) as total_failed
                 FROM alerts
                 WHERE creator_id = $1`,
                [creatorId]
            );
            
            const totalEmailsSent = parseInt(emailsResult.rows[0].total_sent) || 0;
            const totalEmailsFailed = parseInt(emailsResult.rows[0].total_failed) || 0;
            
            // Dernière alerte
            const lastResult = await query(
                `SELECT created_at FROM alerts
                 WHERE creator_id = $1
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [creatorId]
            );
            
            const lastAlert = lastResult.rows.length > 0 ? lastResult.rows[0].created_at : null;
            
            return {
                total,
                byPlatform,
                byStatus,
                totalEmailsSent,
                totalEmailsFailed,
                lastAlert
            };
        } catch (error) {
            console.error('Erreur getStats alert:', error.message);
            throw error;
        }
    }
    
    /**
     * ===== FORMATER UNE ALERTE =====
     * 
     * @param {Object} row - Ligne PostgreSQL
     * @returns {Object} Alerte formatée
     */
    static formatAlert(row) {
        if (!row) return null;
        
        return {
            id: row.id,
            creatorId: row.creator_id,
            platform: row.platform,
            bannedAccount: row.banned_account,
            newAccountLink: row.new_account_link,
            newAccountName: row.new_account_name,
            message: row.message,
            emailsSent: row.emails_sent,
            emailsFailed: row.emails_failed,
            errors: row.errors || [],
            status: row.status,
            sentAt: row.sent_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}

module.exports = Alert;