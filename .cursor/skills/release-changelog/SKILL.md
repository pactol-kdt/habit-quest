---
name: release-changelog
description: >-
  Release all Unreleased CHANGELOG entries and bump app version (semver). Does
  not git add or commit. Use when the user invokes /release-changelog, asks to
  release the changelog, cut a version, ship Unreleased notes, or bump HabitQuest
  for a release.
disable-model-invocation: true
---

# Release Changelog

Ship everything under `## Unreleased` in `CHANGELOG.md` and bump the app version.
**Do not** `git add`, commit, or push.

## Scope (this repo)

Git root and app live in `frontend/`:

| File | Role |
|------|------|
| `CHANGELOG.md` | Keep a Changelog; `## Unreleased` then `## X.Y.Z - Title` |
| `package.json` | App version (`APP_VERSION` is derived from this) |
| `packages/shared/package.json` | Keep in sync with root `package.json` version |

## Workflow

Copy and track:

```
Release Progress:
- [ ] 1. Read Unreleased + current version
- [ ] 2. Choose semver bump + section title
- [ ] 3. Move Unreleased → versioned section
- [ ] 4. Bump both package.json versions
- [ ] 5. Report new version + suggested commit message (no git)
```

### 1. Read Unreleased + current version

1. Open `CHANGELOG.md`. If `## Unreleased` is empty (no bullets under Added/Changed/Fixed/etc.), stop and tell the user there is nothing to release.
2. Read `version` from root `package.json` (authoritative current version).

### 2. Choose semver bump + title

Default from Unreleased content (ask only if ambiguous):

| Unreleased signal | Bump |
|-------------------|------|
| Breaking / incompatible API or data migration called out | **major** |
| New user-facing capability under Added (or substantial feature work) | **minor** |
| Fixes, polish, copy, refactors only | **patch** |

If the user names a version or bump (`patch` / `0.9.1`), use that.

Section title: short product-facing phrase (2–6 words), matching prior style (`Quiet RPG and Live Rewards`, `Password Reset Production Fix`). Prefer summarizing the dominant theme of Unreleased over listing every bullet.

### 3. Move Unreleased → versioned section

Transform:

```markdown
## Unreleased

### Added
- …

### Changed
- …

## 0.9.0 - Previous Title
```

Into:

```markdown
## Unreleased

## 0.9.1 - New Title

### Added
- …

### Changed
- …

## 0.9.0 - Previous Title
```

Rules:

- Leave a fresh empty `## Unreleased` at the top (no empty `###` stubs required).
- Preserve bullet text verbatim; keep existing `### Added` / `### Changed` / `### Fixed` / etc. groupings.
- Insert the new `## X.Y.Z - Title` immediately below Unreleased.
- Do not rewrite older version sections.

### 4. Bump both package.json versions

Set `"version"` to the new `X.Y.Z` in:

1. `package.json`
2. `packages/shared/package.json`

No other version files unless the repo already uses them for the same release.

### 5. Report only — no git

**Never** run `git add`, `git commit`, or `git push` as part of this skill.

After editing the three files, tell the user:

- New version (`X.Y.Z`)
- Section title
- A suggested commit subject they can use themselves (pick one format below)

**Suggested message format** (pick one):

- Feature / mixed Unreleased:  
  `feat: release HabitQuest vX.Y.Z with <short summary>`
- Fix-only Unreleased:  
  `fix: <short summary> (vX.Y.Z)`
- Explicit version bump with little prose:  
  `chore: release HabitQuest vX.Y.Z`

`<short summary>` = same idea as the CHANGELOG section title, lowercase, no trailing period.

Touch only the three release files. Leave any other dirty work alone.

## Examples

**Input:** Unreleased has Shop nav + Today claims + undo wallet warn; current `0.9.0` → minor `0.10.0`, title `Shop Nav and Today Claims`.

**Suggested commit subject:**
```
feat: release HabitQuest v0.10.0 with Shop nav and Today claims
```

**Input:** Unreleased is only a Vercel password-reset 500 fix; current `0.8.0` → patch `0.8.1`.

**Suggested commit subject:**
```
fix: stop password-reset 500 on Vercel (v0.8.1)
```
