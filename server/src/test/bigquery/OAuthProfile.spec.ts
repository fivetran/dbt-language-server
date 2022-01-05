import { shouldPassValidProfile, BQ_OAUTH, BIG_QUERY_CONFIG } from '../helper';

describe('OAuth profile', () => {
  it('Should pass valid profile', async () => {
    await shouldPassValidProfile(BIG_QUERY_CONFIG, BQ_OAUTH);
  });
});
