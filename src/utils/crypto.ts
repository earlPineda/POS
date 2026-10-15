/**
 * Web Crypto AES-GCM Encrypted Backup & Restore Utilities
 * Uses PBKDF2 (SHA-256, 100,000 iterations) to derive a 256-bit AES-GCM key from a user passphrase.
 */

export async function encryptBackup(data: any, passphrase: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Import passphrase as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive AES-GCM key
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const jsonString = JSON.stringify(data);
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    enc.encode(jsonString)
  );

  // Package as payload container with version and timestamp
  const payload = {
    version: '1.0',
    app: 'Matcha Classic POS & Inventory',
    createdAt: new Date().toISOString(),
    salt: Array.from(salt),
    iv: Array.from(iv),
    cipherData: Array.from(new Uint8Array(encrypted)),
  };

  return JSON.stringify(payload, null, 2);
}

export async function decryptBackup(jsonPayloadString: string, passphrase: string): Promise<any> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const payload = JSON.parse(jsonPayloadString);
  if (!payload.salt || !payload.iv || !payload.cipherData) {
    throw new Error('Invalid backup file format: missing encryption headers.');
  }

  const salt = new Uint8Array(payload.salt);
  const iv = new Uint8Array(payload.iv);
  const cipherData = new Uint8Array(payload.cipherData);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      cipherData
    );

    const decryptedString = dec.decode(decrypted);
    return JSON.parse(decryptedString);
  } catch {
    throw new Error('Decryption failed. Incorrect passphrase or corrupted backup file.');
  }
}
