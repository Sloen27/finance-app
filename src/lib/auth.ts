import { cookies } from 'next/headers'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const SECRET_KEY = process.env.AUTH_SECRET || 'your-secret-key-change-in-production'
const ALGORITHM = 'aes-256-cbc'

// Derive a key from the secret
const getEncryptionKey = () => {
  return scryptSync(SECRET_KEY, 'salt', 32)
}

// Encrypt session data (Node.js runtime only)
export function encryptSession(data: { userId: string; expiresAt: number }): string {
  const key = getEncryptionKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
  encrypted += cipher.final('hex')

  return iv.toString('hex') + ':' + encrypted
}

// Decrypt session data (Node.js runtime only)
export function decryptSession(token: string): { userId: string; expiresAt: number } | null {
  try {
    const key = getEncryptionKey()
    const [ivHex, encrypted] = token.split(':')

    if (!ivHex || !encrypted) return null

    const iv = Buffer.from(ivHex, 'hex')
    const decipher = createDecipheriv(ALGORITHM, key, iv)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    const data = JSON.parse(decrypted)

    // Check if session expired
    if (data.expiresAt < Date.now()) {
      return null
    }

    return data
  } catch {
    return null
  }
}

// Simple session verification for Edge Runtime (middleware)
export function verifySessionSimple(token: string): boolean {
  try {
    // Just check if token has the right format and is not expired
    const parts = token.split(':')
    if (parts.length !== 2) return false

    // Try to extract and validate expiry from the token
    // Format: iv:encrypted_data where encrypted_data contains { userId, expiresAt }
    // For Edge, we'll do a simple format check
    // The actual decryption will happen in API routes

    // Check if it looks like a valid token (has iv and data parts)
    if (!parts[0] || !parts[1]) return false
    if (parts[0].length !== 32) return false // IV should be 16 bytes = 32 hex chars

    return true
  } catch {
    return false
  }
}

// Create session cookie (Node.js runtime only)
export async function createSession(userId: string): Promise<void> {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days

  const token = encryptSession({ userId, expiresAt })

  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  })
}

// Get current session (Node.js runtime only)
export async function getSession(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (!token) return null

  return decryptSession(token)
}

// Delete session (logout) - works in both runtimes
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

// Simple password verification
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':')
  if (!salt || !hash) return false

  const key = scryptSync(password, salt, 64)
  return key.toString('hex') === hash
}

// Hash password
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const key = scryptSync(password, salt, 64)
  return salt + ':' + key.toString('hex')
}
