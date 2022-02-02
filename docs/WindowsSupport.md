# Windows support

Using this extension on Windows requires additional setup steps. You can use one of two approaches:

- [Run VS Code in Windows Subsystem for Linux](#wsl)
- [Run VS Code in a Docker Container](#docker)

## <a name="wsl"></a>Run VS Code in Windows Subsystem for Linux (WSL)

### Prerequisites

1. Install the [Windows Subsystem for Linux](https://docs.microsoft.com/windows/wsl/install-win10) along with your preferred Linux distribution.
1. Install [Visual Studio Code](https://code.visualstudio.com/) on the Windows side (not in WSL).
1. Install the [Remote Development extension pack](https://aka.ms/vscode-remote/download/extension).

**Note:** See detailed instructions [here](https://code.visualstudio.com/docs/remote/wsl#_getting-started).

### Install dbt Language Server extension

VS Code runs extensions in one of two places: locally on the UI / client side, or in WSL. You need to install dbt Language Server in WSL. See ['Managing extensions'](https://code.visualstudio.com/docs/remote/wsl#_managing-extensions).

### Open your dbt project in VS Code
**Note:** See [detailed instructions](https://code.visualstudio.com/docs/remote/wsl#_open-a-remote-folder-or-workspace).

#### From the WSL terminal
1. Open a WSL terminal window (using the start menu item or by typing ```wsl``` from a command prompt / PowerShell).
1. Navigate to a folder you'd like to open in VS Code (including, but not limited to, Windows filesystem mounts like ```/mnt/c```).
1. Type ```code .``` in the terminal.

#### From VS Code
1. Start VS Code.
1. Press ```F1```, select **Remote-WSL: New Window** for the default distro or **Remote-WSL: New Window using Distro** for a specific distro.
1. Use the File menu to open your folder.

#### From the Windows command prompt
To open a WSL window directly from a Windows prompt use the ```--remote``` command line parameter:
```
code --remote wsl+<distro name> <path in WSL>
```

## <a name="docker"></a>Run VS Code in a Docker Container

1. Install the [Remote Development extension pack](https://aka.ms/vscode-remote/download/extension).
1. Create `./.devcontainer/Dockerfile` fle  in your project root folder with the content:
    ```dockerfile
    ARG VARIANT="hirsute"
    FROM mcr.microsoft.com/vscode/devcontainers/base:0-${VARIANT}
    ```
1. Create `./.devcontainer/devcontainer.json` file in your project root folder and paste the following content (see more information in [docs](https://aka.ms/devcontainer.json)) correcting mount section with your paths:
    ```json
    {
      "name": "Ubuntu",
      "build": {
        "dockerfile": "Dockerfile",
        "args": { "VARIANT": "focal" }
      },

      "settings": {
        "files.autoSave": "afterDelay"
      },

      "extensions": ["Fivetran.dbt-language-server"],

      "onCreateCommand": "pip install dbt-bigquery dbt-rpc",

      "remoteUser": "vscode",

      "features": {
        "python": "3.9",
      },

      "mounts": [
        "source=C:/Users/your_user/.dbt/,target=/home/vscode/.dbt/,type=bind,readonly",
      ]
    }
    ```
1. If you use any absolute path in your `.dbt/profiles.yml` add one more mount for your path and change it in the `.dbt/profiles.yml`
    ```json
    "source=C:/Users/your_user/.dbt/your-project-credentials.json,target=/Users/user/.dbt/your-project-credentials.json,type=bind,readonly",
    ```
1. Use Ctrl+Shift+P and 'Remote-Containers: Reopen Folder Locally', 'Remote-Containers: Reopen in Container' commands to switch between local environment and docker container environment for your project.

**Note:** See detailed instructions [here](https://code.visualstudio.com/docs/remote/containers).
