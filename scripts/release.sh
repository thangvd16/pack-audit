#!/usr/bin/env bash
set -euo pipefail

usage() {
	echo "Usage: $0 [major|minor|patch|x.y.z]" >&2
	echo "Default: patch" >&2
}

BUMP="${1:-patch}"

if [[ "${BUMP}" == "-h" || "${BUMP}" == "--help" ]]; then
	usage
	exit 0
fi

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "${ROOT_DIR}"

BRANCH="$(git branch --show-current)"
if [[ -z "${BRANCH}" ]]; then
	echo "Current HEAD is detached. Checkout a branch before releasing." >&2
	exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
	echo "Working tree is not clean. Commit or stash current changes before running release." >&2
	echo "" >&2
	git status --short >&2
	exit 1
fi

CURRENT="$(node -p "require('./package.json').version")"
VERSION="$(
	node -e '
const current = process.argv[1];
const bump = process.argv[2];

function fail(message) {
	console.error(message);
	process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(current)) {
	fail(`Invalid current version: ${current}`);
}

if (/^\d+\.\d+\.\d+$/.test(bump)) {
	console.log(bump);
	process.exit(0);
}

if (!["major", "minor", "patch"].includes(bump)) {
	fail("Usage: scripts/release.sh [major|minor|patch|x.y.z]");
}

const parts = current.split(".").map(Number);
if (bump === "major") {
	parts[0] += 1;
	parts[1] = 0;
	parts[2] = 0;
} else if (bump === "minor") {
	parts[1] += 1;
	parts[2] = 0;
} else {
	parts[2] += 1;
}

console.log(parts.join("."));
' "${CURRENT}" "${BUMP}"
)"
TAG="v${VERSION}"

if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
	echo "Local tag ${TAG} already exists." >&2
	exit 1
fi

set +e
git ls-remote --exit-code --tags origin "refs/tags/${TAG}" >/dev/null 2>&1
REMOTE_TAG_STATUS=$?
set -e

if [[ "${REMOTE_TAG_STATUS}" -eq 0 ]]; then
	echo "Remote tag ${TAG} already exists on origin." >&2
	exit 1
elif [[ "${REMOTE_TAG_STATUS}" -ne 2 ]]; then
	echo "Could not check remote tag ${TAG} on origin." >&2
	exit 1
fi

echo "Releasing ${CURRENT} -> ${VERSION} on branch ${BRANCH}"

node -e '
const fs = require("node:fs");
const version = process.argv[1];

function writeJson(path, update) {
	const data = JSON.parse(fs.readFileSync(path, "utf8"));
	update(data);
	fs.writeFileSync(path, `${JSON.stringify(data, null, "\t")}\n`);
}

writeJson("package.json", (data) => {
	data.version = version;
});

writeJson("src-tauri/tauri.conf.json", (data) => {
	data.version = version;
});

const cargoPath = "src-tauri/Cargo.toml";
const cargoToml = fs.readFileSync(cargoPath, "utf8");
const nextCargoToml = cargoToml.replace(
	/(\[package\][\s\S]*?\nversion\s*=\s*)"[^"]+"/,
	`$1"${version}"`,
);

if (nextCargoToml === cargoToml) {
	throw new Error("Could not update src-tauri/Cargo.toml package version");
}

fs.writeFileSync(cargoPath, nextCargoToml);
' "${VERSION}"

pnpm run build
pnpm test
pnpm run lint
cargo check --manifest-path src-tauri/Cargo.toml

git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock

if git diff --cached --quiet; then
	echo "No version files changed; tagging current commit."
else
	git commit -m "chore: release ${TAG}"
fi

git tag -a "${TAG}" -m "Release ${TAG}"

git push origin "${BRANCH}"
git push origin "${TAG}"

REPO_PATH="$(git config --get remote.origin.url | sed -E 's#^git@github.com:##; s#^https://github.com/##; s#\.git$##')"

echo ""
echo "GitHub Actions release build started:"
echo "https://github.com/${REPO_PATH}/actions/workflows/release.yml"
echo "Release tag:"
echo "https://github.com/${REPO_PATH}/releases/tag/${TAG}"
