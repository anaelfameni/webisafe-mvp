/**
 * Schémas de validation Zod pour les formulaires et API
 * Utilise Zod pour une validation stricte des entrées utilisateur
 */

import { z } from 'zod';

/**
 * Schéma de validation pour l'email
 */
export const emailSchema = z
  .string()
  .min(1, 'L\'email est requis')
  .email('Adresse email invalide')
  .max(255, 'L\'email ne peut pas dépasser 255 caractères');

/**
 * Schéma de validation pour le mot de passe
 */
export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères');

/**
 * Schéma de validation pour le nom
 */
export const nameSchema = z
  .string()
  .min(2, 'Le nom doit contenir au moins 2 caractères')
  .max(100, 'Le nom ne peut pas dépasser 100 caractères')
  .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom contient des caractères invalides');

/**
 * Schéma de validation pour le téléphone
 */
export const phoneSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || /^\+?[\d\s-]{8,20}$/.test(val),
    'Numéro de téléphone invalide'
  );

/**
 * Schéma de validation pour l'URL
 */
export const urlSchema = z
  .string()
  .min(1, 'L\'URL est requise')
  .url('URL invalide')
  .max(2048, 'L\'URL ne peut pas dépasser 2048 caractères')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    'L\'URL doit commencer par http:// ou https://'
  );

/**
 * Schéma de validation pour le message
 */
export const messageSchema = z
  .string()
  .min(10, 'Le message doit contenir au moins 10 caractères')
  .max(5000, 'Le message ne peut pas dépasser 5000 caractères');

/**
 * Schéma de validation pour le sujet
 */
export const subjectSchema = z
  .string()
  .optional()
  .max(200, 'Le sujet ne peut pas dépasser 200 caractères');

/**
 * Schéma de validation pour l'inscription
 */
export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
});

/**
 * Schéma de validation pour la connexion
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Schéma de validation pour le scan
 */
export const scanSchema = z.object({
  url: urlSchema,
  email: emailSchema,
});

/**
 * Schéma de validation pour le formulaire de contact
 */
export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  subject: subjectSchema,
  message: messageSchema,
});

/**
 * Schéma de validation pour le paiement
 */
export const paymentSchema = z.object({
  payment_code: z
    .string()
    .min(1, 'Le code de paiement est requis')
    .max(50, 'Le code de paiement ne peut pas dépasser 50 caractères'),
  user_email: emailSchema,
  scan_id: z
    .string()
    .min(1, 'L\'ID du scan est requis'),
  url_to_audit: urlSchema,
  wave_phone: z
    .string()
    .min(1, 'Le numéro Wave est requis')
    .regex(/^\+?\d{8,20}$/, 'Numéro Wave invalide'),
});

/**
 * Schéma de validation pour l'inscription partenaire
 */
export const partnerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: z
    .string()
    .min(1, 'Le numéro de téléphone est requis')
    .regex(/^\+?\d{8,20}$/, 'Numéro de téléphone invalide'),
  channel: z
    .string()
    .min(1, 'Le canal de recommandation est requis')
    .max(100, 'Le canal ne peut pas dépasser 100 caractères'),
});

/**
 * Limite la taille du payload
 * @param {string} json - Le payload JSON à valider
 * @param {number} maxSize - La taille maximale en octets (défaut: 1MB)
 * @throws {Error} Si le payload dépasse la taille maximale
 */
export function validatePayloadSize(json, maxSize = 1024 * 1024) {
  const size = new Blob([json]).size;
  if (size > maxSize) {
    throw new Error(`Payload trop volumineux (${Math.round(size / 1024)}KB, max: ${Math.round(maxSize / 1024)}KB)`);
  }
  return true;
}

/**
 * Valide un payload JSON avec un schéma Zod
 * @param {any} data - Les données à valider
 * @param {z.ZodSchema} schema - Le schéma Zod
 * @returns {Object} Les données validées
 * @throws {Error} Si la validation échoue
 */
export function validateWithSchema(data, schema) {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error.errors) {
      const messages = error.errors.map(e => e.message).join(', ');
      throw new Error(`Validation échouée: ${messages}`);
    }
    throw error;
  }
}
