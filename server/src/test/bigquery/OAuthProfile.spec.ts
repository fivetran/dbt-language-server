import { BIG_QUERY_CONFIG, BQ_OAUTH, shouldPassValidProfile } from '../helper';

describe('OAuth profile', () => {
  it('Should pass valid profile', async () => {
    await shouldPassValidProfile(BIG_QUERY_CONFIG, BQ_OAUTH);
  });
});
