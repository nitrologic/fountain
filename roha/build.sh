#!/bin/bash

DIR="forge-rc3"
DEPENDENCIES=("README.md" "LICENSE" "CHANGELOG.md" "forge.md" "welcome.txt" "accounts.json" "modelrates.json" "foundry/notice.txt" "isolation/readme.txt" "isolation/test.js")

deno cache forge.js
if [ $? -ne 0 ]; then
    echo "Error: Failed to cache dependencies."
    exit 1
fi

deno compile --allow-run --allow-env --allow-net --allow-read --allow-write --output "$DIR/forge" forge.js
if [ $? -ne 0 ]; then
    echo "Error: Failed to compile forge.js."
    exit 1
fi

if [ ! -f "$DIR/forge" ]; then
    echo "Error: forge executable not created by compiler."
    exit 1
fi

MISSING=0
COPY_FAILED=0
for file in "${DEPENDENCIES[@]}"; do
    if [ -f "$file" ]; then
        dir=$(dirname "$DIR/$file")
        mkdir -p "$dir" && cp "$file" "$DIR/$file"
        if [ $? -eq 0 ]; then
            echo "  Copied $file"
        else
            echo "  Failed to copy $file"
            COPY_FAILED=$((COPY_FAILED + 1))
        fi
    else
        echo "  $file not found"
        MISSING=$((MISSING + 1))
    fi
done

if [ $MISSING -gt 0 ] || [ $COPY_FAILED -gt 0 ]; then
    echo "Warning: $MISSING file(s) missing, $COPY_FAILED file(s) failed to copy."
    # Uncomment to exit on copy failure
    # exit 1
fi

echo "Forge $DIR build completed successfully."

exit 0