/**
 * AES-256 encryption service using crypto-js.
 * Uses PBKDF2 for key derivation from user password.
 * CBC mode requires an IV (initialization vector); we generate one per encryption
 * and store as "ivHex:ctBase64" so decryption can use the same IV.
 */
import CryptoJS from 'crypto-js/crypto-js.js';

const STORAGE_KEY = 'expense_analyzer_enc';
const SALT_KEY = 'expense_analyzer_salt';
const ITERATIONS = 10000;
const KEY_SIZE = 256 / 32;
const IV_SIZE_BYTES = 128 / 8; // AES block size

let derivedKey: CryptoJS.lib.WordArray | null = null;

/**
 * Generate a random salt (128 bits)
 */
function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
}

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: string): CryptoJS.lib.WordArray {
  return CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
    keySize: KEY_SIZE,
    iterations: ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
}

/**
 * Encrypt with a random IV. Returns "ivHex:ctBase64" so decrypt can reuse IV.
 */
function encryptWithIv(plaintext: string, key: CryptoJS.lib.WordArray): string {
  const iv = CryptoJS.lib.WordArray.random(IV_SIZE_BYTES);
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, { iv });
  const ivHex = encrypted.iv!.toString(CryptoJS.enc.Hex);
  const ctBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
  return `${ivHex}:${ctBase64}`;
}

/**
 * Decrypt payload in "ivHex:ctBase64" format.
 */
function decryptWithIv(payload: string, key: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray {
  const colon = payload.indexOf(':');
  if (colon === -1) throw new Error('Invalid encrypted format.');
  const ivHex = payload.slice(0, colon);
  const ctBase64 = payload.slice(colon + 1);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const ciphertext = CryptoJS.enc.Base64.parse(ctBase64);
  const params = CryptoJS.lib.CipherParams.create({ ciphertext });
  const bytes = CryptoJS.AES.decrypt(params, key, { iv });
  return bytes;
}

/**
 * Initialize encryption with user password. Generates salt and stores encrypted verification.
 */
export async function initializeEncryption(password: string): Promise<void> {
  try {
    const salt = generateSalt();
    const key = deriveKey(password, salt);
    localStorage.setItem(SALT_KEY, salt);
    const verification = encryptWithIv('verified', key);
    localStorage.setItem(STORAGE_KEY, verification);
    derivedKey = key;
  } catch (err) {
    console.error('Encryption init error:', err);
    throw new Error('Failed to set up encryption. Please try again.');
  }
}

/**
 * Load derived key from password (for login). Verifies against stored cipher.
 */
export async function loadEncryption(password: string): Promise<boolean> {
  try {
    const salt = localStorage.getItem(SALT_KEY);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!salt || !stored) return false;
    const key = deriveKey(password, salt);
    const bytes = decryptWithIv(stored, key);
    const str = bytes.toString(CryptoJS.enc.Utf8);
    if (str === 'verified') {
      derivedKey = key;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if encryption has been set up (salt and verification exist)
 */
export function isEncryptionSetup(): boolean {
  return !!(localStorage.getItem(SALT_KEY) && localStorage.getItem(STORAGE_KEY));
}

/**
 * Ensure key is loaded; throw if not authenticated
 */
function ensureKey(): CryptoJS.lib.WordArray {
  if (!derivedKey) {
    throw new Error('Encryption not initialized. Please log in.');
  }
  return derivedKey;
}

/**
 * Encrypt plaintext string. Uses AES-256-CBC with random IV per call.
 */
export function encrypt(data: string): string {
  try {
    const key = ensureKey();
    return encryptWithIv(data, key);
  } catch (err) {
    console.error('Encrypt error:', err);
    throw new Error('Failed to encrypt data.');
  }
}

/**
 * Decrypt payload (format "ivHex:ctBase64").
 */
export function decrypt(data: string): string {
  try {
    const key = ensureKey();
    const bytes = decryptWithIv(data, key);
    const str = bytes.toString(CryptoJS.enc.Utf8);
    if (!str) throw new Error('Decryption failed.');
    return str;
  } catch (err) {
    console.error('Decrypt error:', err);
    throw new Error('Failed to decrypt data.');
  }
}

/**
 * Change password: re-encrypt verification with new key and update salt.
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const ok = await loadEncryption(oldPassword);
  if (!ok) throw new Error('Current password is incorrect.');
  await initializeEncryption(newPassword);
}

/**
 * Clear in-memory key (logout)
 */
export function clearEncryption(): void {
  derivedKey = null;
}
