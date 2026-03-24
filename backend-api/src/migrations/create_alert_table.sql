-- ===== CRÉATION TABLE ALERTS =====
CREATE TABLE IF NOT EXISTS alerts (
    -- ID unique (UUID auto-généré)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Référence au créateur
    creator_id UUID NOT NULL,
    
    -- Plateforme concernée
    platform VARCHAR(50) NOT NULL,
    
    -- Compte banni
    banned_account VARCHAR(255) NOT NULL,
    
    -- Nouveau compte à suivre
    new_account_link TEXT NOT NULL,
    new_account_name VARCHAR(255),
    
    -- Message personnalisé du créateur
    message TEXT,
    
    -- Statistiques d'envoi
    emails_sent INTEGER DEFAULT 0,
    emails_failed INTEGER DEFAULT 0,
    
    -- Erreurs rencontrées (array JSON)
    errors JSONB DEFAULT '[]'::jsonb,
    
    -- Statut de l'alerte
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'partial')),
    
    -- Date d'envoi
    sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Dates système
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== COMMENTAIRES =====
COMMENT ON TABLE alerts IS 'Historique des alertes envoyées aux followers';
COMMENT ON COLUMN alerts.creator_id IS 'UUID du créateur';
COMMENT ON COLUMN alerts.platform IS 'Plateforme: tiktok, instagram, etc.';
COMMENT ON COLUMN alerts.banned_account IS 'Compte qui a été banni';
COMMENT ON COLUMN alerts.new_account_link IS 'Lien du nouveau compte';
COMMENT ON COLUMN alerts.status IS 'Statut: pending, sending, sent, failed, partial';
COMMENT ON COLUMN alerts.emails_sent IS 'Nombre d\'emails envoyés avec succès';
COMMENT ON COLUMN alerts.emails_failed IS 'Nombre d\'emails échoués';

-- ===== INDEX POUR PERFORMANCES =====

-- Index sur creator_id
CREATE INDEX IF NOT EXISTS idx_alerts_creator_id 
ON alerts(creator_id);

-- Index sur platform
CREATE INDEX IF NOT EXISTS idx_alerts_platform 
ON alerts(platform);

-- Index composé: creator_id + created_at (historique)
CREATE INDEX IF NOT EXISTS idx_alerts_creator_created 
ON alerts(creator_id, created_at DESC);

-- Index sur status
CREATE INDEX IF NOT EXISTS idx_alerts_status 
ON alerts(status);

-- Index sur sent_at (alertes récentes)
CREATE INDEX IF NOT EXISTS idx_alerts_sent_at 
ON alerts(sent_at DESC);

-- ===== TRIGGER POUR UPDATED_AT =====
DROP TRIGGER IF EXISTS update_alerts_updated_at ON alerts;
CREATE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

