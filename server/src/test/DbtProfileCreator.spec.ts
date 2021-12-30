import * as assert from 'assert';
import { DbtProfileCreator, DbtProfileErrorResult } from '../DbtProfileCreator';
import {
  getMockParser,
  BIG_QUERY_CONFIG,
  BQ_OAUTH,
  BQ_OAUTH_TEMPORARY,
  BQ_OAUTH_REFRESH,
  BQ_SERVICE_ACCOUNT,
  BQ_SERVICE_ACCOUNT_JSON,
  BQ_MISSING_TYPE,
  BQ_MISSING_METHOD,
  BQ_MISSING_PROJECT,
} from './helper';

describe('Profiles Validation', () => {
  it('Should pass valid profiles', async () => {
    await shouldPassValidProfile(BQ_OAUTH);
    await shouldPassValidProfile(BQ_OAUTH_TEMPORARY);
    await shouldPassValidProfile(BQ_OAUTH_REFRESH);
    await shouldPassValidProfile(BQ_SERVICE_ACCOUNT);
    await shouldPassValidProfile(BQ_SERVICE_ACCOUNT_JSON);
  });

  it('Should require type', async () => {
    const errorPattern = new RegExp(`^Couldn't find section 'outputs.dev.type'.*$`);
    await shouldRequireField(BQ_MISSING_TYPE, errorPattern);
  });

  it('Should require method', async () => {
    const errorPattern = new RegExp(`^Unknown authentication method of 'bigquery' profile.*$`);
    await shouldRequireField(BQ_MISSING_METHOD, errorPattern);
  });

  it('Should require project', async () => {
    const errorPattern = new RegExp(`^Couldn't find section 'project'.*$`);
    await shouldRequireField(BQ_MISSING_PROJECT, errorPattern);
  });

  async function shouldRequireField(profileName: string, errorPattern: RegExp): Promise<void> {
    //arrange
    const yamlParser = getMockParser(BIG_QUERY_CONFIG, profileName);
    const profileCreator = new DbtProfileCreator(yamlParser);

    //act
    const profile = await profileCreator.createDbtProfile();

    //assert
    assert.match((profile as DbtProfileErrorResult).error, errorPattern);
  }

  async function shouldPassValidProfile(profileName: string): Promise<void> {
    //arrange
    const yamlParser = getMockParser(BIG_QUERY_CONFIG, profileName);
    const profileCreator = new DbtProfileCreator(yamlParser);

    //act
    const profile = await profileCreator.createDbtProfile();

    //assert
    assert.strictEqual((profile as DbtProfileErrorResult).error, undefined);
  }
});
