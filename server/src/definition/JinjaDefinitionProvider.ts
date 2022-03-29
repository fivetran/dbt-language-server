import { DefinitionLink, integer, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DbtRepository } from '../DbtRepository';
import { ParseNode } from '../JinjaParser';
import { MacroDefinitionFinder } from './MacroDefinitionFinder';
import { RefDefinitionFinder } from './RefDefinitionFinder';
import { SourceDefinitionFinder } from './SourceDefinitionFinder';

export class JinjaDefinitionProvider {
  static readonly MAX_RANGE = Range.create(0, 0, integer.MAX_VALUE, integer.MAX_VALUE);

  refDefinitionFinder = new RefDefinitionFinder();
  macroDefinitionFinder = new MacroDefinitionFinder();
  sourceDefinitionFinder = new SourceDefinitionFinder();

  constructor(private dbtRepository: DbtRepository) {}

  onJinjaDefinition(document: TextDocument, jinja: ParseNode, position: Position): DefinitionLink[] | undefined {
    if (this.dbtRepository.projectName && this.isExpression(jinja.value)) {
      const refDefinitions = this.refDefinitionFinder.searchRefDefinitions(
        document,
        position,
        jinja,
        this.dbtRepository.projectName,
        this.dbtRepository.models,
      );
      if (refDefinitions) {
        return refDefinitions;
      }
    }

    if (this.dbtRepository.projectName) {
      const macroDefinitions = this.macroDefinitionFinder.searchMacroDefinitions(
        document,
        position,
        jinja,
        this.dbtRepository.projectName,
        this.dbtRepository.macros,
      );
      if (macroDefinitions) {
        return macroDefinitions;
      }
    }

    if (this.isExpression(jinja.value)) {
      const sourceDefinitions = this.sourceDefinitionFinder.searchSourceDefinitions(document, position, jinja, this.dbtRepository.sources);
      if (sourceDefinitions) {
        return sourceDefinitions;
      }
    }

    return undefined;
  }

  isExpression(expression: string): boolean {
    return expression.match(/^{\s*{/) !== null;
  }
}
