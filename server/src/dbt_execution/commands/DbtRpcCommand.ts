import { Command } from './Command';

export class DbtRpcCommand extends Command {
  constructor(profilesDir: string, parameters: string[], python?: string) {
    super('dbt-rpc', profilesDir, parameters, 'dbt_rpc.__main__', python, { DBT_ENABLE_LEGACY_LOGGER: 'True' }); // https://github.com/dbt-labs/dbt-rpc/issues/63
  }
}
