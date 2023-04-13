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
    // https://github.com/microsoft/vscode-extension-telemetry/issues/150
    'applicationinsights-native-metrics': 'commonjs applicationinsights-native-metrics',
    '@opentelemetry/instrumentation': 'commonjs @opentelemetry/instrumentation',
    '@azure/opentelemetry-instrumentation-azure-sdk': 'commonjs @azure/opentelemetry-instrumentation-azure-sdk',
    '@azure/functions-core': 'commonjs @azure/functions-core',
  },
});
