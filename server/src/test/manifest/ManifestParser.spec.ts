/* eslint-disable sonarjs/no-duplicate-string */

import { assertThat } from 'hamjest';
import { ManifestParser } from '../../manifest/ManifestParser';
import path = require('node:path');

describe('ManifestParser', () => {
  it('getManifestPath should return path relative to current folder', () => {
    assertThat(ManifestParser.getManifestPath('target'), path.join('target', 'manifest.json'));
    assertThat(ManifestParser.getManifestPath('target/'), path.join('target', 'manifest.json'));
    assertThat(ManifestParser.getManifestPath('target///'), path.join('target', 'manifest.json'));
    assertThat(ManifestParser.getManifestPath('target/123'), path.join('target', '123', 'manifest.json'));
  });

  it('getManifestPath should return absolute path', () => {
    assertThat(ManifestParser.getManifestPath('/temp'), path.join('/', 'temp', 'manifest.json'));
    assertThat(ManifestParser.getManifestPath('/temp/target'), path.join('/', 'temp', 'target', 'manifest.json'));
    assertThat(ManifestParser.getManifestPath('/temp/target/'), path.join('/', 'temp', 'target', 'manifest.json'));
    assertThat(ManifestParser.getManifestPath('/temp/target///'), path.join('/', 'temp', 'target', 'manifest.json'));
  });
});
