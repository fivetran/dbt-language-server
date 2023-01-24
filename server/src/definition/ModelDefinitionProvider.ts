import { DefinitionLink, LocationLink, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { Dag } from '../dag/Dag';
import { DbtRepository } from '../DbtRepository';
import { ParseNode } from '../JinjaParser';
import { ManifestModel } from '../manifest/ManifestJson';
import { getWordRangeAtPosition } from '../utils/TextUtils';
import { getAbsolutePosition, getAbsoluteRange, getRelativePosition, positionInRange, truncateAtBothSides } from '../utils/Utils';
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
        dbtPackage = truncateAtBothSides(matches[0].text);
        model = truncateAtBothSides(matches[1].text);

        packageSelectionRange = this.getAbsoluteTextRange(document, wordAbsoluteOffset, matches[0]);
        modelSelectionRange = this.getAbsoluteTextRange(document, wordAbsoluteOffset, matches[1]);

        if (positionInRange(position, packageSelectionRange)) {
          return this.searchPackageDefinition(dbtPackage, this.dbtRepository.dag, packageSelectionRange);
        }
      } else {
        model = truncateAtBothSides(matches[0].text);
        packageSelectionRange = undefined;
        modelSelectionRange = this.getAbsoluteTextRange(document, wordAbsoluteOffset, matches[0]);
      }

      if (positionInRange(position, modelSelectionRange)) {
        return this.searchModelDefinition(model, this.dbtRepository.dag, modelSelectionRange, dbtPackage);
      }
    }

    return undefined;
  }

  searchPackageDefinition(dbtPackage: string, dag: Dag, packageSelectionRange: Range): DefinitionLink[] | undefined {
    const modelIdPattern = `model.${dbtPackage}.`;
    return dag.nodes
      .filter(n => n.getValue().uniqueId.startsWith(modelIdPattern))
      .map(n => this.createLocationLink(n.getValue(), DbtDefinitionProvider.MAX_RANGE, packageSelectionRange));
  }

  searchModelDefinition(model: string, dag: Dag, modelSelectionRange: Range, dbPackage?: string): DefinitionLink[] | undefined {
    const foundNode = dag.nodes.find(n => n.getValue().name === model && (dbPackage === undefined || n.getValue().packageName === dbPackage));
    // Decided to use the same range as other dbt extensions in order VS Code to filter equal values from definitions list (some details here: https://github.com/microsoft/vscode/issues/63895)
    return foundNode ? [this.createLocationLink(foundNode.getValue(), DbtDefinitionProvider.MAX_RANGE, modelSelectionRange)] : undefined;
  }

  createLocationLink(manifestModel: ManifestModel, targetSelectionRange: Range, originSelectionRange: Range): LocationLink {
    return LocationLink.create(
      URI.file(this.dbtRepository.getModelRawSqlPath(manifestModel)).toString(),
      DbtDefinitionProvider.MAX_RANGE,
      targetSelectionRange,
      originSelectionRange,
    );
  }

  getAbsoluteTextRange(document: TextDocument, textBlockOffset: number, textBlock: { text: string; index: number }): Range {
    return Range.create(
      document.positionAt(textBlockOffset + textBlock.index + 1),
      document.positionAt(textBlockOffset + textBlock.index + textBlock.text.length - 1),
    );
  }
}
