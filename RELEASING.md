# Releasing & Updating NamAsta Diagnostics

This is the complete, plain-English guide to shipping the app and pushing updates to every
lab that uses it. You only ever run a few commands — GitHub does the building.

---

## How it works (the 30-second version)

- The app is a **Windows installer** (`.exe`) published on **GitHub Releases**.
- Every installed copy **checks GitHub for a newer version** when it opens (and when an admin
  clicks *Settings → System → Check for updates*).
- If a newer version exists, the app **downloads and installs it, then restarts** — the lab
  staff just click "Update & restart". **Their data is never touched.**
- Updates are **cryptographically signed**. A copy that isn't signed with our private key is
  rejected, so nobody can push a fake update.

---

## One-time setup (already done — for reference)

1. **Update-signing keypair** was generated (`tools` → `npm run tauri signer generate`).
   - **Public key** is embedded in `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`). Safe to share.
   - **Private key** is at `.secrets/namasta-updater.key` (gitignored — never committed) and is
     stored as the GitHub Actions secret **`TAURI_SIGNING_PRIVATE_KEY`**.
2. The GitHub repo is **public**, so the update endpoint is reachable by every lab PC.

> ⚠️ **BACK UP `.secrets/namasta-updater.key` somewhere safe** (password manager / private drive).
> If you lose it you can **never sign another update** — existing labs would be stuck on their
> current version and you'd have to reinstall them all by hand. GitHub can't give the key back
> (secrets are write-only). This is the single most important file in the whole release setup.

---

## Releasing a new version (every time you add a feature or fix a bug)

```bash
# 1. Bump the version everywhere (x.y.z). Use a higher number than the last release.
node tools/bump-version.mjs 1.0.1

# 2. Note what changed at the top of CHANGELOG.md (one or two lines is fine).

# 3. Commit, tag, and push the tag — pushing a v* tag is what triggers the build.
git commit -am "release: v1.0.1"
git tag v1.0.1
git push origin master --tags
```

That's it. The **GitHub Action** (`.github/workflows/release.yml`) then:
1. Builds the signed Windows installer,
2. Generates `latest.json` (the file every app polls),
3. Publishes a **GitHub Release** with both attached.

Watch it run at **github.com/namansh70747/scl-lab-app → Actions**. It takes ~5–10 minutes.
When it's green, the release is live and every lab will pick it up automatically.

**Version numbers:** use [semver] — `1.0.1` for a bug fix, `1.1.0` for a feature, `2.0.0` for a
big change. It only has to be **higher** than the last one for the updater to offer it.

---

## What each lab experiences

- **New lab (first install):** send them the `.exe` from the latest GitHub Release (or a direct
  link: `https://github.com/namansh70747/scl-lab-app/releases/latest`). They run it → the app
  installs → they pay & activate as usual.
- **Existing labs:** nothing to do. Next time they open the app (or click *Check for updates*)
  they're offered the new version and update in one click. **Patients, doctors, tests, reports,
  settings and their login all carry over untouched** — an update only swaps the program, never
  the database.

---

## Windows "unknown publisher" warning

The installer isn't code-signed with a paid Windows certificate (that's a separate, optional
expense). On first run Windows SmartScreen may say *"Windows protected your PC"* — the user
clicks **More info → Run anyway**. This is normal for indie software and does **not** affect the
auto-updater (which uses our own signature). If you later buy a code-signing certificate you can
add it to the workflow to remove the warning.

---

## Troubleshooting

- **Action failed with a signing error** → the `TAURI_SIGNING_PRIVATE_KEY` secret is missing or
  wrong. Re-add it from `.secrets/namasta-updater.key` (repo → Settings → Secrets → Actions).
- **App says "you're on the latest version" but you just released** → make sure the new version
  number is *higher*, the Action finished green, and the release is **not** a draft/prerelease.
- **An app can't reach updates** → it's offline, or behind a firewall blocking github.com. The
  app keeps working fine offline; it just won't update until it's back online.

[semver]: https://semver.org/
