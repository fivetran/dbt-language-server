import { SnowflakeKeyPairProfile } from '../../snowflake/SnowflakeKeyPairProfile';
import { YamlParserUtils } from '../../YamlParserUtils';
import { getConfigPath, shouldPassValidProfile, shouldRequireProfileField, SNOWFLAKE_CONFIG } from '../helper';

describe('SnowflakeKeyPairProfile', () => {
  it('Should pass valid profile', () => {
    shouldPassValidProfile(SNOWFLAKE_CONFIG, 'correct_key_pair');
  });

  it('Should require user', () => {
    shouldRequireField('user');
  });

  it('Should require private_key_path', () => {
    shouldRequireField('private_key_path');
  });

  it('Should require database', () => {
    shouldRequireField('database');
  });

  it('Should require warehouse', () => {
    shouldRequireField('warehouse');
  });

  it('Should require schema', () => {
    shouldRequireField('schema');
  });
});

function shouldRequireField(field: string): void {
  const profiles = YamlParserUtils.parseYamlFile(getConfigPath(SNOWFLAKE_CONFIG));
  const oauthTokenBasedProfile = new SnowflakeKeyPairProfile();
  shouldRequireProfileField(profiles, oauthTokenBasedProfile, `key_pair_missing_${field}`, field);
}
