#!/usr/bin/env node
/**
 * NamAsta Diagnostics — activation-key generator (vendor-only).
 *
 * Signs a license with your PRIVATE key (tools/license-key.secret, never shipped).
 * The app embeds only the matching PUBLIC key and can VERIFY keys but never mint them —
 * so a customer cannot forge their own. The device list is INSIDE the signature, so a key
 * locked to 2 PCs can never be edited to add a 3rd — a 3rd computer is refused outright.
 *
 * Pricing model:
 *   New lab (first registration) : ₹5,000  → 1 year  → use "yearly"
 *   Annual renewal               : ₹1,000  → 1 year  → use "yearly"
 *   Your own labs                : lifetime → use "lifetime"
 *
 * ── Customer keys are ALWAYS locked to 1–2 device IDs (max 2 PCs per key) ──
 *   node tools/gen-license.mjs "City Diagnostics" yearly A3F90C12B4D7
 *   node tools/gen-license.mjs "City Diagnostics" yearly A3F90C12B4D7 9B2E71FA0C44
 * The lab reads its "Device ID" off the activation screen and sends it with payment. To put
 * one key on two PCs, collect BOTH Device IDs and pass both here.
 *
 * ── Add a 2nd device to an EXISTING key later (re-sign, same lab/plan/expiry) ──
 *   node tools/gen-license.mjs add-device <existingKey> 9B2E71FA0C44
 *
 * ── Unlocked key (works on ANY PC) — for YOUR OWN machines only ──
 *   node tools/gen-license.mjs "Sharma Clinical Laboratory" lifetime --unlocked
 * Without --unlocked, a key with no device IDs is REFUSED (so a customer key is never uncapped).
 *
 * Give the printed "Activation key" to the lab after they pay; they paste it in the app.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAN_DAYS = { monthly: 31, yearly: 366, triennial: 1096, lifetime: 36500 };
// Device IDs are SHA-256(machine-id) truncated to 12 upper-hex chars (see getDeviceFingerprint).
const DEVICE_RE = /^[0-9A-F]{12}$/;

function b64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s) {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  return Buffer.from(t, "base64");
}
function loadPrivateKey() {
  const p = path.join(__dirname, "license-key.secret");
  if (!fs.existsSync(p)) { console.error("Missing private key: " + p); process.exit(1); }
  const privB64 = fs.readFileSync(p, "utf8").trim();
  return crypto.createPrivateKey({ key: Buffer.from(privB64, "base64"), format: "der", type: "pkcs8" });
}
function sign(payload, privateKey) {
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)));
  // IEEE-P1363 (raw r||s) so the browser's WebCrypto can verify it directly.
  const sig = crypto.sign("sha256", Buffer.from(payloadB64), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return payloadB64 + "." + b64url(sig);
}
function print(payload, key) {
  const locked = Array.isArray(payload.dev) && payload.dev.length;
  console.log("\n  Lab:     " + payload.lab);
  console.log("  Plan:    " + payload.plan);
  console.log("  Expires: " + new Date(payload.exp * 1000).toDateString());
  console.log("  Devices: " + (locked ? payload.dev.join(", ") + ` (LOCKED — max 2 PCs)` : "⚠  UNLOCKED — works on ANY PC (your own machines only!)"));
  console.log("\n  ── Activation key (send to the lab) ──\n");
  console.log("  " + key + "\n");
}

const privateKey = loadPrivateKey();

// ── Mode: add-device <existingKey> <newDeviceId> — grow a 1-device key to 2, same lab/plan/exp ──
if (process.argv[2] === "add-device") {
  const existing = (process.argv[3] || "").trim();
  const newId = (process.argv[4] || "").trim().toUpperCase();
  if (!existing || !newId) {
    console.error('Usage: node tools/gen-license.mjs add-device <existingKey> <newDeviceId>');
    process.exit(1);
  }
  if (!DEVICE_RE.test(newId)) {
    console.error(`Invalid Device ID "${newId}". Expected 12 hex characters (0-9, A-F), e.g. A3F90C12B4D7.`);
    process.exit(1);
  }
  const dot = existing.indexOf(".");
  if (dot <= 0) { console.error("That doesn't look like an activation key (no payload.signature)."); process.exit(1); }
  let payload;
  try { payload = JSON.parse(fromB64url(existing.slice(0, dot)).toString("utf8")); }
  catch { console.error("Could not decode the existing key's payload."); process.exit(1); }
  const devs = Array.isArray(payload.dev) ? payload.dev.map((d) => String(d).toUpperCase()) : [];
  if (devs.includes(newId)) { console.error(`Key already includes ${newId}.`); process.exit(1); }
  if (devs.length >= 2) { console.error("That key is already locked to 2 devices (the maximum). Re-issue a fresh key if you need to change a PC."); process.exit(1); }
  payload.dev = [...devs, newId];
  print(payload, sign(payload, privateKey));
  process.exit(0);
}

// ── Mode: mint a new key ──
const lab = process.argv[2];
const planArg = (process.argv[3] || "yearly").toLowerCase();
if (!lab) {
  console.error('Usage: node tools/gen-license.mjs "Lab Name" [monthly|yearly|triennial|lifetime|<days>] <DeviceId1> [DeviceId2]');
  console.error('   or: node tools/gen-license.mjs add-device <existingKey> <newDeviceId>');
  process.exit(1);
}
const days = PLAN_DAYS[planArg] ?? parseInt(planArg, 10);
if (!Number.isFinite(days) || days <= 0) { console.error("Invalid plan/days: " + planArg); process.exit(1); }

// Args after the plan: device fingerprints (max 2), plus an optional --unlocked / mine escape hatch.
const rest = process.argv.slice(4).map((s) => s.trim()).filter(Boolean);
const allowUnlocked = rest.some((a) => /^(--unlocked|mine|--any)$/i.test(a));
const devices = rest.filter((a) => !/^(--unlocked|mine|--any)$/i.test(a)).map((s) => s.toUpperCase());

// Validate every device id up front — a typo would silently lock the lab to a wrong/garbage
// ID and lock them out of their own app.
for (const d of devices) {
  if (!DEVICE_RE.test(d)) {
    console.error(`Invalid Device ID "${d}". Expected 12 hex characters (0-9, A-F), e.g. A3F90C12B4D7.`);
    console.error("Read it off the lab's activation screen (Step 2) exactly.");
    process.exit(1);
  }
}
if (devices.length > 2) { console.error("A key can be locked to at most 2 devices."); process.exit(1); }

// SAFETY: customer keys must be device-locked. Refuse an uncapped key unless the vendor
// explicitly opts in with --unlocked (for their OWN machines only).
if (devices.length === 0 && !allowUnlocked) {
  console.error("\n  Refusing to mint an UNLOCKED key (it would work on unlimited PCs).");
  console.error("  Pass the lab's 1–2 Device IDs (from their activation screen):");
  console.error(`    node tools/gen-license.mjs "${lab}" ${planArg} A3F90C12B4D7 [9B2E71FA0C44]`);
  console.error("  For your OWN machine only, you may force an unlocked key with --unlocked.\n");
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const payload = { lab, plan: planArg, iat: now, exp: now + days * 24 * 60 * 60 };
if (devices.length) payload.dev = devices;
print(payload, sign(payload, privateKey));
