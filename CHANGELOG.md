# Changelog

## Version 0.27.0 (01/01/1970)
## What's Changed
* In this release, we've introduced a new setting, WizardForDbtCore(TM).enableSnowflakeSyntaxCheck, which is turned off by default. When activated, this setting enables syntax checks for Snowflake dbt projects. As a result, any errors within models will be detected and displayed. Please note that this is an experimental feature and may not be entirely reliable. It could potentially yield false positive errors, indicating issues where there are none.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.26.2...v0.27.0
---

## Version 0.26.2 (12/06/2023)
## What's Changed
* Enabled [JSON functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions).
* Resolved an issue where the extension would unexpectedly restart during code editing.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.26.1...v0.26.2
---

## Version 0.26.1 (07/06/2023)
## What's Changed
* Fixed an error that occurred while compiling the project for adapters other than BigQuery.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.26.0...v0.26.1
---

## Version 0.26.0 (06/06/2023)
## What's Changed
* In this release we override `get_columns_in_relation` to work with code and not with BigQuery dataset directly. It should help to decrease false errors you could see when using dbt macros that access information schema.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.25.3...v0.26.0
---

## Version 0.25.3 (22/05/2023)
## What's Changed
* Added support for jinja filters in `profiles.yml`.
* Added support for `_file_name` pseudo column in external tables.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.25.2...v0.25.3
---

## Version 0.25.2 (15/05/2023)
## What's Changed
* Got rid of the warning asking about accepting incoming network connections.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.25.1...v0.25.2
---

## Version 0.25.1 (10/05/2023)
## What's Changed
* Resolved crash issue for linux-arm64 and macOS 11 platforms.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.25.0...v0.25.1
---

## Version 0.25.0 (07/05/2023)
## What's Changed
* Resolved crash issue in Visual Studio Code 1.78.0.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.24.0...v0.25.0
---

## Version 0.24.0 (03/05/2023)
## What's Changed
* Resolved false errors that occurred when switching between branches.
* Added compatibility with dbt 1.5.0.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.23.0...v0.24.0
---

## Version 0.23.0 (26/04/2023)
## What's Changed
* Enhanced OAuth error message for better clarity.
* Resolved "No connection established" error occurring when running on WSL with Ubuntu 20.04.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.22.0...v0.22.1
---

## Version 0.22.0 (06/04/2023)
## What's Changed
* Display only a single dbt-related error, if present.
* Added support to install specific versions of dbt-core and dbt adapters.
* Show progress during dbt package installation.
* Resolved the issue with re-authentication when using oAuth BigQuery configuration.
* Removed dbt-rpc support as it is being deprecated soon.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.21.2...v0.22.0
---

## Version 0.21.2 (30/03/2023)
## What's Changed
* Fix empty preview issue.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.21.0...v0.21.2
---

## Version 0.21.1 (29/03/2023)
## What's Changed
* Fix "dbt compile timeout exceeded" issue.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.21.0...v0.21.1
---

## Version 0.21.0 (24/03/2023)
## What's Changed
* Add the ability to customize the location of `profiles.yml` file useing `WizardForDbtCore(TM).profilesDir` setting.
* Improve error message when dbt or adapter not found.
* Show error if dbt adapter not found.
* Show project analysis progress in the status bar.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.20.1...v0.21.0
---

## Version 0.20.1 (03/03/2023)
## What's Changed
* Fix wrong `_dbt_max_partition` type.
* Fix go to definition for macros of dbt global_project.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.20.0...v0.20.1
---

## Version 0.20.0 (28/02/2023)
## What's Changed
* Add support for `ANY` type in temporary UDFs, for example:
```sql
CREATE TEMP FUNCTION ScalarUdf(a ANY TYPE)
AS (
  a + 1
);
```
* Add support for [go to column definition](https://github.com/fivetran/dbt-language-server/blob/main/images/go-to-column-definition.gif?raw=true) for BigQuery users.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.19.1...v0.20.0
---

## Version 0.19.1 (30/01/2023)
## What's Changed
* Added support for int64 aliases: `INT`, `SMALLINT`, `INTEGER`, `BIGINT`, `TINYINT`, `BYTEINT`.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.19.0...v0.19.1
---

## Version 0.19.0 (27/01/2023)
## What's Changed
* Fixed compilation issue when using dbt-core 1.4.0.
* Added the ability to analyze project using the **Analyze current project** button at upper right corner of VS Code editor or context menu. This feature can be disabled using menu **Preferences** -> **Settings** -> **Extensions** -> **Wizard for dbt Core (TM)** -> **Wizard For Dbt Core(TM): Enable Entire Project Analysis**.
* Recompile and reanalyze entire project after extension start or external changes happened.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.18.0...v0.19.0
---

## Version 0.18.0 (27/12/2022)
## What's Changed
* We now use dbt CLI for model and project compilation by default. You can switch between compiler used by extension in **Preferences** -> **Settings** -> **Extensions** -> **Wizard for dbt Core (TM)** -> **Wizard For Dbt Core(TM): Dbt Compiler**. 


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.17.1...v0.18.0
---

## Version 0.17.1 (20/12/2022)
## What's Changed
* Fix compilation issue when project, dataset and table are enclosed in backticks (\`project.dataset.table\`).
* Refresh credentials when they are expired for BigQuery oAuth authentication method.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.17.0...v0.17.1
---

## Version 0.17.0 (13/12/2022)
## What's Changed
* Fix package compilation issues.
* Analyze code instead of fetching data from BigQuery.
* Don't show error for closed Preview editor.
* Support `env_var` in profiles.yml.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.16.0...v0.17.0
---

## Version 0.16.0 (28/11/2022)
## What's Changed
* Add dbt snippets: `block`, `comment`, `config`, `for`, `if`, `ifelse`, `macro`, `ref`, `set`, `setblock`, `source`, `statement`.
* Highlight function signature parameters.
* Fix extension crush when packages-install-path is overridden.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.15.0...v0.16.0
---

## Version 0.15.0 (10/11/2022)
## What's Changed
* Add install WSL and Ubuntu button for Windows.
* Add the ability to install dbt, dbt adapters from language status item of any file.
* Increase grpc request/response max size to support big SQL queries.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.14.0...v0.15.0
---

## Version 0.14.0 (01/11/2022)
## What's Changed
* For the global dbt error, now only one error is displayed for the problem model.
* Show language status items for all files in active dbt project.
* Show link for `profiles.yml` file in language status item.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.13.1...v0.14.0
---

## Version 0.13.1 (26/10/2022)
## What's Changed
* Add button to upgrade `dbt-rpc` in case of error. 
   If your `dbt-rpc` version is outdated and don't compatible with installed dbt you may see the error. You can upgrade `dbt-rpc` to latest version with using button "Upgrade dbt-rpc" to resolve this issue. Another way is to change default compiler to `dbt` in `Preferences -> Settings -> Extensions -> Wizard for dbt Core (TM) -> Wizard For Dbt Core(TM): Dbt Compiler`.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.13.0...v0.13.1
---

## Version 0.13.0 (25/10/2022)
## What's Changed
* Run ZetaSql in WSL on Windows ([see docs](https://github.com/fivetran/dbt-language-server/blob/main/docs/WindowsSupport.md#windows-support)).
* Fix wrong text in packages Language Status Item.
* Fix issue with space in python path (https://github.com/fivetran/dbt-language-server/issues/489).
* Fix minor issues on Windows.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.12.2...v0.13.0
---

## Version 0.12.2 (13/10/2022)
## What's Changed
* Update dependencies.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.12.1...v0.12.2
---

## Version 0.12.1 (13/10/2022)
## What's Changed
* Rename extension to `Wizard for dbt Core (TM)`.
* Change extension logo.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.12.0...v0.12.1
---

## Version 0.12.0 (10/10/2022)
## What's Changed
* We now don't show errors for empty models.
* Add support dbt aliases.
* Add command to create dbt project from VS Code.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.11.1...v0.12.0
---

## Version 0.11.1 (21/09/2022)
## What's Changed
* Support absolute target path.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.11.0...v0.11.1