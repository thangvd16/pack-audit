#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/release.sh [major|minor|patch]
# Default: patch

BUMP="${1:-patch}"

if [[ "$BUMP" != "major" && "$BUMP" != "minor" && "$BUMP" != "patch" ]]; then
  echo "Usage: $0 [major|minor|patch]" >&2
  exit 1
fi

# ── Đọc version hiện tại từ package.json ─────────────────────────────────────
CURRENT=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
MAJOR=$(echo "$CURRENT" | cut -d. -f1)
MINOR=$(echo "$CURRENT" | cut -d. -f2)
PATCH=$(echo "$CURRENT" | cut -d. -f3)

case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

VERSION="${MAJOR}.${MINOR}.${PATCH}"
TAG="v${VERSION}"

echo "→ $CURRENT → $VERSION ($BUMP bump)"

# ── 1. Bump versions ──────────────────────────────────────────────────────────

# package.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" package.json

# src-tauri/tauri.conf.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" src-tauri/tauri.conf.json

# src-tauri/Cargo.toml (chỉ dòng version trong [package], không đụng dependency version)
sed -i '' "s/^version = \"${CURRENT}\"/version = \"${VERSION}\"/" src-tauri/Cargo.toml

# Cargo.lock: để Cargo tự update khi CI chạy cargo build

echo "✓ Version bumped to $VERSION in package.json, tauri.conf.json, Cargo.toml"

# ── 2. Commit version bump ────────────────────────────────────────────────────

git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
if git diff --cached --quiet; then
  echo "✓ No version changes to commit (already at ${VERSION})"
else
  git commit -m "chore: bump version to ${TAG}"
  echo "✓ Committed version bump"
fi

# ── 3. Tag ────────────────────────────────────────────────────────────────────

if git tag -l | grep -q "^${TAG}$"; then
  git tag -d "$TAG"
  echo "✓ Deleted existing local tag $TAG"
fi
git tag -a "$TAG" -m "Release ${TAG}"

echo "✓ Created annotated tag $TAG"

# ── 4. Push ───────────────────────────────────────────────────────────────────

git push
git push origin "$TAG"

echo ""
echo "✓ Done! GitHub Actions sẽ tự build và tạo release tại:"
echo "  https://github.com/thangvd16/pack-audit/releases/tag/${TAG}"
