#!/bin/bash

rm -rf package
yarn pkg -t ${TARGET_NODE:-node18}-macos-x64,${TARGET_NODE:-node18}-linux-x64,${TARGET_NODE:-node18}-win-x64 \
    --compress GZip \
    -o package/sqd \
    package.json