To debug the extension in Ubuntu Linux container:
- Install the [Remote Development extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack)
- Modify ./.devcontainer/devcontainer.json to mount your ~/.dbt folder, files with credentials and test projects to the container
  ```json
  "mounts": [
    "source=/Users/user/.dbt/,target=/home/vscode/.dbt/,type=bind,readonly",
    "source=/Users/user/.dbt/your-project-credentials.json,target=/Users/user/.dbt/your-project-credentials.json,type=bind,readonly",
    "source=/Users/user/test-project,target=/home/vscode/test-project,type=bind",
  ]
  ```
- Use Cmd+Shift+P and 'Remote-Containers: Reopen Folder Locally', 'Remote-Containers: Reopen in Container' commands to switch between local environment and docker container environment
- If you switch the environment don't forget to do `npm i` because of platforms specific dependencies

**Note:** You can find full documentation in [Create a development container](https://code.visualstudio.com/docs/remote/create-dev-container).