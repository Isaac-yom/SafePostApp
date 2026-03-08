import pool from "../config/database";
// Connexion PostgreSQL

import bcrypt from "bcrypt";
// Bibliothèque pour hash et vérifier les passwords

import { RegisterDTO, User, UserResponse } from "../types";
// Types définis précédemment

const SALT_ROUNDS = 10;

export class UserModel {
  // MÉTHODE 1 : CRÉER UN UTILISATEUR

  static async create(data: RegisterDTO): Promise<UserResponse> {
    const { email, password, name } = data;

    // 1. HASH DU PASSWORD
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 2. REQUÊTE SQL (INSERT)
    const query = `
      INSERT INTO users (email, password, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, created_at
    `;

    // 3. EXÉCUTION
    const result = await pool.query(query, [email, hashedPassword, name]);
    // Paramètres passés séparément (protection SQL injection)

    // 4. RETOUR
    return result.rows[0];
  }

  // MÉTHODE 2 : TROUVER PAR EMAIL

  static async findByEmail(email: string): Promise<User | null> {
    const query = "SELECT * FROM users WHERE email = $1";

    const result = await pool.query(query, [email]);

    return result.rows[0] || null;
  }

  // MÉTHODE 3 : TROUVER PAR ID

  static async findById(id: number): Promise<UserResponse | null> {
    const query = "SELECT id, email, name, created_at FROM users WHERE id = $1";

    const result = await pool.query(query, [id]);

    return result.rows[0] || null;
  }

  // MÉTHODE 4 : VÉRIFIER LE PASSWORD

  static async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // MÉTHODE 5 : FORMATER USER (utilitaire)

  static formatUser(user: User): UserResponse {
    const { password, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }
}
