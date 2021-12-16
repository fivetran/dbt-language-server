import { Uri, workspace, WorkspaceFolder } from 'vscode';

export class WorkspaceHelper {
  sortedWorkspaceFolders?: string[];

  constructor() {
    workspace.onDidChangeWorkspaceFolders(() => {
      this.sortedWorkspaceFolders = undefined;
    });
  }

  getOuterMostWorkspaceFolder(folder: WorkspaceFolder): WorkspaceFolder {
    const sorted = this.getSortedWorkspaceFolders();
    for (const element of sorted) {
      let uri = folder.uri.toString();
      if (uri.charAt(uri.length - 1) !== '/') {
        uri = uri + '/';
      }
      if (uri.startsWith(element)) {
        const outerFolder = workspace.getWorkspaceFolder(Uri.parse(element));
        if (!outerFolder) {
          throw new Error("Can't find outer most workspace folder");
        }
        return outerFolder;
      }
    }
    return folder;
  }

  getSortedWorkspaceFolders(): string[] {
    if (this.sortedWorkspaceFolders === undefined) {
      this.sortedWorkspaceFolders = workspace.workspaceFolders
        ? workspace.workspaceFolders
            .map(folder => {
              let result = folder.uri.toString();
              if (result.charAt(result.length - 1) !== '/') {
                result = result + '/';
              }
              return result;
            })
            .sort((a, b) => a.length - b.length)
        : [];
    }
    return this.sortedWorkspaceFolders;
  }
}
