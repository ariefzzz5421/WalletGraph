import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SITE_COOKIE = "wg_site_access";
export const SITE_COOKIE_AGE = 60 * 60 * 24 * 7;

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function makeSiteSession(secret: string, now = Date.now()) {
  if (secret.length < 32) throw new Error("Site session secret is not configured");
  const expiry = Math.floor(now / 1000) + SITE_COOKIE_AGE;
  const payload = `${expiry}.${randomBytes(16).toString("base64url")}`;
  return `${payload}.${signature(payload, secret)}`;
}

export function validSiteSession(value: string | undefined, secret: string | undefined, now = Date.now()) {
  if (!value || !secret || secret.length < 32) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || !/^\d{10}$/.test(parts[0]) || !/^[A-Za-z0-9_-]{22}$/.test(parts[1]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[2])) return false;
  const expiry = Number(parts[0]);
  if (expiry <= Math.floor(now / 1000) || expiry > Math.floor(now / 1000) + SITE_COOKIE_AGE) return false;
  const expected = signature(`${parts[0]}.${parts[1]}`, secret);
  const provided = Buffer.from(parts[2]);
  return provided.length === expected.length && timingSafeEqual(provided, Buffer.from(expected));
}
