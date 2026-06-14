#!/usr/bin/env node
/**
 * Bump the app version across the THREE files that must stay in lockstep:
 *   - src-tauri/tauri.conf.json   → the installer + auto-updater version (authoritative)
 *   - src-tauri/Cargo.toml        → the Rust crate version (shown as "App version" in Settings)
 *   - package.json                → the npm package version (kept in sync for sanity)
 *
 * Usage:
 *   node tools/bump-version.mjs 1.0.1
 *
 * Then commit and tag — pushing the tag triggers the GitHub release build:
 *   git commit -am "release: v1.0.1"
 *   git tag v1.0.1 && git push origin master --tags
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v ?? "")) {
  console.error("Usage: node tools/bump-version.mjs <x.y.z>   (e.g. 1.0.1)");
  process.exit(1);
}

// tauri.conf.json
const confPath = path.join(root, "src-tauri/tauri.conf.json");
const conf = JSON.parse(fs.readFileSync(confPath, "utf8"));
const from = conf.version;
conf.version = v;
fs.writeFileSync(confPath, JSON.stringify(conf, null, 2) + "\n");

// package.json
const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.version = v;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// Cargo.toml — only the standalone `version = "..."` line under [package].
const cargoPath = path.join(root, "src-tauri/Cargo.toml");
const cargo = fs.readFileSync(cargoPath, "utf8").replace(/^version = ".*"$/m, `version = "${v}"`);
fs.writeFileSync(cargoPath, cargo);

console.log(`\n  Version ${from} → ${v} (tauri.conf.json, Cargo.toml, package.json)\n`);
console.log("  Next:");
console.log(`    git commit -am "release: v${v}"`);
console.log(`    git tag v${v} && git push origin master --tags\n`);
console.log("  The GitHub Action then builds the signed installer + latest.json and publishes the release.\n");
