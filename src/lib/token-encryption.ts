import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { requireEnv } from "@/lib/env";

const ENCRYPTED_PREFIX = "enc:v1";
const GCM_AUTH_TAG_LENGTH = 16;

export const AUTH_TOKEN_ENCRYPTION_CONTEXT = "ambassador:hca-access-token";

function getEncryptionKey(context: string) {
  return createHash("sha256")
    .update(`${context}:${requireEnv("JWT_SECRET")}`)
    .digest();
}

export function isEncryptedToken(value: string | null | undefined) {
  return Boolean(value?.startsWith(`${ENCRYPTED_PREFIX}:`));
}

export function encryptToken(token: string, context = AUTH_TOKEN_ENCRYPTION_CONTEXT) {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new Error("Cannot encrypt an empty token");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(context), iv, {
    authTagLength: GCM_AUTH_TAG_LENGTH,
  });
  const ciphertext = Buffer.concat([cipher.update(trimmedToken, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptToken(
  token: string,
  contexts: string | string[] = AUTH_TOKEN_ENCRYPTION_CONTEXT,
) {
  const parts = token.split(":");

  if (
    parts.length !== 5 ||
    parts[0] !== "enc" ||
    parts[1] !== "v1"
  ) {
    return null;
  }

  const [, , ivValue, authTagValue, ciphertextValue] = parts;
  const decryptionContexts = Array.isArray(contexts) ? contexts : [contexts];

  for (const context of decryptionContexts) {
    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        getEncryptionKey(context),
        Buffer.from(ivValue, "base64url"),
        {
          authTagLength: GCM_AUTH_TAG_LENGTH,
        },
      );

      decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));

      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(ciphertextValue, "base64url")),
        decipher.final(),
      ]).toString("utf8");

      return plaintext || null;
    } catch {
      continue;
    }
  }

  return null;
}
