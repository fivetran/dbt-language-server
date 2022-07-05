import * as path from 'path';
import { DefinitionLink, LocationLink, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DbtRepository } from '../DbtRepository';
import { ParseNode } from '../JinjaParser';
import { ManifestModel } from '../manifest/ManifestJson';
import { getWordRangeAtPosition } from '../utils/TextUtils';
import { getAbsolutePosition, getAbsoluteRange, getRelativePosition, positionInRange } from '../utils/Utils';
import { DbtDefinitionProvider, DbtNodeDefinitionProvider } from './DbtDefinitionProvider';

export class ModelDefinitionProvider implements DbtNodeDefinitionProvider {
  static readonly REF_PATTERN = /ref\s*\(\s*('[^)']*'|"[^)"]*")(\s*,\s*('[^)']*'|"[^)"]*"))?\s*\)/;
  static readonly REF_PARTS_PATTERN = /'[^']*'|"[^*]*"/g;

  constructor(private dbtRepository: DbtRepository) {}

  provideDefinitions(document: TextDocument, position: Position, jinja: ParseNode): DefinitionLink[] | undefined {
    const expressionLines = jinja.value.split('\n');
    const relativePosition = getRelativePosition(jinja.range, position);
    if (relativePosition === undefined) {
      return undefined;
    }
    const wordRange = getWordRangeAtPosition(relativePosition, ModelDefinitionProvider.REF_PATTERN, expressionLines);

    if (wordRange) {
      const word = document.getText(getAbsoluteRange(jinja.range.start, wordRange));
      const matches = [];
      let match: RegExpExecArray | null;
      while ((match = ModelDefinitionProvider.REF_PARTS_PATTERN.exec(word))) {
        matches.push({
          text: match[0],
          index: match.index,
        });
      }

      const isPackageSpecified = matches.length === 2;
      const wordAbsoluteOffset = document.offsetAt(getAbsolutePosition(jinja.range.start, wordRange.start));
      let dbtPackage = undefined;
      let model;
      let packageSelectionRange;
      let modelSelectionRange;

      if (isPackageSpecified) {
        dbtPackage = matches[0].text.slice(1, -1);
        model = matches[1].text.slice(1, -1);

        packageSelectionRange = Range.create(
          document.positionAt(wordAbsoluteOffset + matches[0].index + 1),
          document.positionAt(wordAbsoluteOffset + matches[0].index + matches[0].text.length - 1),
        );
        modelSelectionRange = Range.create(
          document.positionAt(wordAbsoluteOffset + matches[1].index + 1),
          document.positionAt(wordAbsoluteOffset + matches[1].index + matches[1].text.length - 1),
        );

        if (positionInRange(position, packageSelectionRange)) {
          return this.searchPackageDefinition(dbtPackage, this.dbtRepository.models, packageSelectionRange);
        }
      } else {
        model = matches[0].text.slice(1, -1);
        packageSelectionRange = undefined;
        modelSelectionRange = Range.create(
          document.positionAt(wordAbsoluteOffset + matches[0].index + 1),
          document.positionAt(wordAbsoluteOffset + matches[0].index + matches[0].text.length - 1),
        );
      }

      if (positionInRange(position, modelSelectionRange)) {
        return this.searchModelDefinition(model, this.dbtRepository.models, modelSelectionRange, dbtPackage);
      }
    }

    return undefined;
  }

  searchPackageDefinition(dbtPackage: string, dbtModels: ManifestModel[], packageSelectionRange: Range): DefinitionLink[] | undefined {
    const modelIdPattern = `model.${dbtPackage.slice(1, -1)}.`;
    return dbtModels
      .filter(m => m.uniqueId.startsWith(modelIdPattern))
      .map(m =>
        LocationLink.create(
          path.join(m.rootPath, m.originalFilePath),
          DbtDefinitionProvider.MAX_RANGE,
          DbtDefinitionProvider.MAX_RANGE,
          packageSelectionRange,
        ),
      );
  }

  searchModelDefinition(model: string, dbtModels: ManifestModel[], modelSelectionRange: Range, dbPackage?: string): DefinitionLink[] | undefined {
    const foundModel = dbtModels.find(m => m.name === model && (dbPackage === undefined || m.packageName === dbPackage));
    if (foundModel) {
      return [
        LocationLink.create(
          path.join(foundModel.rootPath, foundModel.originalFilePath),
          DbtDefinitionProvider.MAX_RANGE,
          DbtDefinitionProvider.MIN_RANGE, // Decided to use the same range as other dbt extensions in order VS Code to filter equal values from definitions list (some details here: https://github.com/microsoft/vscode/issues/63895)
          modelSelectionRange,
        ),
      ];
    }
    return undefined;
  }
}
