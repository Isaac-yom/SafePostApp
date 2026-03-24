const nodemailer = require('nodemailer');

/**
 * ===== CONFIGURATION TRANSPORTEUR EMAIL =====
 * Utilise Gmail SMTP (ou autre service)
 */
const createTransporter = () => {
    // Configuration pour Gmail
    // Tu peux aussi utiliser SendGrid, Mailgun, etc.
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false, // true pour port 465, false pour autres ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

/**
 * ===== FONCTION PRINCIPALE D'ENVOI EMAIL =====
 * 
 * @param {Object} options - Options de l'email
 * @param {String} options.to - Email destinataire
 * @param {String} options.subject - Sujet de l'email
 * @param {String} options.text - Texte brut (optionnel)
 * @param {String} options.html - Contenu HTML
 * @returns {Promise} Résultat de l'envoi
 */
const sendEmail = async (options) => {
    try {
        // Créer le transporteur
        const transporter = createTransporter();

        // Options de l'email
        const mailOptions = {
            from: `${process.env.FROM_NAME || 'SafePost'} <${process.env.FROM_EMAIL || process.env.EMAIL_USER}>`,
            to: options.to,
            subject: options.subject,
            text: options.text || '',
            html: options.html
        };

        // Envoyer l'email
        const info = await transporter.sendMail(mailOptions);

        console.log(`Email envoyé à ${options.to}: ${info.messageId}`);
        
        return {
            success: true,
            messageId: info.messageId
        };

    } catch (error) {
        console.error('Erreur envoi email:', error.message);
        
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * ===== EMAIL DE VÉRIFICATION (FOLLOWER) =====
 * 
 * @param {String} email - Email du follower
 * @param {String} name - Nom du follower
 * @param {String} verificationUrl - URL de vérification
 * @param {String} creatorName - Nom du créateur
 */
const sendFollowerVerificationEmail = async (email, name, verificationUrl, creatorName) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Poppins', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    background: linear-gradient(135deg, #2563EB 0%, #1E40AF 100%);
                    color: white;
                    padding: 30px 20px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }
                .content {
                    background: #ffffff;
                    padding: 30px 20px;
                    border: 1px solid #E5E7EB;
                    border-top: none;
                }
                .button {
                    display: inline-block;
                    padding: 14px 30px;
                    background-color: #2563EB;
                    color: white !important;
                    text-decoration: none;
                    border-radius: 8px;
                    margin: 20px 0;
                    font-weight: bold;
                }
                .footer {
                    background: #F3F4F6;
                    padding: 20px;
                    text-align: center;
                    font-size: 14px;
                    color: #6B7280;
                    border-radius: 0 0 10px 10px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 style="margin: 0;">🛡️ SafePost</h1>
                <p style="margin: 10px 0 0 0;">Liste de Secours</p>
            </div>
            
            <div class="content">
                <h2>Bienvenue ${name || 'cher abonné'} !</h2>
                
                <p>Vous venez de vous inscrire à la liste de secours de <strong>${creatorName}</strong>.</p>
                
                <p>Pour recevoir les alertes en cas de problème avec les comptes de ce créateur, veuillez confirmer votre adresse email :</p>
                
                <center>
                    <a href="${verificationUrl}" class="button">
                        Confirmer mon email
                    </a>
                </center>
                
                <p style="margin-top: 30px; font-size: 14px; color: #6B7280;">
                    <strong>Ce lien expire dans 24 heures</strong>
                </p>
                
                <p style="font-size: 14px; color: #6B7280;">
                    Si vous n'avez pas demandé cette inscription, ignorez cet email.
                </p>
            </div>
            
            <div class="footer">
                <p>SafePost - Protection des créateurs de contenu</p>
                <p style="margin: 5px 0 0 0;">
                    <a href="${process.env.FRONTEND_URL}" style="color: #2563EB; text-decoration: none;">
                        Visiter SafePost
                    </a>
                </p>
            </div>
        </body>
        </html>
    `;

    return await sendEmail({
        to: email,
        subject: 'Confirmez votre abonnement SafePost',
        html
    });
};

/**
 * ===== EMAIL D'ALERTE (COMPTE BANNI) =====
 * 
 * @param {String} email - Email du follower
 * @param {Object} alertData - Données de l'alerte
 * @param {String} alertData.creatorName - Nom du créateur
 * @param {String} alertData.platform - Plateforme (tiktok, instagram, etc.)
 * @param {String} alertData.bannedAccount - Compte banni
 * @param {String} alertData.newAccountLink - Lien nouveau compte
 * @param {String} alertData.newAccountName - Nom nouveau compte
 * @param {String} alertData.message - Message personnalisé
 * @param {String} unsubscribeUrl - URL de désinscription
 */
const sendAlertEmail = async (email, alertData, unsubscribeUrl) => {
    const {
        creatorName,
        platform,
        bannedAccount,
        newAccountLink,
        newAccountName,
        message
    } = alertData;

    // Emojis par plateforme
    const platformEmojis = {
        tiktok: '🎵',
        instagram: '📸',
        facebook: '📘',
        twitter: '🐦',
        linkedin: '💼'
    };

    const emoji = platformEmojis[platform] || '📱';
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Poppins', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .alert-header {
                    background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
                    color: white;
                    padding: 30px 20px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }
                .content {
                    background: #ffffff;
                    padding: 30px 20px;
                    border: 2px solid #EF4444;
                    border-top: none;
                }
                .alert-box {
                    background: #FEF2F2;
                    border-left: 4px solid #EF4444;
                    padding: 15px;
                    margin: 20px 0;
                }
                .new-account-box {
                    background: #ECFDF5;
                    border: 2px solid #10B981;
                    padding: 20px;
                    margin: 20px 0;
                    border-radius: 8px;
                    text-align: center;
                }
                .button {
                    display: inline-block;
                    padding: 14px 30px;
                    background-color: #10B981;
                    color: white !important;
                    text-decoration: none;
                    border-radius: 8px;
                    margin: 10px 0;
                    font-weight: bold;
                }
                .message-box {
                    background: #F9FAFB;
                    border: 1px solid #E5E7EB;
                    padding: 20px;
                    margin: 20px 0;
                    border-radius: 8px;
                    font-style: italic;
                }
                .footer {
                    background: #F3F4F6;
                    padding: 20px;
                    text-align: center;
                    font-size: 14px;
                    color: #6B7280;
                    border-radius: 0 0 10px 10px;
                }
            </style>
        </head>
        <body>
            <div class="alert-header">
                <h1 style="margin: 0; font-size: 48px;">🚨</h1>
                <h2 style="margin: 10px 0 0 0;">ALERTE IMPORTANTE</h2>
                <p style="margin: 10px 0 0 0;">${creatorName}</p>
            </div>
            
            <div class="content">
                <div class="alert-box">
                    <h3 style="margin: 0 0 10px 0; color: #DC2626;">
                        ${emoji} Compte ${platformName} suspendu
                    </h3>
                    <p style="margin: 0;">
                        Le compte <strong>${bannedAccount}</strong> n'est plus accessible.
                    </p>
                </div>
                
                ${message ? `
                    <div class="message-box">
                        <strong>Message de ${creatorName} :</strong><br>
                        "${message}"
                    </div>
                ` : ''}
                
                <div class="new-account-box">
                    <h3 style="margin: 0 0 15px 0; color: #059669;">
                        Nouveau compte à suivre
                    </h3>
                    <p style="font-size: 18px; margin: 10px 0;">
                        <strong>${newAccountName || 'Nouveau compte'}</strong>
                    </p>
                    <a href="${newAccountLink}" class="button" target="_blank">
                        ${emoji} Suivre maintenant
                    </a>
                    <p style="font-size: 14px; color: #6B7280; margin-top: 10px;">
                        ${newAccountLink}
                    </p>
                </div>
                
                <p style="margin-top: 30px;">
                    Merci de votre soutien à <strong>${creatorName}</strong> ! 💙
                </p>
            </div>
            
            <div class="footer">
                <p>Vous recevez cet email car vous êtes inscrit à la liste de secours de ${creatorName}.</p>
                <p style="margin: 10px 0 0 0;">
                    <a href="${unsubscribeUrl}" style="color: #6B7280; text-decoration: none; font-size: 12px;">
                        Se désabonner
                    </a>
                </p>
            </div>
        </body>
        </html>
    `;

    return await sendEmail({
        to: email,
        subject: `${creatorName} - Compte ${platformName} suspendu`,
        html
    });
};

// Exports
module.exports = {
    sendEmail,
    sendFollowerVerificationEmail,
    sendAlertEmail
};

/**
 * ========================================
 * CONFIGURATION .ENV REQUISE
 * ========================================
 * 
 * Pour Gmail :
 * 
 * EMAIL_HOST=smtp.gmail.com
 * EMAIL_PORT=587
 * EMAIL_USER=ton-email@gmail.com
 * EMAIL_PASSWORD=ton-mot-de-passe-app
 * FROM_NAME=SafePost
 * FROM_EMAIL=noreply@safepost.com
 * FRONTEND_URL=https://safepost.com
 * 
 * IMPORTANT GMAIL:
 * - Activer "Accès moins sécurisé" OU
 * - Utiliser "Mot de passe d'application" (recommandé)
 * - Aller sur: https://myaccount.google.com/apppasswords
 */