# Windows support

By default extension works on Windows but it requires requires WSL and Ubuntu 20.04 to be installed. Ubuntu is used to run [ZetaSQL](https://github.com/google/zetasql) analyzer.
If it is not installed you will see the following warning:  
<img src="https://raw.githubusercontent.com/fivetran/dbt-language-server/main/images/wsl-warning.png" width=50% height=50%>  
To install WSL and Ubuntu 20.04 run the following command as **Administrator** (this requires a computer restart):<br/> `wsl --install -d Ubuntu-20.04`

---

You can also run extension fully inside WSL or Docker Container:

- [Run VS Code in Windows Subsystem for Linux](#wsl)
- [Run VS Code in a Docker Container](#docker)

## <a name="wsl"></a>Run VS Code in Windows Subsystem for Linux (WSL)

### Prerequisites

1. Install the [Windows Subsystem for Linux](https://docs.microsoft.com/windows/wsl/install-win10) along with your preferred Linux distribution.
1. Install [Visual Studio Code](https://code.visualstudio.com/) on the Windows side (not in WSL).
1. Install the [Remote Development extension pack](https://aka.ms/vscode-remote/download/extension).

**Note:** See the [Visual Studio Code Remote - WSL documentation](https://code.visualstudio.com/docs/remote/wsl#_getting-started) for more details.

### Install dbt Language Server extension

VS Code runs extensions in one of the two places: locally on the UI / client side, or in WSL. You need to install dbt Language Server in WSL. See the [Managing extensions documentation](https://code.visualstudio.com/docs/remote/wsl#_managing-extensions).

### Open your dbt project in VS Code

**Note:** See [the detailed instructions on how to open remote folder or workspace](https://code.visualstudio.com/docs/remote/wsl#_open-a-remote-folder-or-workspace).

#### From the WSL terminal

1. Open a WSL terminal window (using the start menu item or by typing `wsl` from a command prompt / PowerShell).
1. Navigate to a folder you'd like to open in VS Code (including, but not limited to, Windows filesystem mounts like `/mnt/c`).
1. Type `code .` in the terminal.

#### From VS Code

1. Start VS Code.
1. Press **F1**, select **Remote-WSL: New Window** for the default distro or **Remote-WSL: New Window using Distro** for a specific distro.
1. Use the **File** menu to open your folder.

#### From the Windows command prompt

To open a WSL window directly from a Windows prompt, use the `--remote` command line parameter:

```
code --remote wsl+<distro name> <path in WSL>
```

## <a name="docker"></a>Run VS Code in a Docker Container

1. Install the [Remote Development extension pack](https://aka.ms/vscode-remote/download/extension).
1. Create the `./.devcontainer/Dockerfile` file in your project root folder with the following content:
   ```dockerfile
   ARG VARIANT="hirsute"
   FROM mcr.microsoft.com/vscode/devcontainers/base:0-${VARIANT}
   ```
1. Create `./.devcontainer/devcontainer.json` file in your project's root folder and paste the following content (see [the Devcontainer.json Reference documentation](https://code.visualstudio.com/docs/remote/devcontainerjson-reference) for more information). **Note**: replace _dbt-bigquery_ with your adapter, such as _dbt-postgres_.

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
       "python": "3.9"
     },

     "mounts": ["source=C:/Users/your_user/.dbt/,target=/home/vscode/.dbt/,type=bind,readonly"]
   }
   ```

1. Replace the path in the `mounts` section with your actual paths.
1. If you use any absolute path in your `.dbt/profiles.yml`, add one more mount for your path and change it in the `.dbt/profiles.yml`:
   ```json
   "source=C:/Users/your_user/.dbt/your-project-credentials.json,target=/Users/user/.dbt/your-project-credentials.json,type=bind,readonly",
   ```
1. Use **Ctrl+Shift+P** and the **Remote-Containers: Reopen Folder Locally**, **Remote-Containers: Reopen in Container** commands to switch between the local environment and docker container environment for your project.

**Note:** See the [Developing inside a Container documentation](https://code.visualstudio.com/docs/remote/containers) for detailed instructions.
