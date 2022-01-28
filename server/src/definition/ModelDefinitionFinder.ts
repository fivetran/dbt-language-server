import { DefinitionLink, Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Expression } from '../JinjaParser';
import { ManifestModel } from '../manifest/ManifestJson';

export class ModelDefinitionFinder {
  searchModelDefinitions(
    document: TextDocument,
    position: Position,
    expression: Expression,
    _dbtModels: ManifestModel[],
  ): DefinitionLink[] | undefined {
    const expressionLines = expression.expression.split('\n');
    if (!expressionLines[0].startsWith('{{')) {
      return undefined;
    }
    return undefined;
  }
}
