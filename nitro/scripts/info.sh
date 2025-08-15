#!/usr/bin/env bash
set -u
INPUT_CSV="nitro_repos.csv"
OUTPUT_CSV="nitro_repos_infos.csv"
BASE_DIR="nitrologic"

echo "owner,repo,exists,log_count" > "$OUTPUT_CSV"

while IFS=, read -r owner repo || [ -n "${owner:-}" ]; do
	owner="$(printf '%s' "$owner" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
	repo="$(printf '%s' "$repo" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
	[ -z "$owner" ] && continue
	[ -z "$repo" ] && continue
	case "$owner" in \#* ) continue ;; esac
	repopath="$BASE_DIR/$repo"
	if [ -d "$repopath" ]; then
		log_count=$(git -C "$repopath" rev-list --count HEAD 2>/dev/null || echo 0)
		echo "$owner,$repo,yes,$log_count" >> "$OUTPUT_CSV"
	else
		echo "$owner,$repo,no,0" >> "$OUTPUT_CSV"
	fi
done < "$INPUT_CSV"

echo "Updated $OUTPUT_CSV"
