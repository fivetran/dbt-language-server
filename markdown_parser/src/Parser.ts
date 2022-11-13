import * as MarkdownIt from 'markdown-it';
import * as fs from 'node:fs';
import * as prettier from 'prettier';
import Token = require('markdown-it/lib/token');

interface FunctionInfo {
  name: string;
  signatures: SignatureInfo[];
}

interface SignatureInfo {
  signature: string;
  description: string;
  parameters: string[];
}

const filesToParse: Map<string, string[]> = new Map([
  [
    'https://raw.githubusercontent.com/google/zetasql/master/docs/functions-and-operators.md',
    [
      'Aggregate functions',
      'Statistical aggregate functions',
      'Approximate aggregate functions',
      'HyperLogLog++ functions',
      'KLL quantile functions',
      'Numbering functions',
      'Bit functions',
      'Conversion functions',
      'Mathematical functions',
      'Navigation functions',
      'Hash functions',
      'String functions',
      'JSON functions',
      'Array functions',
      'Date functions',
      'Datetime functions',
      'Time functions',
      'Timestamp functions',
      'Interval functions',
      'Security functions',
      'Net functions',
      'Conditional expressions',
      'Debugging functions',
    ],
  ],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/timestamp_functions.md', ['Timestamp functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/string_functions.md', ['String functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/statistical_aggregate_functions.md', ['Statistical aggregate functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/security_functions.md', ['Security functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/numbering_functions.md', ['Numbering functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/net_functions.md', ['Net functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/navigation_functions.md', ['Navigation functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/mathematical_functions.md', ['Mathematical functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/json_functions.md', ['JSON functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/hll_functions.md', ['HyperLogLog++ functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/hash_functions.md', ['Hash functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/datetime_functions.md', ['Datetime functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/date_functions.md', ['Date functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/bit_functions.md', ['Bit functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/array_functions.md', ['Array functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/approximate_aggregate_functions.md', ['Approximate aggregate functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/aggregate_functions.md', ['Aggregate functions']],
  ['https://raw.githubusercontent.com/google/zetasql/master/docs/aggregate_anonymization_functions.md', ['Anonymization aggregate functions']],
]);

const EXCEPTIONS = new Set<string>([
  'safe_cast',
  'bit_cast_to_int32',
  'bit_cast_to_int64',
  'bit_cast_to_uint32',
  'bit_cast_to_uint64',
  'to_json',
  'to_json_string',
]);

const additionalFields = [
  {
    name: 'to_json_string',
    signatures: [
      {
        signature: 'TO_JSON_STRING(value[, pretty_print])\n',
        description:
          'Takes a SQL value and returns a JSON-formatted string\nrepresentation of the value. The value must be a supported BigQuery\ndata type.',
        parameters: [],
      },
    ],
  },
];

async function parseAndSave(): Promise<void> {
  const md = new MarkdownIt();
  const functionInfos: FunctionInfo[] = [];
  const axios = await import('axios');

  for (const [file, sections] of filesToParse) {
    const getFileResult = await axios.default.get<string>(file);
    const content = getFileResult.data;
    const tokens = md.parse(content, {});

    for (const section of sections) {
      try {
        let i = tokens.findIndex(t => t.content === section);
        let token = tokens[i];
        while (i < tokens.length && !(token.markup === '##' && token.type === 'heading_open')) {
          if (token.type === 'heading_open' && token.markup === '###') {
            const name = tokens[i + 1].content.toLocaleLowerCase();
            console.log(name);

            if (name.includes(' ') || functionInfos.some(f => f.name === name) || EXCEPTIONS.has(name)) {
              i++;
              token = tokens[i];
              /* eslint-disable-next-line no-continue */
              continue;
            }
            const functionInfo: FunctionInfo = {
              name,
              signatures: [],
            };
            i += 3;
            token = tokens[i];

            if (token.type === 'fence') {
              if (token.content.startsWith('1.')) {
                const signatures = token.content.split('\n');
                for (const numberedSignature of signatures) {
                  if (numberedSignature !== '') {
                    addSignature(numberedSignature.slice(3), name, functionInfo);
                  }
                }
              } else {
                addSignature(token.content, name, functionInfo);
              }
            } else {
              while (token.type !== 'paragraph_open') {
                if (token.type === 'fence') {
                  addSignature(token.content, name, functionInfo);
                }
                i++;
                token = tokens[i];
              }
            }

            while (token.content !== '**Description**') {
              i++;
              token = tokens[i];
            }

            i += 2;
            token = tokens[i];

            if (token.type === 'ordered_list_open') {
              let j = 0;
              while (token.type !== 'ordered_list_close') {
                if (token.type === 'inline') {
                  functionInfo.signatures[j].description = parseText(token);
                  j++;
                }

                i++;
                token = tokens[i];
              }
            } else {
              const description = parseText(tokens[i + 1]);
              if (functionInfo.signatures.length === 0) {
                // There is no signature in md file for the function
                functionInfo.signatures.push({ signature: '', description, parameters: [] });
              }
              functionInfo.signatures[0].description = description;
            }
            functionInfos.push(functionInfo);
          }
          i++;
          token = tokens[i];
        }
      } catch (e) {
        console.log(`Error while handling file ${file}, section: ${section}`);
        throw e;
      }
    }
  }

  functionInfos.push(...additionalFields);

  const code = `/* eslint-disable sonarjs/no-duplicate-string */
    import { FunctionInfo } from './SignatureHelpProvider';
    
    export const HelpProviderWords: FunctionInfo[] = ${JSON.stringify(functionInfos)}`;

  const options = await prettier.resolveConfig('./.prettierrc');
  if (options === null) {
    throw new Error("Can't find options from ./.prettierrc");
  }
  options.parser = 'typescript';
  const formatted = prettier.format(code, options);
  fs.writeFileSync(`${__dirname}/../../server/src/HelpProviderWords.ts`, formatted);
}

function addSignature(rawSignature: string, functionName: string, functionInfo: FunctionInfo): void {
  const signature = rawSignature.trimEnd();
  const parameters: string[] = getParameters(signature, functionName);
  functionInfo.signatures.push({ signature, description: '', parameters });
}

function getParameters(signature: string, functionName: string): string[] {
  if (['[', '['].some(b => signature.includes(b)) || !signature.toLocaleLowerCase().startsWith(`${functionName}(`) || signature.endsWith('()')) {
    return [];
  }

  const allParameters = signature.slice(functionName.length + 1, signature.indexOf(')'));
  return allParameters.split(',').map(p => p.trim());
}

function parseText(token: Token): string {
  let result = '';
  if (token.children && token.children.length > 0) {
    for (const child of token.children) {
      if (child.type === 'text') {
        result += child.content;
      }
      if (child.type === 'code_inline') {
        result += `\`${child.content}\``;
      }
      if (child.type === 'softbreak') {
        result += '\n';
      }
    }
  }
  return result;
}

parseAndSave().catch(e => console.error(e));
