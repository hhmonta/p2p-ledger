// Capa de seguridad para P2P Ledger.
// Usa Web Crypto API (disponible en navegador y Capacitor WebView).
//
// Modelo:
//   - El usuario define un PIN (4-8 dígitos).
//   - Derivamos una clave KEK del PIN con PBKDF2 (210k iteraciones, SHA-256).
//   - Generamos una DEK aleatoria de 256 bits para cifrar los datos.
//   - Ciframos la DEK con la KEK y la guardamos junto con el hash de verificación del PIN.
//   - En memoria guardamos solo la DEK mientras la app está desbloqueada.
//
// Esto permite:
//   - Cambiar PIN sin recifrar todos los datos (solo recifrar la DEK).
//   - Verificar el PIN sin almacenarlo en claro.
//   - Cifrar entradas de localStorage con AES-GCM.

const enc = new TextEncoder()
const dec = new TextDecoder()

const PBKDF2_ITERATIONS = 210_000
const SALT_LENGTH = 16 // bytes
const IV_LENGTH = 12 // bytes (recomendado para AES-GCM)
const KEY_LENGTH = 256 // bits

export interface PinRecord {
  /** Hash del PIN para verificación (PBKDF2 con iterations altas) */
  pinHash: string // base64
  /** Salt usado para derivar tanto el hash como la KEK */
  salt: string // base64
  /** Iteraciones de PBKDF2 */
  iterations: number
  /** DEK cifrada con la KEK derivada del PIN */
  wrappedDek: string // base64 (iv + ciphertext)
  /** Versión del esquema */
  v: 1
}

export interface AuthConfig {
  /** Si el PIN está activado */
  pinEnabled: boolean
  /** Registro del PIN (hash + DEK envuelta) */
  pinRecord: PinRecord | null
  /** Timeout de auto-bloqueo en segundos (0 = nunca) */
  autoLockSeconds: number
  /** Timestamp del último desbloqueo */
  lastUnlock: number | null
  /** Intentos fallidos consecutivos */
  failedAttempts: number
  /** Timestamp hasta el cual está bloqueado por intentos fallidos */
  lockedUntil: number | null
  /** Si bloquear screenshots en Android */
  blockScreenshots: boolean
}

const AUTH_CONFIG_KEY = 'p2p:auth'

// ---------- utilidades base64 ----------

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function b64ToBuf(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// ---------- derivación de claves ----------

async function deriveKek(pin: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey', 'deriveBits']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
  )
}

async function derivePinHash(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    256
  )
  return bufToB64(bits)
}

function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: KEY_LENGTH }, true, [
    'encrypt',
    'decrypt',
  ])
}

async function wrapDek(dek: CryptoKey, kek: CryptoKey): Promise<string> {
  // Exportamos la DEK a raw bytes y la ciframos con AES-GCM usando la KEK
  const rawDek = await crypto.subtle.exportKey('raw', dek)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, rawDek)
  // Combinamos iv + ciphertext
  const combined = new Uint8Array(iv.length + ct.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ct), iv.length)
  return bufToB64(combined)
}

async function unwrapDek(wrapped: string, kek: CryptoKey): Promise<CryptoKey> {
  const combined = b64ToBuf(wrapped)
  const iv = combined.slice(0, IV_LENGTH)
  const ct = combined.slice(IV_LENGTH)
  const rawDek = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, kek, ct)
  return crypto.subtle.importKey('raw', rawDek, { name: 'AES-GCM', length: KEY_LENGTH }, true, [
    'encrypt',
    'decrypt',
  ])
}

// ---------- API pública ----------

/** Crea un nuevo registro de PIN a partir de un PIN en claro. Devuelve el registro + la DEK en memoria. */
export async function createPinRecord(pin: string): Promise<{ record: PinRecord; dek: CryptoKey }> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iterations = PBKDF2_ITERATIONS
  const [pinHash, kek, dek] = await Promise.all([
    derivePinHash(pin, salt, iterations),
    deriveKek(pin, salt, iterations),
    generateDek(),
  ])
  const wrappedDek = await wrapDek(dek, kek)
  return {
    record: { pinHash, salt: bufToB64(salt), iterations, wrappedDek, v: 1 },
    dek,
  }
}

/** Verifica el PIN y devuelve la DEK si es correcto. Lanza error si no coincide. */
export async function verifyPinAndUnwrap(pin: string, record: PinRecord): Promise<CryptoKey> {
  const salt = b64ToBuf(record.salt)
  const pinHash = await derivePinHash(pin, salt, record.iterations)
  if (pinHash !== record.pinHash) {
    throw new Error('PIN incorrecto')
  }
  const kek = await deriveKek(pin, salt, record.iterations)
  return unwrapDek(record.wrappedDek, kek)
}

/** Recifra la DEK con un nuevo PIN (sin tocar los datos). Requiere la DEK en memoria. */
export async function changePin(
  oldPin: string,
  newPin: string,
  record: PinRecord,
  dek: CryptoKey
): Promise<PinRecord> {
  // Verificar PIN antiguo primero
  const salt = b64ToBuf(record.salt)
  const oldHash = await derivePinHash(oldPin, salt, record.iterations)
  if (oldHash !== record.pinHash) throw new Error('PIN actual incorrecto')
  // Crear nuevo registro con nuevo PIN pero misma DEK
  const newSalt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const [newHash, newKek] = await Promise.all([
    derivePinHash(newPin, newSalt, PBKDF2_ITERATIONS),
    deriveKek(newPin, newSalt, PBKDF2_ITERATIONS),
  ])
  const newWrapped = await wrapDek(dek, newKek)
  return { pinHash: newHash, salt: bufToB64(newSalt), iterations: PBKDF2_ITERATIONS, wrappedDek: newWrapped, v: 1 }
}

// ---------- cifrado de datos ----------

export async function encryptJson(data: unknown, dek: CryptoKey): Promise<string> {
  const json = JSON.stringify(data)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, enc.encode(json))
  const combined = new Uint8Array(iv.length + ct.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ct), iv.length)
  return bufToB64(combined)
}

export async function decryptJson<T>(payload: string, dek: CryptoKey): Promise<T> {
  const combined = b64ToBuf(payload)
  const iv = combined.slice(0, IV_LENGTH)
  const ct = combined.slice(IV_LENGTH)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, dek, ct)
  return JSON.parse(dec.decode(pt)) as T
}

// ---------- gestión de configuración ----------

export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getAuthConfig(): AuthConfig {
  if (!isBrowser()) {
    return {
      pinEnabled: false,
      pinRecord: null,
      autoLockSeconds: 300, // 5 min por defecto
      lastUnlock: null,
      failedAttempts: 0,
      lockedUntil: null,
      blockScreenshots: true,
    }
  }
  try {
    const raw = window.localStorage.getItem(AUTH_CONFIG_KEY)
    if (!raw) {
      return {
        pinEnabled: false,
        pinRecord: null,
        autoLockSeconds: 300,
        lastUnlock: null,
        failedAttempts: 0,
        lockedUntil: null,
        blockScreenshots: true,
      }
    }
    const parsed = JSON.parse(raw) as Partial<AuthConfig>
    return {
      pinEnabled: parsed.pinEnabled ?? false,
      pinRecord: parsed.pinRecord ?? null,
      autoLockSeconds: parsed.autoLockSeconds ?? 300,
      lastUnlock: parsed.lastUnlock ?? null,
      failedAttempts: parsed.failedAttempts ?? 0,
      lockedUntil: parsed.lockedUntil ?? null,
      blockScreenshots: parsed.blockScreenshots ?? true,
    }
  } catch {
    return {
      pinEnabled: false,
      pinRecord: null,
      autoLockSeconds: 300,
      lastUnlock: null,
      failedAttempts: 0,
      lockedUntil: null,
      blockScreenshots: true,
    }
  }
}

export function saveAuthConfig(config: AuthConfig): void {
  if (!isBrowser()) return
  window.localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify(config))
}

export function clearAuthConfig(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(AUTH_CONFIG_KEY)
}

// Constantes de bloqueo por intentos fallidos
export const MAX_FAILED_ATTEMPTS = 5
export const LOCKOUT_BASE_SECONDS = 30 // 30s, luego 60s, 120s, 240s, 480s...

export function getLockoutSeconds(failedAttempts: number): number {
  if (failedAttempts < MAX_FAILED_ATTEMPTS) return 0
  const exp = failedAttempts - MAX_FAILED_ATTEMPTS
  return LOCKOUT_BASE_SECONDS * Math.pow(2, exp)
}

// Validación de PIN
export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin)
}
