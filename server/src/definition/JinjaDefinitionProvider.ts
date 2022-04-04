import { DefinitionLink, integer, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DbtRepository } from '../DbtRepository';
import { JinjaType, ParseNode } from '../JinjaParser';
import { MacroDefinitionFinder } from './MacroDefinitionFinder';
import { RefDefinitionFinder } from './RefDefinitionFinder';
import { SourceDefinitionFinder } from './SourceDefinitionFinder';

export class JinjaDefinitionProvider {
  static readonly MAX_RANGE = Range.create(0, 0, integer.MAX_VALUE, integer.MAX_VALUE);

  refDefinitionFinder = new RefDefinitionFinder();
  macroDefinitionFinder = new MacroDefinitionFinder();
  sourceDefinitionFinder = new SourceDefinitionFinder();

  constructor(private dbtRepository: DbtRepository) {}

  onJinjaDefinition(
    document: TextDocument,
    packageName: string | undefined,
    jinja: ParseNode,
    position: Position,
    jinjaType: JinjaType | undefined,
  ): DefinitionLink[] | undefined {
    const refDefinitions =
      packageName && jinjaType === JinjaType.EXPRESSION
        ? this.refDefinitionFinder.searchRefDefinitions(document, position, jinja, packageName, this.dbtRepository.models)
        : undefined;
    if (refDefinitions) {
      return refDefinitions;
    }

    const macroDefinitions = packageName
      ? this.macroDefinitionFinder.searchMacroDefinitions(document, position, jinja, packageName, this.dbtRepository.macros)
      : undefined;
    if (macroDefinitions) {
      return macroDefinitions;
    }

    const sourceDefinitions =
      jinjaType === JinjaType.EXPRESSION
        ? this.sourceDefinitionFinder.searchSourceDefinitions(document, position, jinja, this.dbtRepository.sources)
        : undefined;
    if (sourceDefinitions) {
      return sourceDefinitions;
    }

    return undefined;
  }
}
