import * as path from 'path';
import { DefinitionLink, integer, LocationLink, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Expression } from '../JinjaParser';
import { ManifestModel } from '../manifest/ManifestJson';
import { getWordRangeAtPosition } from '../utils/TextUtils';
import { getAbsoluteRange, getRelativePosition } from '../utils/Utils';

export class ModelDefinitionFinder {
  static readonly REF_PATTERN = /(ref)\s*\([^)]+\)/;
  static readonly REF_PARTS_PATTERN = /\(\s*('[^']+'|"[^"]+")(\s*,\s*('[^']+'|"[^"]+"))?\s*\)/g;

  searchModelDefinitions(
    document: TextDocument,
    position: Position,
    expression: Expression,
    projectName: string,
    dbtModels: ManifestModel[],
  ): DefinitionLink[] | undefined {
    const expressionLines = expression.expression.split('\n');
    const relativePosition = getRelativePosition(expression.range, position);
    if (relativePosition === undefined) {
      return undefined;
    }
    const wordRange = getWordRangeAtPosition(relativePosition, ModelDefinitionFinder.REF_PATTERN, expressionLines);

    if (wordRange) {
      const word = document.getText(getAbsoluteRange(expression.range.start, wordRange));
      const matches = [];
      let match: RegExpExecArray | null;
      while ((match = ModelDefinitionFinder.REF_PARTS_PATTERN.exec(word))) {
        matches.push(match);
      }

      const dbPackage = matches[0][3] ? matches[0][1].substring(1).slice(0, -1) : projectName;
      const model = (matches[0][3] ? matches[0][3] : matches[0][1]).substring(1).slice(0, -1);
      const modelId = `model.${dbPackage}.${model}`;

      const modelsSearch = dbtModels.filter(m => m.uniqueId === modelId);
      if (modelsSearch.length === 0) {
        return undefined;
      }

      const [selectedModel] = modelsSearch;
      return [
        LocationLink.create(
          path.join(selectedModel.rootPath, selectedModel.originalFilePath),
          Range.create(Position.create(0, 0), Position.create(integer.MAX_VALUE, integer.MAX_VALUE)),
          Range.create(Position.create(0, 0), Position.create(0, 0)),
          getAbsoluteRange(expression.range.start, wordRange),
        ),
      ];
    }

    return undefined;
  }
}
