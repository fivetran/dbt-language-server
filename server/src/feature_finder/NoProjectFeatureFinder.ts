import { PythonInfo } from 'dbt-language-server-common';
import { DbtCommandExecutor } from '../dbt_execution/DbtCommandExecutor';
import { FeatureFinderBase } from './FeatureFinderBase';

export class NoProjectFeatureFinder extends FeatureFinderBase {
  constructor(pythonInfo: PythonInfo, dbtCommandExecutor: DbtCommandExecutor) {
    super(pythonInfo, dbtCommandExecutor, undefined);
  }
}
