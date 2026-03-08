/* eslint-disable import/no-unresolved */
// Importer le driver PostgreSQLe
import { Pool } from "pg";
// Pool = classe qui gère un ensemble de connexions

// Importer dotenv pour lire le fichier .env
import dotenv from "dotenv";

// Charger les variables du fichier .env dans process.env
dotenv.config();
// Après cette ligne, process.env.DATABASE_URL est accessible

// Créer le pool de connexions
const pool = new Pool({
  // Récupérer l'URL depuis les variables d'environnement
  connectionString: process.env.DATABASE_URL,

  // Configuration SSL (obligatoire pour Neon)
  ssl: {
    rejectUnauthorized: false,
  },
});

// Event listener : quand une connexion réussit
pool.on("connect", () => {
  console.log("Connecté à Neon PostgreSQL");
});

// Event listener : si une erreur survient
pool.on("error", (err) => {
  console.error("Erreur Neon:", err);
  // En production, on pourrait logger dans un fichier ou service externe
});

// Exporter le pool pour l'utiliser partout dans l'app
export default pool;
