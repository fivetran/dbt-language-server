import { assertThat, hasSize, isEmpty, not } from 'hamjest';
import { MacroDefinitionFinder } from '../../definition/MacroDefinitionFinder';

describe('MacroDefinitionFinder', () => {
  const FINDER = new MacroDefinitionFinder();

  it('getStartMacroMatch should return one match', () => {
    assertThat(FINDER.getStartMacroMatch('{% macro m(a, b) %}', 'm'), not(null));
    assertThat(FINDER.getStartMacroMatch('{%   macro  m  (a,   b)   %}', 'm'), not(null));
    assertThat(FINDER.getStartMacroMatch('{%- macro m(a, b) %}', 'm'), not(null));
    assertThat(FINDER.getStartMacroMatch('{% macro m(a, b) -%}', 'm'), not(null));
    assertThat(FINDER.getStartMacroMatch('{%- macro m(a, b) -%}', 'm'), not(null));
  });

  it('getStartMacroMatch should return null', () => {
    assertThat(FINDER.getStartMacroMatch('{%-- macro m(a, b) %}', 'm'), null);
    assertThat(FINDER.getStartMacroMatch('{% -macro m(a, b)%}', 'm'), null);
    assertThat(FINDER.getStartMacroMatch('{% macro- m(a, b) %}', 'm'), null);
  });

  it('getEndMacroMatches should return one match', () => {
    assertThat(FINDER.getEndMacroMatches('{% endmacro %}'), hasSize(1));
    assertThat(FINDER.getEndMacroMatches('{%    endmacro    %}'), hasSize(1));
    assertThat(FINDER.getEndMacroMatches('{%- endmacro %}'), hasSize(1));
    assertThat(FINDER.getEndMacroMatches('{%-    endmacro    %}'), hasSize(1));
    assertThat(FINDER.getEndMacroMatches('{%- endmacro -%}'), hasSize(1));
    assertThat(FINDER.getEndMacroMatches('{%-    endmacro    -%}'), hasSize(1));
  });

  it('getEndMacroMatches should return no matches', () => {
    assertThat(FINDER.getEndMacroMatches('{%-- endmacro %}'), isEmpty());
    assertThat(FINDER.getEndMacroMatches('{% -endmacro %}'), isEmpty());
    assertThat(FINDER.getEndMacroMatches('{% endmacro --%}'), isEmpty());
    assertThat(FINDER.getEndMacroMatches('{% endmacro- %}'), isEmpty());
  });
});
