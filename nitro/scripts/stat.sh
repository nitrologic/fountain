#!/bin/bash
echo "nitrologic updating stats [$(date)]"
echo "Fountain 1.3.7 ⛲  grok-4-0709 🚀"

DEST=nitro_repos_stats_pi5m2.csv
echo "owner,repo,exists,size_bytes,files" > $DEST
while IFS=, read -r owner repo; do
[[ -z "$owner" && -z "$repo" ]] && continue
	repo=$(echo "$repo" | tr -d '[:space:]\r\n')
	[[ -z "$repo" ]] && continue
	path="nitrologic/$repo"
	if [ -d "$path/.git" ]; then
		size=$(du -sk "$path" | awk '{print $1 * 1024}')
#        size=$(du -sb "$path" | cut -f1)
#		file_count=$(find "$path" -type f | wc -l)
		file_count=$(find "$path" -type f -not -path "*/.git/*" | wc -l | awk '{print $1}')
		echo "$owner,$repo,yes,$size,$file_count" >> $DEST
	else
		echo "$owner,$repo,no,0,0" >> $DEST
	fi
done < nitrologic_github.csv

echo "updated $DEST"
