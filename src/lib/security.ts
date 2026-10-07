import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
export function equalSecret(a:string,b:string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(),createHash("sha256").update(b).digest());
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex || expectedHex.length !== 128) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expectedHex, "hex"));
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const expected = process.env.APP_URL ? new URL(process.env.APP_URL).origin : `${request.headers.get("x-forwarded-proto") ?? "http"}://${host}`;
  return origin === expected;
}
