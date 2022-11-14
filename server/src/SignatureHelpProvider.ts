import { MarkupKind, ParameterInformation, SignatureHelp, SignatureInformation } from 'vscode-languageserver';
import { HelpProviderWords } from './HelpProviderWords';

export interface FunctionInfo {
  name: string;
  signatures: SignatureInfo[];
}

export interface SignatureInfo {
  signature: string;
  description: string;
  parameters: string[];
}

export class SignatureHelpProvider {
  onSignatureHelp(text: string, activeParameter: number): SignatureHelp | undefined {
    const index = HelpProviderWords.findIndex(w => w.name === text.toLocaleLowerCase());
    if (index !== -1) {
      return {
        signatures: HelpProviderWords[index].signatures.map<SignatureInformation>(s => ({
          label: s.signature,
          documentation: {
            kind: MarkupKind.Markdown,
            value: s.description,
          },
          parameters: s.parameters.length > 0 ? s.parameters.map(p => ParameterInformation.create(p)) : undefined,
        })),
        activeParameter,
      };
    }
    return undefined;
  }
}
