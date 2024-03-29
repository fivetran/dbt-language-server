import { assertThat, hasSize, isEmpty, not } from 'hamjest';
import { DbtRepository } from '../../DbtRepository';
import { MacroDefinitionProvider } from '../../definition/MacroDefinitionProvider';

describe('MacroDefinitionProvider', () => {
  const DBT_REPOSITORY = new DbtRepository('project_path', Promise.resolve(undefined));
  const PROVIDER = new MacroDefinitionProvider(DBT_REPOSITORY);

  it('getStartMacroMatch should return one match', () => {
    assertThat(PROVIDER.getStartMacroMatch('{% macro m(a, b) %}', 'm'), not(null));
    assertThat(PROVIDER.getStartMacroMatch('{%   macro  m  (a,   b)   %}', 'm'), not(null));
    assertThat(PROVIDER.getStartMacroMatch('{%- macro m(a, b) %}', 'm'), not(null));
    assertThat(PROVIDER.getStartMacroMatch('{% macro m(a, b) -%}', 'm'), not(null));
    assertThat(PROVIDER.getStartMacroMatch('{%- macro m(a, b) -%}', 'm'), not(null));
  });

  it('getStartMacroMatch should return null', () => {
    assertThat(PROVIDER.getStartMacroMatch('{%-- macro m(a, b) %}', 'm'), null);
    assertThat(PROVIDER.getStartMacroMatch('{% -macro m(a, b)%}', 'm'), null);
    assertThat(PROVIDER.getStartMacroMatch('{% macro- m(a, b) %}', 'm'), null);
  });

  it('getEndMacroMatches should return one match', () => {
    assertThat(PROVIDER.getEndMacroMatches('{% endmacro %}'), hasSize(1));
    assertThat(PROVIDER.getEndMacroMatches('{%    endmacro    %}'), hasSize(1));
    assertThat(PROVIDER.getEndMacroMatches('{%- endmacro %}'), hasSize(1));
    assertThat(PROVIDER.getEndMacroMatches('{%-    endmacro    %}'), hasSize(1));
    assertThat(PROVIDER.getEndMacroMatches('{%- endmacro -%}'), hasSize(1));
    assertThat(PROVIDER.getEndMacroMatches('{%-    endmacro    -%}'), hasSize(1));
  });

  it('getEndMacroMatches should return no matches', () => {
    assertThat(PROVIDER.getEndMacroMatches('{%-- endmacro %}'), isEmpty());
    assertThat(PROVIDER.getEndMacroMatches('{% -endmacro %}'), isEmpty());
    assertThat(PROVIDER.getEndMacroMatches('{% endmacro --%}'), isEmpty());
    assertThat(PROVIDER.getEndMacroMatches('{% endmacro- %}'), isEmpty());
  });
});
