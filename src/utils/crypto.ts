const ITERATIONS = 100000;
const KEY_LEN = 256;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Verschlüsselt einen Text (z.B. JSON) mit einem Passwort per AES-GCM.
 */
export async function encryptData(data: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const rawData = encoder.encode(data);

  // Erzeuge zufälligen Salt (16 Bytes) und IV (12 Bytes)
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Importiere Passwort als Basis-Key
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Leite AES-GCM Key ab
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LEN },
    false,
    ['encrypt']
  );

  // Verschlüssele die Daten
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    rawData
  );

  // Kombiniere Salt, IV und Ciphertext in einem einzigen Buffer:
  // Layout: [salt (16 Bytes)][iv (12 Bytes)][ciphertext (Rest)]
  const combined = new Uint8Array(salt.byteLength + iv.byteLength + encryptedBuffer.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.byteLength);
  combined.set(new Uint8Array(encryptedBuffer), salt.byteLength + iv.byteLength);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Entschlüsselt einen AES-GCM-verschlüsselten Text mit einem Passwort.
 */
export async function decryptData(encryptedBase64: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Konvertiere Base64-String zurück in Buffer
  let combined: Uint8Array;
  try {
    combined = new Uint8Array(base64ToArrayBuffer(encryptedBase64));
  } catch (e) {
    throw new Error('Ungültiges Datenformat (kein Base64)');
  }

  if (combined.byteLength < 28) {
    throw new Error('Ungültiges Datenformat (Datei zu kurz)');
  }

  // Extrahiere Salt (erste 16 Bytes), IV (nächste 12 Bytes) und Ciphertext
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  // Importiere Passwort als Basis-Key
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Leite AES-GCM Key ab
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LEN },
    false,
    ['decrypt']
  );

  try {
    // Entschlüssele die Daten
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );

    return decoder.decode(decryptedBuffer);
  } catch (e) {
    throw new Error('Falsches Passwort oder beschädigte Datei');
  }
}
