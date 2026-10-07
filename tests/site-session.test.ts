import assert from "node:assert/strict";
import test from "node:test";
import { makeSiteSession, SITE_COOKIE_AGE, validSiteSession } from "../src/lib/site-session";

const secret = "this-is-a-test-only-session-secret-with-32-characters";

test("site access cookie expires and rejects tampering", () => {
  const now = Date.UTC(2026, 9, 8);
  const cookie = makeSiteSession(secret, now);
  assert.equal(validSiteSession(cookie, secret, now), true);
  assert.equal(validSiteSession(cookie, secret, now + SITE_COOKIE_AGE * 1000), false);
  assert.equal(validSiteSession(cookie.replace(/.$/, "x"), secret, now), false);
  assert.equal(validSiteSession(cookie, `${secret}-changed`, now), false);
  assert.equal(validSiteSession(undefined, secret, now), false);
});
