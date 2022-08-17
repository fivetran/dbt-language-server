import { DefinitionLink, integer, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DbtRepository } from '../DbtRepository';
import { JinjaType, ParseNode } from '../JinjaParser';
import { LogLevel } from '../Logger';
import { MacroDefinitionProvider } from './MacroDefinitionProvider';
import { ModelDefinitionProvider } from './ModelDefinitionProvider';
import { SourceDefinitionProvider } from './SourceDefinitionProvider';

export interface DbtNodeDefinitionProvider {
  provideDefinitions(document: TextDocument, position: Position, jinja: ParseNode, packageName: string): DefinitionLink[] | undefined;
}

export class DbtDefinitionProvider {
  static readonly MAX_RANGE = Range.create(0, 0, integer.MAX_VALUE, integer.MAX_VALUE);
  static readonly MIN_RANGE = Range.create(0, 0, 0, 0);

  modelDefinitionProvider: ModelDefinitionProvider;
  macroDefinitionProvider: MacroDefinitionProvider;
  sourceDefinitionProvider: SourceDefinitionProvider;

  constructor(private dbtRepository: DbtRepository) {
    this.modelDefinitionProvider = new ModelDefinitionProvider(this.dbtRepository);
    this.macroDefinitionProvider = new MacroDefinitionProvider(this.dbtRepository);
    this.sourceDefinitionProvider = new SourceDefinitionProvider(this.dbtRepository);
  }

  provideDefinitions(document: TextDocument, jinja: ParseNode, position: Position, jinjaType: JinjaType): DefinitionLink[] | undefined {
    console.log(`dbtRepository.macros.length: ${this.dbtRepository.macros.length}`, LogLevel.Debug);
    console.log(`dbtRepository.models.length: ${this.dbtRepository.models.length}`, LogLevel.Debug);
    console.log(`dbtRepository.sources.length: ${this.dbtRepository.sources.length}`, LogLevel.Debug);

    if (jinjaType === JinjaType.UNKNOWN) {
      return undefined;
    }

    const modelDefinitions = this.modelDefinitionProvider.provideDefinitions(document, position, jinja);
    if (modelDefinitions) {
      return modelDefinitions;
    }

    const macroDefinitions = this.macroDefinitionProvider.provideDefinitions(document, position, jinja);
    if (macroDefinitions) {
      return macroDefinitions;
    }

    const sourceDefinitions = this.sourceDefinitionProvider.provideDefinitions(document, position, jinja);
    if (sourceDefinitions) {
      return sourceDefinitions;
    }

    return undefined;
  }
}
