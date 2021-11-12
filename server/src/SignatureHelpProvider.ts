import { MarkupKind, SignatureHelp, SignatureHelpParams, SignatureInformation } from 'vscode-languageserver';
import { HelpProviderWords } from './HelpProviderWords';

export interface FunctionInfo {
  name: string;
  sinatures: SignatureInfo[];
}

export interface SignatureInfo {
  signature: string;
  description: string;
}

export class SignatureHelpProvider {
  signatureInformations = new Map<string, SignatureInformation[]>();

  onSignatureHelp(params: SignatureHelpParams, text: string): SignatureHelp | undefined {
    const index = HelpProviderWords.findIndex(w => w.name === text);
    if (index !== -1) {
      return {
        signatures: HelpProviderWords[index].sinatures.map(
          s =>
            <SignatureInformation>{
              label: s.signature,
              documentation: {
                kind: MarkupKind.Markdown,
                value: s.description,
              },
            },
        ),
        activeSignature: 0,
        activeParameter: null,
      };
    }
    return undefined;
  }
}
