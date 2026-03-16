const { query } = require('../config/database');

class Post {

    // ================================
    // CRÉER UNE PUBLICATION
    // ================================
    static async create(data) {

        const sql = `
            INSERT INTO posts (
                user_id,
                platform,
                text,
                images,
                video,
                tags,
                notes,
                original_date
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *;
        `;

        const params = [
            data.userId,
            data.platform.toLowerCase(),
            data.text.trim(),
            JSON.stringify(data.images || []),
            data.video ? JSON.stringify(data.video) : null,
            data.tags || [],
            data.notes || '',
            data.originalDate || null
        ];

        try {
            const result = await query(sql, params);
            return this.formatPost(result.rows[0]);

        } catch (error) {
            console.error('Erreur création post:', error.message);
            throw error;
        }
    }

    // ================================
    // TROUVER UN POST PAR ID
    // ================================
    static async findById(id) {

        const sql = `
            SELECT * FROM posts
            WHERE id = $1;
        `;

        try {
            const result = await query(sql, [id]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.formatPost(result.rows[0]);

        } catch (error) {
            console.error('Erreur findById:', error.message);
            throw error;
        }
    }

    // ================================
    // POSTS D'UN UTILISATEUR
    // ================================
    static async findByUser(userId, filters = {}) {

        let sql = `
            SELECT * FROM posts
            WHERE user_id = $1
        `;

        const params = [userId];
        let paramIndex = 2;

        // filtre plateforme
        if (filters.platform) {
            sql += ` AND platform = $${paramIndex}`;
            params.push(filters.platform);
            paramIndex++;
        }

        // recherche texte
        if (filters.search) {
            sql += ` AND text ILIKE $${paramIndex}`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }

        sql += ` ORDER BY created_at DESC`;

        const limit = filters.limit || 20;
        const offset = filters.offset || 0;

        sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        try {
            const result = await query(sql, params);
            return result.rows.map(row => this.formatPost(row));

        } catch (error) {
            console.error('Erreur findByUser:', error.message);
            throw error;
        }
    }

    // ================================
    // COMPTER LES POSTS
    // ================================
    static async countByUser(userId, filters = {}) {

        let sql = `
            SELECT COUNT(*) as total
            FROM posts
            WHERE user_id = $1
        `;

        const params = [userId];
        let paramIndex = 2;

        if (filters.platform) {
            sql += ` AND platform = $${paramIndex}`;
            params.push(filters.platform);
            paramIndex++;
        }

        if (filters.search) {
            sql += ` AND text ILIKE $${paramIndex}`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }

        try {
            const result = await query(sql, params);
            return parseInt(result.rows[0].total);

        } catch (error) {
            console.error('Erreur countByUser:', error.message);
            throw error;
        }
    }

    // ================================
    // STAT PAR PLATEFORME
    // ================================
    static async countByPlatform(userId) {

        const sql = `
            SELECT platform, COUNT(*) as count
            FROM posts
            WHERE user_id = $1
            GROUP BY platform;
        `;

        try {
            const result = await query(sql, [userId]);

            const counts = {};
            result.rows.forEach(row => {
                counts[row.platform] = parseInt(row.count);
            });

            return counts;

        } catch (error) {
            console.error('Erreur countByPlatform:', error.message);
            throw error;
        }
    }

    // ================================
    // STATISTIQUES UTILISATEUR
    // ================================
    static async getStats(userId) {

        try {

            const totalResult = await query(
                'SELECT COUNT(*) as total FROM posts WHERE user_id = $1',
                [userId]
            );

            const total = parseInt(totalResult.rows[0].total);

            const byPlatform = await this.countByPlatform(userId);

            const withImagesResult = await query(
                `SELECT COUNT(*) as count FROM posts
                 WHERE user_id = $1 AND jsonb_array_length(images) > 0`,
                [userId]
            );

            const withImages = parseInt(withImagesResult.rows[0].count);

            const withVideoResult = await query(
                `SELECT COUNT(*) as count FROM posts
                 WHERE user_id = $1 AND video IS NOT NULL`,
                [userId]
            );

            const withVideo = parseInt(withVideoResult.rows[0].count);

            const recentResult = await query(
                `SELECT COUNT(*) as count FROM posts
                 WHERE user_id = $1
                 AND created_at >= NOW() - INTERVAL '7 days'`,
                [userId]
            );

            const recentWeek = parseInt(recentResult.rows[0].count);

            return {
                total,
                byPlatform,
                withImages,
                withVideo,
                recentWeek
            };

        } catch (error) {
            console.error('Erreur getStats:', error.message);
            throw error;
        }
    }

    // ================================
    // METTRE À JOUR UN POST
    // ================================
    static async update(id, updates) {

        const allowedFields = ['text', 'tags', 'notes', 'images', 'video'];
        const fields = [];
        const params = [];
        let paramIndex = 1;

        Object.keys(updates).forEach(key => {

            if (allowedFields.includes(key)) {

                fields.push(`${key} = $${paramIndex}`);

                if (key === 'images' || key === 'video') {
                    params.push(JSON.stringify(updates[key]));
                } else {
                    params.push(updates[key]);
                }

                paramIndex++;
            }
        });

        if (fields.length === 0) {
            throw new Error('Aucun champ valide à mettre à jour');
        }

        fields.push(`updated_at = NOW()`);

        const sql = `
            UPDATE posts
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

            return this.formatPost(result.rows[0]);

        } catch (error) {
            console.error('Erreur update:', error.message);
            throw error;
        }
    }

    // ================================
    // SUPPRIMER UN POST
    // ================================
    static async delete(id) {

        const sql = `
            DELETE FROM posts
            WHERE id = $1
            RETURNING id;
        `;

        try {
            const result = await query(sql, [id]);
            return result.rows.length > 0;

        } catch (error) {
            console.error('Erreur delete:', error.message);
            throw error;
        }
    }

    // ================================
    // FORMATTER UN POST
    // ================================
    static formatPost(row) {

        if (!row) return null;

        return {
            id: row.id,
            userId: row.user_id,
            platform: row.platform,
            text: row.text,
            images: row.images || [],
            video: row.video || null,
            tags: row.tags || [],
            notes: row.notes || '',
            originalDate: row.original_date,
            createdAt: row.created_at,
            updatedAt: row.updated_at,

            hasMedia: () =>
                (row.images && row.images.length > 0) || row.video !== null,

            getMediaCount: () => {
                let count = 0;
                if (row.images) count += row.images.length;
                if (row.video) count += 1;
                return count;
            },

            getTextPreview: (maxLength = 150) => {
                if (row.text.length <= maxLength) return row.text;
                return row.text.substring(0, maxLength) + '...';
            }
        };
    }
}

module.exports = Post;