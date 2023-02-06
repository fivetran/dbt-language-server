#!/usr/bin/env bash

SCRIPT_DIR=$(dirname "$0")

cd ${SCRIPT_DIR}/.. # Go to the root (dbt-language-server) folder
npm install
npm run build
yes | npx vsce package -o e2e-tests.vsix
yes | unzip e2e-tests.vsix -d e2e-tests
npm install --ignore-scripts
cd common
npx tsc --sourceMap false --project tsconfig.json
cd ../e2e
npm install
npx tsc --sourceMap false --project tsconfig.json
cd ..
find ./e2e/projects/ -type d -name target -exec rm -rf {} +
node e2e/out/runners/runTest $(pwd)/e2e-tests/extension
rm -rf e2e-tests.vsix e2e-tests/
