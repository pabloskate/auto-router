import { AUTH } from "./constants";

const keyCache = new Map<string, Promise<CryptoKey>>();

function cleanSecret(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length >= AUTH.BYOK_ENCRYPTION_SECRET_MIN_LENGTH ? trimmed : null;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || /[^a-fA-F0-9]/.test(hex)) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    const value = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
    if (Number.isNaN(value)) {
      return null;
    }
    bytes[index] = value;
  }

  return bytes;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const cached = keyCache.get(secret);
  if (cached) {
    return cached;
  }

  const deriving = (async () => {
    const secretBytes = new TextEncoder().encode(secret);
    const digest = await crypto.subtle.digest("SHA-256", secretBytes);
    return crypto.subtle.importKey(
      "raw",
      digest,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
  })();

  keyCache.set(secret, deriving);
  return deriving;
}

export function resolveByokEncryptionSecret(args: {
  byokSecret?: string | null;
  adminSecret?: string | null;
}): string | null {
  return cleanSecret(args.byokSecret) ?? cleanSecret(args.adminSecret) ?? null;
}

export async function encryptByokSecret(args: {
  plaintext: string;
  secret: string;
}): Promise<string> {
  const key = await deriveKey(args.secret);
  const iv = new Uint8Array(AUTH.BYOK_AES_GCM_IV_BYTES);
  crypto.getRandomValues(iv);

  const plaintextBytes = new TextEncoder().encode(args.plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintextBytes
  );

  return `${bytesToHex(iv)}:${bytesToHex(new Uint8Array(encrypted))}`;
}

export async function decryptByokSecret(args: {
  ciphertext: string;
  secret: string;
}): Promise<string | null> {
  const [ivHex, cipherHex] = args.ciphertext.split(":");
  if (!ivHex || !cipherHex) {
    return null;
  }

  const iv = hexToBytes(ivHex);
  const encrypted = hexToBytes(cipherHex);
  if (!iv || !encrypted || iv.length !== AUTH.BYOK_AES_GCM_IV_BYTES) {
    return null;
  }

  try {
    const key = await deriveKey(args.secret);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as BufferSource },
      key,
      encrypted.buffer as BufferSource
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}
