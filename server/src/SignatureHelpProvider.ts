import { MarkupKind, SignatureHelp, SignatureInformation } from 'vscode-languageserver';
import { HelpProviderWords } from './HelpProviderWords';

export interface FunctionInfo {
  name: string;
  signatures: SignatureInfo[];
}

export interface SignatureInfo {
  signature: string;
  description: string;
}

export class SignatureHelpProvider {
  onSignatureHelp(text: string): SignatureHelp | undefined {
    const index = HelpProviderWords.findIndex(w => w.name === text.toLocaleLowerCase());
    if (index !== -1) {
      return {
        signatures: HelpProviderWords[index].signatures.map<SignatureInformation>(s => ({
          label: s.signature,
          documentation: {
            kind: MarkupKind.Markdown,
            value: s.description,
          },
        })),
        activeSignature: 0,
      };
    }
    return undefined;
  }
}
