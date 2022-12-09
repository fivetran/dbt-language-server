import { assertThat } from 'hamjest';
import { evalJinjaEnvVar } from '../../utils/JinjaUtils';

describe('JinjaUtils', () => {
  it('evalJinjaEnvVar should not replace value if it is not exist in environment', () => {
    evalJinjaEnvVarShouldReturnEnvironmentValue('{{ env_var("TEST1") }}', '{{ env_var("TEST1") }}');
  });

  it('evalJinjaEnvVar should not replace value if it is found in environment', () => {
    process.env['TEST2'] = 'test2_value';
    process.env['TEST3'] = 'test3_value';
    evalJinjaEnvVarShouldReturnEnvironmentValue("{{env_var('TEST2')}}", 'test2_value');
    evalJinjaEnvVarShouldReturnEnvironmentValue("{{env_var('TEST2')}}_{{env_var('TEST3')}}", 'test2_value_test3_value');
    evalJinjaEnvVarShouldReturnEnvironmentValue('{{env_var("TEST2")}}', 'test2_value');
    evalJinjaEnvVarShouldReturnEnvironmentValue('{{ env_var("TEST2") }}', 'test2_value');
    evalJinjaEnvVarShouldReturnEnvironmentValue('{{ env_var("TEST2")   }}', 'test2_value');
    evalJinjaEnvVarShouldReturnEnvironmentValue('{{   env_var("TEST2")   }}', 'test2_value');
    evalJinjaEnvVarShouldReturnEnvironmentValue('{{   env_var("TEST2")   }}_b', 'test2_value_b');
    evalJinjaEnvVarShouldReturnEnvironmentValue('a_{{   env_var("TEST2")   }}_b', 'a_test2_value_b');

    evalJinjaEnvVarShouldReturnEnvironmentValue('{{ env_var("TEST1", "default") }}', 'default');
    evalJinjaEnvVarShouldReturnEnvironmentValue('{{ env_var("TEST1", "default") }}_{{ env_var("TEST1", "default") }}', 'default_default');
    evalJinjaEnvVarShouldReturnEnvironmentValue("{{ env_var('TEST1', 'default') }}", 'default');
    evalJinjaEnvVarShouldReturnEnvironmentValue('{{env_var("TEST1",   "default")  }}', 'default');
  });
});

function evalJinjaEnvVarShouldReturnEnvironmentValue(text: string, expectedResult: string): void {
  // act
  const result = evalJinjaEnvVar(text);

  // assert
  assertThat(result, expectedResult);
}
