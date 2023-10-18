import { DefinitionLink, DefinitionParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { JinjaParser } from '../JinjaParser';
import { positionInRange } from '../utils/Utils';
import { DbtDefinitionProvider } from './DbtDefinitionProvider';
import { SqlDefinitionProvider } from './SqlDefinitionProvider';

export class DefinitionProvider {
  constructor(
    private jinjaParser: JinjaParser,
    private sqlDefinitionProvider: SqlDefinitionProvider,
    private dbtDefinitionProvider: DbtDefinitionProvider,
  ) {}

  async onDefinition(
    definitionParams: DefinitionParams,
    rawDocument: TextDocument,
    compiledDocument: TextDocument,
  ): Promise<DefinitionLink[] | undefined> {
    const jinjas = this.jinjaParser.findAllEffectiveJinjas(rawDocument);
    for (const jinja of jinjas) {
      if (positionInRange(definitionParams.position, jinja.range)) {
        const jinjaType = this.jinjaParser.getJinjaType(jinja.value);
        return this.dbtDefinitionProvider.provideDefinitions(rawDocument, jinja, definitionParams.position, jinjaType);
      }
    }

    return this.sqlDefinitionProvider.provideDefinitions(definitionParams, rawDocument, compiledDocument);
  }
}
