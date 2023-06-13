#!/bin/bash

rm -rf dist
npx pkg -t ${TARGET_NODE:-node18}-macos-x64,${TARGET_NODE:-node18}-linux-x64,${TARGET_NODE:-node18}-win-x64 \
    --compress GZip \
    -o dist/sqd \
    package.json