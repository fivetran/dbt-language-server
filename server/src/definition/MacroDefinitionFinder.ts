import { DefinitionLink, Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Expression } from '../JinjaParser';
import { ManifestMacro } from '../manifest/ManifestJson';

export class MacroDefinitionFinder {
  searchMacroDefinitions(
    _document: TextDocument,
    _position: Position,
    _expression: Expression,
    _dbtMacros: ManifestMacro[],
  ): DefinitionLink[] | undefined {
    return undefined;
  }
}
