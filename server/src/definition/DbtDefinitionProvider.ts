import { DefinitionLink, integer, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DbtRepository } from '../DbtRepository';
import { JinjaType, ParseNode } from '../JinjaParser';
import { MacroDefinitionProvider } from './MacroDefinitionProvider';
import { ModelDefinitionProvider } from './ModelDefinitionProvider';
import { SourceDefinitionProvider } from './SourceDefinitionProvider';

export class DbtDefinitionProvider {
  static readonly MAX_RANGE = Range.create(0, 0, integer.MAX_VALUE, integer.MAX_VALUE);

  modelDefinitionProvider = new ModelDefinitionProvider();
  macroDefinitionProvider = new MacroDefinitionProvider();
  sourceDefinitionProvider = new SourceDefinitionProvider();

  constructor(private dbtRepository: DbtRepository) {}

  onJinjaDefinition(
    document: TextDocument,
    packageName: string | undefined,
    jinja: ParseNode,
    position: Position,
    jinjaType: JinjaType,
  ): DefinitionLink[] | undefined {
    const refDefinitions =
      packageName && jinjaType === JinjaType.EXPRESSION
        ? this.modelDefinitionProvider.searchRefDefinitions(document, position, jinja, packageName, this.dbtRepository.models)
        : undefined;
    if (refDefinitions) {
      return refDefinitions;
    }

    const macroDefinitions = packageName
      ? this.macroDefinitionProvider.searchMacroDefinitions(document, position, jinja, packageName, this.dbtRepository.macros)
      : undefined;
    if (macroDefinitions) {
      return macroDefinitions;
    }

    const sourceDefinitions =
      jinjaType === JinjaType.EXPRESSION
        ? this.sourceDefinitionProvider.searchSourceDefinitions(document, position, jinja, this.dbtRepository.sources)
        : undefined;
    if (sourceDefinitions) {
      return sourceDefinitions;
    }

    return undefined;
  }
}
