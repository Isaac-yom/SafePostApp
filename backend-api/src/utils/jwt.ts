// IMPORTS
import jwt from "jsonwebtoken";
// Bibliothèque pour créer et vérifier des JWT

import { JWTPayload } from "../types";
// Type défini précédemment (userId + email)

// VARIABLES D'ENVIRONNEMENT

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
// Récupérer le secret depuis .env
// || 'fallback_secret' = valeur par défaut si JWT_SECRET absent
// En production, on devrait throw une erreur si absent

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
// Durée de validité du token

// FONCTION 1 : GÉNÉRER UN TOKEN

export const generateToken = (payload: JWTPayload): string => {
  // Paramètre : payload = { userId: 123, email: 'test@mail.com' }
  // Retour : string = le token JWT complet

  return jwt.sign(
    payload,
    // Données à encoder (userId + email)
    // jwt.sign ajoute automatiquement iat et exp

    JWT_SECRET,
    // Secret pour signer le token
    // Seul le backend connaît ce secret

    { expiresIn: JWT_EXPIRES_IN as string },
    // Options : durée de validité
    // '7d' → exp = now() + 7 jours
  );
};

// FONCTION 2 : VÉRIFIER UN TOKEN
export const verifyToken = (token: string): JWTPayload => {
  // Paramètre : token = "eyJhbGc..."
  // Retour : JWTPayload = { userId: 123, email: '...' }

  try {
    // Tenter de vérifier le token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    // jwt.verify fait 2 choses :
    // 1. Vérifie la signature (hash valide ?)
    // 2. Vérifie l'expiration (exp > now() ?)

    // Si OK, retourne le payload décodé
    return decoded;
  } catch (error: any) {
    // Si une erreur se produit (token invalide ou expiré)

    // Identifier le type d'erreur
    if (error.name === "TokenExpiredError") {
      // Cas spécifique : token expiré
      throw new Error("Token expiré");
      // Message clair pour le frontend
    } else if (error.name === "JsonWebTokenError") {
      // Cas : signature invalide ou format incorrect
      throw new Error("Token invalide");
    } else {
      // Autre erreur inattendue
      throw new Error("Erreur de vérification du token");
    }
  }
};
