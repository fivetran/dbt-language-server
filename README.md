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

Extension works on macOS, now it supports the default locations for `profiles.yml` and `dbt_project.yml` files and the BigQuery destination with [Service Account File](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file) and [Service Account JSON](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-json) authorization type.

Prior to using the extension, you need to perform the following steps:
1. [Install dbt](https://docs.getdbt.com/dbt-cli/installation).
2. In Terminal, test that dbt works running the `dbt --version` command or [specify the Python environment](https://code.visualstudio.com/docs/python/environments#_manually-specify-an-interpreter) for VSCode that was used to install dbt (e.g. `~/dbt-env/bin/python3`).
3. Create a file named `profiles.yml` in the `~/.dbt/` folder and add a profile to connect to BigQuery
   * using the [OAuth via gcloud](docs/BigQueryProfile.md#oauth-via-gcloud)
   * using the [Service Account File](docs/BigQueryProfile.md#service-account-file)
   * using the [Service Account JSON](docs/BigQueryProfile.md#service-account-json)
4. Open the dbt project root folder that contains `dbt_project.yml` for the configured profile in the new VSCode window.
5. Now you can open your model and see the dbt compile preview by right-clicking the code and choosing **Show query preview** from the context menu.
