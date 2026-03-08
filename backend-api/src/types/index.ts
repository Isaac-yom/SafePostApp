/* eslint-disable import/first */
// Type complet stocké en base de données
export interface User {
  id: number;
  // Identifiant unique auto-généré par PostgreSQL (SERIAL)

  email: string;
  // Email de l'utilisateur (UNIQUE, NOT NULL en DB)

  password: string;
  // Hash bcrypt du mot de passe (JAMAIS le mot de passe en clair)

  name?: string;
  // Nom optionnel de l'utilisateur

  created_at: Date;
  // Date de création du compte

  updated_at: Date;
  // Date de dernière modification du compte
  // Mis à jour automatiquement par le trigger SQL
}

// Type retourné au frontend (SÉCURISÉ)
export interface UserResponse {
  id: number;
  email: string;
  name?: string;
  created_at: Date;

  // IMPORTANT : PAS de propriété "password"
  // On ne renvoie JAMAIS le hash au frontend (même hashé)
}

// Pourquoi 2 types séparés ?
// User = tout (pour queries DB internes)
// UserResponse = filtré (pour API responses)

// TYPES LIÉS À L'AUTHENTIFICATION

// Données REÇUES lors de l'inscription
export interface RegisterDTO {
  email: string;
  // Email fourni par l'utilisateur

  password: string;
  // Mot de passe EN CLAIR (temporairement)
  // Sera hashé par bcrypt avant stockage en DB

  name?: string;
  // Nom optionnel
}

// DTO = Data Transfer Object
// Objet utilisé pour TRANSFÉRER des données (frontend → backend)

// Données REÇUES lors de la connexion
export interface LoginDTO {
  email: string;
  password: string;
  // Mot de passe EN CLAIR (pour vérification)
  // On va comparer avec le hash en DB via bcrypt.compare()
}

// Données RETOURNÉES après login/register réussi
export interface AuthResponse {
  token: string;

  user: UserResponse;
  // Informations de l'utilisateur (SANS password)
}

// TYPES LIÉS AU JWT

// Données ENCODÉES dans le JWT token
export interface JWTPayload {
  userId: number;
  // ID de l'utilisateur
  // Permet de récupérer l'user dans les routes protégées

  email: string;
  // Email (pratique pour logs, debug)
}

// TYPE POUR LES REQUÊTES EXPRESS AVEC AUTH

// Extension du type Request d'Express
import { Request } from "express";

export interface AuthRequest extends Request {
  user?: JWTPayload;
  // Propriété ajoutée par le middleware authMiddleware
  // Contient les infos du JWT décodé
}
