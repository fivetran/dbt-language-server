# Language Server for dbt

This extension will help you work with dbt and BigQuery.

## Features

### Highlighting errors

![Highlighting errors](images/HighlightingErrors.png)

### Signature help

![Signature help](images/SignatureHelp.png)

### Completion for SQL

![Completion for SQL](images/Completion.png)

### Completion for dbt models

![Completion for dbt models](images/CompletionForModels.png)

### dbt compile preview

![dbt compile preview](images/dbtCompilePreview.png)

### Information on hover

![Information on hover](images/InformationOnHover.png)

## How to use

Extension works on macOS, now it supports the default locations for `profiles.yml` and `dbt_project.yml` files and the BigQuery destination with the [Service Account File authorization type](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file).

Prior to using the extension, you need to perform the following steps:
1. [Install dbt](https://docs.getdbt.com/dbt-cli/installation).
2. In Terminal, test that dbt works running the `dbt --version` command or [specify the Python environment](https://code.visualstudio.com/docs/python/environments#_manually-specify-an-interpreter) for VSCode that was used to install dbt.
3. Create a file named `profiles.yml` in the `~/.dbt/` folder and add a profile to connect to BigQuery using the [Service Account File authorization type](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file):

    Example of `/Users/user/.dbt/profiles.yml`:
    ``` 
    my-bigquery-db:
    target: prod
    outputs:
      prod:
        type: bigquery
        method: service-account
        project: google-test-project-id-400
        keyfile: /Users/user/.dbt/google-test-project-id-400.json
        dataset: dbt_default
        threads: 4
        timeout_seconds: 3600
        priority: interactive
        retries: 1
    ```
4. Open the dbt project root folder that contains `dbt_project.yml` for the configured profile in the new VSCode window.
5. Now you can open your model and see the dbt compile preview by right-clicking the code and choosing **Show query preview** from the context menu.
