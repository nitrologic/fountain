#!/usr/bin/env bash
set -u

CSV_FILE="nitro_repos.csv"
BASE_DIR="nitrologic"
SHALLOW="--depth 1"

if [ ! -f "$CSV_FILE" ]; then
	echo "CSV file not found: $CSV_FILE" >&2
	exit 1
fi

mkdir -p "$BASE_DIR" || {
	echo "Failed to create base directory: $BASE_DIR" >&2
	exit 1
}

while IFS=, read -r owner repo; do
	[[ -z "$owner" || -z "$repo" || "$owner" =~ ^# ]] && continue
	owner=$(echo "$owner" | tr -d '[:space:]')
	repo=$(echo "$repo" | tr -d '[:space:]')
	target="$BASE_DIR/$owner/$repo"
	repo_url="https://github.com/$owner/$repo.git"
	echo "Processing $owner/$repo -> $target"
	if [ -d "$target/.git" ]; then
		if git -C "$target" pull; then
			echo "Updated $owner/$repo"
		else
			echo "Failed to update $owner/$repo" >&2
		fi
	else
		mkdir -p "$(dirname "$target")" || {
			echo "Failed to create directory for $target" >&2
			continue
		}
		if git clone $SHALLOW "$repo_url" "$target"; then
			echo "Cloned $owner/$repo"
		else
			echo "Failed to clone $owner/$repo" >&2
		fi
	fi
done < "$CSV_FILE"