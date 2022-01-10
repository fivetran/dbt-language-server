# Developing in WSL

Windows users can use this extension via WSL.

**Note:** This extension tested with WSL 2 only but previous versions also can work.

## Prerequisites

1. Install the [Windows Subsystem for Linux](https://docs.microsoft.com/windows/wsl/install-win10) along with your preferred Linux distribution.
2. Install [Visual Studio Code](https://code.visualstudio.com/) on the Windows side (not in WSL).
3. Install the [Remote Development extension pack](https://aka.ms/vscode-remote/download/extension).

**Note:** See detailed instructions [here](https://code.visualstudio.com/docs/remote/wsl#_getting-started).

## Install dbt-language-server extension

VS Code runs extensions in one of two places: locally on the UI / client side, or in WSL. You need to install dbt-language-server in WSL. See ['Managing extensions'](https://code.visualstudio.com/docs/remote/wsl#_managing-extensions).

## Open your dbt project in VS Code
**Note:** See [detailed instructions](https://code.visualstudio.com/docs/remote/wsl#_open-a-remote-folder-or-workspace).

### From the WSL terminal
1. Open a WSL terminal window (using the start menu item or by typing ```wsl``` from a command prompt / PowerShell).
2. Navigate to a folder you'd like to open in VS Code (including, but not limited to, Windows filesystem mounts like ```/mnt/c```).
3. Type ```code .``` in the terminal.

### From VS Code
1. Start VS Code.
2. Press ```F1```, select **Remote-WSL: New Window** for the default distro or **Remote-WSL: New Window using Distro** for a specific distro.
3. Use the File menu to open your folder.

### From the Windows command prompt
To open a WSL window directly from a Windows prompt use the ```--remote``` command line parameter:
```
code --remote wsl+<distro name> <path in WSL>
```
