# Language Server for dbt

## Features

### Highlighting errors

![Highlighting errors](images/HighlightingErrors.png)

### Signature help

![Signature help](images/SignatureHelp.png)

### Completion

![Completion](images/Completion.png)

### dbt compile preview

![dbt compile preview](images/dbtCompilePreview.png)

### Information on hover

![Information on hover](images/InformationOnHover.png)

## How to use

Extension works on macOS, it supports only default dbt configuration and BigQuery destination with the [Service Account File authorization type](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file).

Requirements for using the extension:
- [Install dbt](https://docs.getdbt.com/dbt-cli/installation)
- Check in console that dbt command works: `dbt --version`
- Create `profiles.yml` in `~/.dbt/` folder and add profile to connect to BigQuery using [Service Account File authorization type](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file)

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
- Open dbt project root folder that contains `dbt_project.yml` for configured profile

## How to build

To build extension locally you need to have `npm` installed.

Run the following commands in the root directory

```bash
$ npm install
$ npm run compile
$ code .
```

The above installs all dependencies and opens the project containing both the client and server code.
