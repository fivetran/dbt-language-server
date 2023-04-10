//@ts-check

'use strict';

const withDefaults = require('../shared.webpack.config');
const path = require('path');

module.exports = withDefaults({
  context: path.join(__dirname),
  entry: {
    server: './src/server.ts',
  },
  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'out'),
  },
  externals: {
    'ffi-napi': 'commonjs ffi-napi', // there is an issue when running native modules with webpack
    'coffee-script': 'commonjs coffee-script',
  },
});
