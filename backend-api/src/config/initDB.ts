import pool from "./database";
// Récupérer la connexion PostgreSQL créée dans database.ts

import fs from "fs";
// File System = module Node.js pour lire/écrire des fichiers

import path from "path";
// Module pour gérer les chemins de fichiers (compatible Windows/Mac/Linux)

async function initDatabase() {
  try {
    // LIRE LE FICHIER SCHEMA.SQL
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, "schema.sql"),
      // __dirname = /chemin/vers/src/config
      // path.join = combine en /chemin/vers/src/config/schema.sql

      "utf-8",
      // Encoder en texte (pas en binaire)
    );

    // EXÉCUTER LE SQL DANS POSTGRESQL
    await pool.query(schemaSQL);

    // SUCCÈS
    console.log("Base de données initialisée avec succès");

    // 4. TERMINER LE SCRIPT AVEC SUCCÈS
    process.exit(0);
  } catch (error) {
    // SI UNE ERREUR SE PRODUIT
    console.error("Erreur lors de l'initialisation:", error);

    // TERMINER LE SCRIPT AVEC ERREUR
    process.exit(1);
  }
}

initDatabase();
// Lancer la fonction immédiatement
