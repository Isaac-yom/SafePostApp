// ==========================================
// IMPORTS
// ==========================================

import pool from "../config/database";
// Connexion PostgreSQL créée précédemment

import bcrypt from "bcrypt";
// Bibliothèque pour hash et vérifier les passwords

import { RegisterDTO, User, UserResponse } from "../types";
// Types définis précédemment

// ==========================================
// CONSTANTE
// ==========================================

const SALT_ROUNDS = 10;
// Nombre de tours pour bcrypt
// 10 = bon équilibre sécurité/performance
// Plus = plus sécurisé mais plus lent

// ==========================================
// CLASSE USER MODEL
// ==========================================

export class UserModel {
  // ========================================
  // MÉTHODE 1 : CRÉER UN UTILISATEUR
  // ========================================

  static async create(data: RegisterDTO): Promise<UserResponse> {
    // Paramètre : { email, password, name? }
    // Retour : { id, email, name, created_at } (sans password)

    const { email, password, name } = data;

    // 1. HASH DU PASSWORD
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    // password = "password123"
    // hashedPassword = "$2b$10$N9qo8uLOickgx2ZMRZoMye..."

    // 2. REQUÊTE SQL (INSERT)
    const query = `
      INSERT INTO users (email, password, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, created_at
    `;
    // $1, $2, $3 = placeholders (sécurisé contre SQL injection)
    // RETURNING = retourner les colonnes spécifiées après l'insert

    // 3. EXÉCUTION
    const result = await pool.query(query, [email, hashedPassword, name]);
    // Paramètres passés séparément (protection SQL injection)

    // 4. RETOUR
    return result.rows[0];
    // rows[0] = première ligne retournée
    // Contient : { id, email, name, created_at }
    // PAS de password (on ne l'a pas demandé dans RETURNING)
  }

  // ========================================
  // MÉTHODE 2 : TROUVER PAR EMAIL
  // ========================================

  static async findByEmail(email: string): Promise<User | null> {
    // Paramètre : email à chercher
    // Retour : User complet (avec password hashé) ou null si non trouvé

    const query = "SELECT * FROM users WHERE email = $1";
    // SELECT * = toutes les colonnes (y compris password)
    // Utilisé UNIQUEMENT pour vérifier le password lors du login

    const result = await pool.query(query, [email]);

    // Retourner le user trouvé, ou null si absent
    return result.rows[0] || null;
    // rows[0] = première ligne
    // || null = si rows[0] est undefined, retourner null
  }

  // ========================================
  // MÉTHODE 3 : TROUVER PAR ID
  // ========================================

  static async findById(id: number): Promise<UserResponse | null> {
    // Paramètre : id de l'utilisateur
    // Retour : UserResponse (sans password) ou null

    const query = "SELECT id, email, name, created_at FROM users WHERE id = $1";
    // Colonnes spécifiques (PAS de password)
    // Utilisé pour retourner des infos au frontend

    const result = await pool.query(query, [id]);

    return result.rows[0] || null;
  }

  // ========================================
  // MÉTHODE 4 : VÉRIFIER LE PASSWORD
  // ========================================

  static async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    // Paramètres :
    // - plainPassword : password en clair saisi par l'user ("password123")
    // - hashedPassword : hash stocké en DB ("$2b$10$N9qo8...")

    // Retour : true si match, false sinon

    return bcrypt.compare(plainPassword, hashedPassword);
    // bcrypt.compare :
    // 1. Extrait le salt du hash
    // 2. Hash plainPassword avec ce salt
    // 3. Compare les 2 hash
    // → true si identiques, false sinon
  }

  // ========================================
  // MÉTHODE 5 : FORMATER USER (utilitaire)
  // ========================================

  static formatUser(user: User): UserResponse {
    // Paramètre : User complet (avec password)
    // Retour : UserResponse (sans password)

    // Destructuring : extraire password, garder le reste
    const { password, ...userWithoutPassword } = user;
    //      ^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^
    //      Ignoré    Tout le reste

    return userWithoutPassword;
    // Retourne : { id, email, name, created_at, updated_at }
  }
}
