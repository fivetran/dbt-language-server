//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

'use strict';

const path = require('path');
const merge = require('merge-options');

module.exports = function withDefaults(/**@type WebpackConfig*/ extConfig) {
  /** @type WebpackConfig */
  let defaultConfig = {
    mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
    target: 'node', // extensions run in a node context
    resolve: {
      mainFields: ['module', 'main'],
      extensions: ['.ts', '.js'], // support ts-files and js-files
    },
    stats: {
      errorDetails: true,
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              // configure TypeScript loader:
              // * enable sources maps for end-to-end source maps
              loader: 'ts-loader',
              options: {
                compilerOptions: {
                  sourceMap: true,
                },
              },
            },
          ],
        },
      ],
    },
    externals: {
      // https://webpack.js.org/configuration/externals/
      vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded.
    },
    output: {
      // packaging depends on that and this must always be like it
      filename: '[name].js',
      path: path.join(extConfig.context, 'out'),
      libraryTarget: 'commonjs',
    },
    devtool: 'source-map',
  };

  return merge(defaultConfig, extConfig);
};
