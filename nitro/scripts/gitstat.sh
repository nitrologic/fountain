#!/bin/bash

# Set output file encoding to UTF-8 (equivalent to chcp 65001)
export LC_ALL=C.UTF-8

echo "nitrologic updating stats [$(date)]"
echo "Fountain 1.3.7 ⛲  grok-4-0709 🚀"
echo "owner,repo,exists,size_bytes,files" > nitro_repos_stats2.csv

while IFS=, read -r owner repo _; do
    repo=$(echo "$repo" | tr -d '[:space:]\r\n')
    path="nitrologic/$repo"
    if [ -d "$path/.git" ]; then
        # Count files and calculate total size in bytes
#        file_count=$(find "$path" -type f -not -path '*/\.git/*' | wc -l)
#        total_size=$(find "$path" -type f -not -path '*/\.git/*' -exec stat -f %z {} \; | awk '{sum+=$1} END {print sum}')
        file_count=$(find "$path" -type f -not -path '*/\.git/*' | wc -l | tr -d '[:space:]')
        total_size=$(find "$path" -type f -not -path '*/\.git/*' -exec stat -f %z {} \; | awk '{sum+=$1} END {print sum}')
        echo "$owner,$repo,yes,$total_size,$file_count" >> nitro_repos_stats2.csv
    else
        echo "$owner,$repo,no,0,0" >> nitro_repos_stats2.csv
    fi
done < nitro_repos.csv

echo "updated nitro_repos_stats2.csv"
read -p "Press Enter to continue..."
