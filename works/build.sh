#!/bin/bash

DIR="../rc4/macos"
DEPENDENCIES=("fountain.md" "LICENSE" "forge.md" "welcome.txt" "accounts.json" "modelspecs.json" "slopspec.json" "bibli.json")
DEPENDENCIES2=("foundry/notice.txt" "isolation/readme.txt" "isolation/test.js")

pushd ../roha

deno cache slopfountain.ts
if [ $? -ne 0 ]; then
    echo "Error: Failed to cache dependencies."
    exit 1
fi

deno compile --no-check --allow-run --allow-env --allow-net --allow-read --allow-write --output "$DIR/slopfountain" slopfountain.ts
if [ $? -ne 0 ]; then
    echo "Error: Failed to compile slopfountain.ts."
    exit 1
fi

if [ ! -f "$DIR/slopfountain" ]; then
    echo "Error: slopfountain binary not created by compiler."
    exit 1
fi




deno cache slopshop.ts
if [ $? -ne 0 ]; then
    echo "Error: Failed to cache dependencies."
    exit 1
fi

deno compile --no-check --allow-run --allow-env --allow-net --allow-read --allow-write --output "$DIR/slopshop" slopshop.ts
if [ $? -ne 0 ]; then
    echo "Error: Failed to compile slopshop.ts."
    exit 1
fi

if [ ! -f "$DIR/slopshop" ]; then
    echo "Error: slopshop binary not created by compiler."
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

echo "nitrologic Slop Fountain $DIR build completed successfully."

popd

exit 0