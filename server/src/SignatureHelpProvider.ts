import { MarkupKind, ParameterInformation, SignatureHelp, SignatureInformation, uinteger } from 'vscode-languageserver';
import { HelpProviderWords } from './HelpProviderWords';

export interface FunctionInfo {
  name: string;
  signatures: SignatureInfo[];
}

interface SignatureInfo {
  signature: string;
  description: string;
  parameters: string[];
}

export class SignatureHelpProvider {
  onSignatureHelp(text: string, activeParameter: number, activeSignatureHelp?: SignatureHelp): SignatureHelp | undefined {
    const index = HelpProviderWords.findIndex(w => w.name === text.toLocaleLowerCase());
    if (index !== -1) {
      const signatures = HelpProviderWords[index].signatures.map<SignatureInformation>(s => ({
        label: s.signature,
        documentation: {
          kind: MarkupKind.Markdown,
          value: s.description,
        },
        parameters: s.parameters.length > 0 ? s.parameters.map(p => ParameterInformation.create(p)) : undefined,
      }));

      return {
        signatures,
        activeSignature: this.getActiveSignature(signatures, activeParameter, activeSignatureHelp),
        activeParameter,
      };
    }
    return undefined;
  }

  getActiveSignature(signatures: SignatureInformation[], activeParameter: number, activeSignatureHelp?: SignatureHelp): uinteger {
    let activeSignature = 0;
    const lastActiveSignature = activeSignatureHelp?.activeSignature
      ? activeSignatureHelp.signatures[activeSignatureHelp.activeSignature]
      : undefined;
    if (lastActiveSignature && lastActiveSignature.parameters && lastActiveSignature.parameters.length - 1 >= activeParameter) {
      activeSignature = signatures.findIndex(s => s.label === lastActiveSignature.label);
    }
    if (activeSignature === -1) {
      activeSignature = signatures.findIndex(s => s.parameters && s.parameters.length - 1 >= activeParameter);
    }

    return activeSignature;
  }
}
