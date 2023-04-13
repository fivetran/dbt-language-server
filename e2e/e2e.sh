#!/usr/bin/env bash

# Builds the extension for darwin-x64 platform and runs tests

SCRIPT_DIR=$(dirname "$0")

cd ${SCRIPT_DIR}/.. # Go to the root (dbt-language-server) folder
npm install
npm run build
find server/node_modules/@fivetrandevelopers/zetasql/lib/zetasql -maxdepth 1 -type f ! -name 'libremote_server.dylib' -exec rm -f {} \;
find server/node_modules/@fivetrandevelopers/zetasql-snowflake/lib/snowflake -maxdepth 1 -type f ! -name 'libremote_server.dylib' -exec rm -f {} \;
yes | npx vsce package -o e2e-tests.vsix --target darwin-x64
yes | unzip e2e-tests.vsix -d e2e-tests

# Build tests
npm install --ignore-scripts
cd common
npx tsc --sourceMap false --project tsconfig.json
cd ../e2e
npm install
npx tsc --sourceMap false --project tsconfig.json

# Delete target folders for test projects
cd ..
find ./e2e/projects/ -type d -name target -exec rm -rf {} +

# Run tests
node e2e/out/runners/runTest $(pwd)/e2e-tests/extension

# Cleanup
# rm -rf e2e-tests.vsix e2e-tests/
