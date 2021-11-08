#!/usr/bin/env bash

SCRIPT_DIR=$(dirname "$0")

cd ${SCRIPT_DIR}/..
npm install
npm run compile
yes | npx vsce package -o e2e-tests.vsix --baseImagesUrl=https://storage.googleapis.com/dbt-ls-images
unzip e2e-tests.vsix -d e2e-tests
node e2e/out/runTest $(pwd)/e2e-tests/extension
rm -rf e2e-tests.vsix e2e-tests/
