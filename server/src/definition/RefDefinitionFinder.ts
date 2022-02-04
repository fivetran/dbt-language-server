import * as path from 'path';
import { DefinitionLink, LocationLink, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ParseNode } from '../JinjaParser';
import { ManifestModel } from '../manifest/ManifestJson';
import { getWordRangeAtPosition } from '../utils/TextUtils';
import { getAbsolutePosition, getAbsoluteRange, getRelativePosition, positionInRange } from '../utils/Utils';
import { JinjaDefinitionProvider } from './JinjaDefinitionProvider';

export class RefDefinitionFinder {
  static readonly REF_PATTERN = /ref\s*\(\s*('[^)']*'|"[^)"]*")(\s*,\s*('[^)']*'|"[^)"]*"))?\s*\)/;
  static readonly REF_PARTS_PATTERN = /'[^']*'|"[^*]*"/g;

  searchRefDefinitions(
    document: TextDocument,
    position: Position,
    jinja: ParseNode,
    projectName: string,
    dbtModels: ManifestModel[],
  ): DefinitionLink[] | undefined {
    const expressionLines = jinja.value.split('\n');
    const relativePosition = getRelativePosition(jinja.range, position);
    if (relativePosition === undefined) {
      return undefined;
    }
    const wordRange = getWordRangeAtPosition(relativePosition, RefDefinitionFinder.REF_PATTERN, expressionLines);

    if (wordRange) {
      const word = document.getText(getAbsoluteRange(jinja.range.start, wordRange));
      const matches = [];
      let match: RegExpExecArray | null;
      while ((match = RefDefinitionFinder.REF_PARTS_PATTERN.exec(word))) {
        matches.push({
          text: match[0],
          index: match.index,
        });
      }

      const isPackageSpecified = matches.length === 2;
      const dbtPackage = isPackageSpecified ? matches[0].text : `'${projectName}'`;
      const model = isPackageSpecified ? matches[1].text : matches[0].text;

      const packageSelectionRange = isPackageSpecified
        ? Range.create(
            document.positionAt(document.offsetAt(getAbsolutePosition(jinja.range.start, wordRange.start)) + matches[0].index + 1),
            document.positionAt(
              document.offsetAt(getAbsolutePosition(jinja.range.start, wordRange.start)) + matches[0].index + matches[0].text.length - 1,
            ),
          )
        : undefined;
      const modelSelectionRange = isPackageSpecified
        ? Range.create(
            document.positionAt(document.offsetAt(getAbsolutePosition(jinja.range.start, wordRange.start)) + matches[1].index + 1),
            document.positionAt(
              document.offsetAt(getAbsolutePosition(jinja.range.start, wordRange.start)) + matches[1].index + matches[1].text.length - 1,
            ),
          )
        : Range.create(
            document.positionAt(document.offsetAt(getAbsolutePosition(jinja.range.start, wordRange.start)) + matches[0].index + 1),
            document.positionAt(
              document.offsetAt(getAbsolutePosition(jinja.range.start, wordRange.start)) + matches[0].index + matches[0].text.length - 1,
            ),
          );

      if (packageSelectionRange && positionInRange(position, packageSelectionRange)) {
        return this.searchPackageDefinition(dbtPackage, dbtModels, packageSelectionRange);
      } else if (positionInRange(position, modelSelectionRange)) {
        return this.searchModelDefinition(dbtPackage, model, dbtModels, modelSelectionRange);
      }
    }

    return undefined;
  }

  searchPackageDefinition(dbtPackage: string, dbtModels: ManifestModel[], packageSelectionRange: Range): DefinitionLink[] | undefined {
    const modelIdPattern = `model.${dbtPackage.substring(1).slice(0, -1)}.`;
    return dbtModels
      .filter(m => m.uniqueId.startsWith(modelIdPattern))
      .map(m =>
        LocationLink.create(
          path.join(m.rootPath, m.originalFilePath),
          JinjaDefinitionProvider.MAX_RANGE,
          JinjaDefinitionProvider.MAX_RANGE,
          packageSelectionRange,
        ),
      );
  }

  searchModelDefinition(dbPackage: string, model: string, dbtModels: ManifestModel[], modelSelectionRange: Range): DefinitionLink[] | undefined {
    const modelId = `model.${dbPackage.substring(1).slice(0, -1)}.${model.substring(1).slice(0, -1)}`;
    const foundModel = dbtModels.find(m => m.uniqueId === modelId);
    if (foundModel) {
      return [
        LocationLink.create(
          path.join(foundModel.rootPath, foundModel.originalFilePath),
          JinjaDefinitionProvider.MAX_RANGE,
          JinjaDefinitionProvider.MAX_RANGE,
          modelSelectionRange,
        ),
      ];
    }
    return undefined;
  }
}
