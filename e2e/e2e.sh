#!/usr/bin/env bash

DIR=$(dirname "$0")

cd ${DIR}/..
npm install
npm run vscode:prepublish

node "e2e/out/runTest"