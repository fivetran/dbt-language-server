const fs = require('fs');
const path = require('path');

const extensionPackagePath = path.join(__dirname, '../package.json');
const extensionPackageJson = JSON.parse(fs.readFileSync(extensionPackagePath, 'utf8'));

const currentPackagePath = path.join(__dirname, 'package.json');
const currentPackageJson = JSON.parse(fs.readFileSync(currentPackagePath, 'utf8'));

const extensionVersion = '0.0.20'; //extensionPackageJson.version;

currentPackageJson['version'] = extensionVersion;

fs.writeFileSync(currentPackagePath, JSON.stringify(currentPackageJson, null, 2));

console.log(`Updated version to ${extensionVersion}`);
