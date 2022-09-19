#!/bin/bash

cd package
mv sqd-macos sqd && tar -czf subsquid-cli-${npm_package_version}-macos-x64.tar.gz sqd && rm sqd
mv sqd-linux sqd && tar -czf subsquid-cli-${npm_package_version}-linux-x64.tar.gz sqd && rm sqd
mv sqd-win.exe sqd.exe