/* eslint-disable sonarjs/no-duplicate-string */

import { assertThat } from 'hamjest';
import { ManifestParser } from '../../manifest/ManifestParser';

describe('ManifestParser', () => {
  it('getManifestPath should return path relative to current folder', () => {
    assertThat(ManifestParser.getManifestPath('target'), 'target/manifest.json');
    assertThat(ManifestParser.getManifestPath('target/'), 'target/manifest.json');
    assertThat(ManifestParser.getManifestPath('target///'), 'target/manifest.json');
    assertThat(ManifestParser.getManifestPath('target/123'), 'target/123/manifest.json');
  });

  it('getManifestPath should return absolute path', () => {
    assertThat(ManifestParser.getManifestPath('/temp'), '/temp/manifest.json');
    assertThat(ManifestParser.getManifestPath('/temp/target'), '/temp/target/manifest.json');
    assertThat(ManifestParser.getManifestPath('/temp/target/'), '/temp/target/manifest.json');
    assertThat(ManifestParser.getManifestPath('/temp/target///'), '/temp/target/manifest.json');
  });
});
