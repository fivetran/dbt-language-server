import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompileResult, DbtServer } from './DbtServer';
import { DbtTextDocument } from './DbtTextDocument';

export class ModelCompiler {
    dbtTextDocument: DbtTextDocument;
    dbtServer: DbtServer;
    pollRequestTokenQueue: string[] = [];
    pollIsRunning = false;

    constructor(dbtTextDocument: DbtTextDocument, dbtServer: DbtServer) {
        this.dbtTextDocument = dbtTextDocument;
        this.dbtServer = dbtServer;
    }

    async compile() {
        const status = await this.dbtServer.getReadyOrErrorStatus();
        if (status?.error) {
            await this.dbtTextDocument.onCompilationFinished(status?.error.message);
            return;
        }

        const response = await this.dbtServer.compileSql(this.dbtTextDocument.rawDocument.getText());
        if (response) {
            this.pollRequestTokenQueue.push(response.result.request_token);
            await this.pollResults();
        }
    }

    async pollResults() {
        if (this.pollIsRunning) {
            console.log('pollIsRunning === true')
            return;
        }
        this.pollIsRunning = true;
        
        while (this.pollRequestTokenQueue.length > 0) {
            const length = this.pollRequestTokenQueue.length;

            for (let i = length - 1; i >= 0; i--) {
                const token =  this.pollRequestTokenQueue[i];
                const response = await this.dbtServer.pollOnceCompileResult(token);

                if (response?.error || response?.result.state !== 'running') {
                    this.pollRequestTokenQueue.splice(0, i + 1);
                    console.log(`${i + 1} elements was removed`);

                    if (response?.error) {
                        await this.dbtTextDocument.onCompilationFinished(response?.error.data?.message);
                        break;
                    }

                    console.log(`Compilation state for ${token} is ${response?.result.state}`);
                    const compiledNodes = (<CompileResult[]>response?.result.results);

                    if(compiledNodes.length > 0) {
                        const compiledSql = compiledNodes[0].node.compiled_sql;
                        console.log(compiledSql);
                        TextDocument.update(this.dbtTextDocument.compiledDocument, [ {text: compiledSql } ], this.dbtTextDocument.compiledDocument.version);
                        await this.dbtTextDocument.onCompilationFinished();
                    }
                    break;
               }
            }
            
            if (this.pollRequestTokenQueue.length === 0) {
                break;
            }
            await this.wait(300);
        }
        this.pollIsRunning = false;
    }

    wait(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms, []));
    }
}