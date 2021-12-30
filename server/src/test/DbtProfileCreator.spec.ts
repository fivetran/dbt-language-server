import * as assert from 'assert';
import { DbtProfileCreator, DbtProfileErrorResult } from '../DbtProfileCreator';
import {
  getMockParser,
  BIG_QUERY_CONFIG,
  BIG_QUERY_OAUTH,
  BIG_QUERY_OAUTH_TEMPORARY,
  BIG_QUERY_OAUTH_REFRESH,
  BIG_QUERY_SERVICE_ACCOUNT,
  BIG_QUERY_SERVICE_ACCOUNT_JSON,
  BIG_QUERY_MISSING_TYPE,
  BIG_QUERY_MISSING_METHOD,
  BIG_QUERY_MISSING_PROJECT,
} from './helper';

describe('Profiles Validation', () => {
  it('Should pass valid profiles', async () => {
    await shouldPassValidProfile(BIG_QUERY_OAUTH);
    await shouldPassValidProfile(BIG_QUERY_OAUTH_TEMPORARY);
    await shouldPassValidProfile(BIG_QUERY_OAUTH_REFRESH);
    await shouldPassValidProfile(BIG_QUERY_SERVICE_ACCOUNT);
    await shouldPassValidProfile(BIG_QUERY_SERVICE_ACCOUNT_JSON);
  });

  it('Should require type', async () => {
    //arrange
    const yamlParser = getMockParser(BIG_QUERY_CONFIG, BIG_QUERY_MISSING_TYPE);
    const profileCreator = new DbtProfileCreator(yamlParser);
    const errorPattern = new RegExp(`^Couldn't find section 'outputs.dev.type'.*$`);

    //act
    const profile = await profileCreator.createDbtProfile();

    //assert
    assert.match((profile as DbtProfileErrorResult).error, errorPattern);
  });

  it('Should require method', async () => {
    //arrange
    const yamlParser = getMockParser(BIG_QUERY_CONFIG, BIG_QUERY_MISSING_METHOD);
    const profileCreator = new DbtProfileCreator(yamlParser);
    const errorPattern = new RegExp(`^Unknown authentication method of 'bigquery' profile.*$`);

    //act
    const profile = await profileCreator.createDbtProfile();

    //assert
    assert.match((profile as DbtProfileErrorResult).error, errorPattern);
  });

  it('Should require project', async () => {
    //arrange
    const yamlParser = getMockParser(BIG_QUERY_CONFIG, BIG_QUERY_MISSING_PROJECT);
    const profileCreator = new DbtProfileCreator(yamlParser);
    const errorPattern = new RegExp(`^Couldn't find section 'project'.*$`);

    //act
    const profile = await profileCreator.createDbtProfile();

    //assert
    assert.match((profile as DbtProfileErrorResult).error, errorPattern);
  });

  async function shouldPassValidProfile(profileName: string): Promise<void> {
    const yamlParser = getMockParser(BIG_QUERY_CONFIG, profileName);
    const profileCreator = new DbtProfileCreator(yamlParser);
    const profile = await profileCreator.createDbtProfile();
    assert.strictEqual((profile as DbtProfileErrorResult).error, undefined);
  }
});
