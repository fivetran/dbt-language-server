//@ts-check

'use strict';

const withDefaults = require('../shared.webpack.config');
const path = require('path');

module.exports = withDefaults({
  context: path.join(__dirname),
  entry: {
    extension: './src/extension.ts',
  },
  output: {
    filename: 'extension.js',
    path: path.join(__dirname, 'out'),
  },
  externals: {
    'applicationinsights-native-metrics': 'commonjs applicationinsights-native-metrics', // See: https://github.com/microsoft/vscode-extension-telemetry/issues/41,
  },
});
