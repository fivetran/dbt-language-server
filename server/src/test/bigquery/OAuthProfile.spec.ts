import { BIG_QUERY_CONFIG, BQ_OAUTH, shouldPassValidProfile } from '../helper';

describe('OAuth profile', () => {
  it('Should pass valid profile', () => {
    shouldPassValidProfile(BIG_QUERY_CONFIG, BQ_OAUTH);
  });
});
