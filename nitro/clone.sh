# !/usr/bin/env bash
set -u

CSV_FILE="nitro_repos.csv"
BASE_DIR="nitrologic"   # clones will go into $BASEDIR/<owner>/<repo>
SHALLOW="--depth 1"     # set to "" for full clones

if [ ! -f "$CSV_FILE" ]; then
	echo "CSV file not found: $CSV_FILE" >&2
	exit 1
fi

while IFS=, read -r owner repo || [ -n "${owner:-}" ]; do
	# trim whitespace
	owner="$(printf '%s' "$owner" | sed -e 's/^[[:space:]]//' -e 's/[[:space:]]$//')"
	repo="$(printf '%s' "$repo" | sed -e 's/^[[:space:]]//' -e 's/[[:space:]]$//')"

	# skip empty / comment lines
	[ -z "$owner" ] && continue
	[ -z "$repo" ] && continue
	case "$owner" in \#* ) continue ;; esac

	target="$BASE_DIR/$owner/$repo"
	echo "Processing $owner/$repo -> $target"

	# ensure parent exists
	mkdir -p "$BASE_DIR/$owner"

	if [ -d "$target/.git" ]; then
		echo "Existing git repo found, pulling updates..."
		if git -C "$target" fetch --all --prune && git -C "$target" pull --ff-only; then
			echo "Updated $owner/$repo"
		else
			echo "Failed to update $owner/$repo" >&2
		fi
	elif [ -e "$target" ]; then
		echo "Target exists and is not a git repo: $target" >&2
	else
		remote="https://github.com/$owner/$repo.git"
		if git clone $SHALLOW "$remote" "$target"; then
			echo "Cloned $owner/$repo"
		else
			echo "Failed to clone $owner/$repo" >&2
		fi
	fi
done < "$CSV_FILE"