# Changelog

## Version 0.28.2 (01/08/2023)
## What's Changed
* Fixed compilation issue when using dbt 1.6.0.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.28.1...v0.28.2
---

## Version 0.28.1 (31/07/2023)
## What's Changed
* Updated setting description.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.28.0...v0.28.1
---

## Version 0.28.0 (31/07/2023)
## What's Changed
* With this release, we have integrated a syntax analyzer for Snowflake projects. This addition will help users to identify errors and use the SQL to ref conversion, go to definition and auto-completion features within Snowflake dbt project. You can disable this feature using the `WizardForDbtCore(TM).enableSnowflakeSyntaxCheck` setting if needed.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.27.5...v0.28.0
---

## Version 0.27.5 (26/07/2023)
## What's Changed
* Fixed the issue with specific UDFs in BigQuery.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.27.4...v0.27.5
---

## Version 0.27.4 (18/07/2023)
## What's Changed
* Improved Snowflake compatibility by returning columns in the correct order.
* Set snowflake-sql type for Snowflake preview, ensuring accurate syntax highlighting.
* Expanded Snowflake support to include additional syntax.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.27.3...v0.27.4
---

## Version 0.27.3 (03/07/2023)
## What's Changed
* Enabled support for BigQuery [JSON functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions).
* Updated the functionality of the "Analyze current project" button (🔄). Clicking it now cancels any ongoing compilation/analysis and initiates a new one.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.27.2...v0.27.3
---

## Version 0.27.2 (22/06/2023)
## What's Changed
* Added support for semi-structured data functions in Snowflake.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.27.1...v0.27.2
---

## Version 0.27.1 (22/06/2023)
## What's Changed
* Added support for Snowflake cast operator (`::`).


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.27.0...v0.27.1
---

## Version 0.27.0 (18/06/2023)
## What's Changed
* In this release, we've introduced a new setting, `WizardForDbtCore(TM).enableSnowflakeSyntaxCheck`, which is turned off by default. When activated, this setting enables syntax checks for Snowflake dbt projects. As a result, any errors within models will be detected and displayed. Please note that this is an experimental feature and may not be entirely reliable. It could potentially yield false positive errors, indicating issues where there are none.


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
