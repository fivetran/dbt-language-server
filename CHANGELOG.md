# Changelog

## Version 0.33.2 (09/11/2023)
## What's Changed
* Implemented a safeguard against concurrent connection attempts to Snowflake.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.33.1...v0.33.2
---

## Version 0.33.1 (01/11/2023)
## What's Changed
* Added support for [User / Password + DUO MFA](https://docs.getdbt.com/docs/core/connect-data-platform/snowflake-setup#user--password--duo-mfa-authentication) authentication method.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.33.0...v0.33.1
---

## Version 0.33.0 (31/10/2023)
## What's Changed
* Environment variables now sourced from `.env` files and VS Code's `terminal.integrated.env.<platform>` setting.
* Resolved Python location detection issue.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.32.0...v0.33.0
---

## Version 0.32.0 (26/10/2023)
## What's Changed
* Corrected column definition in `referenced_tables` for `INFORMATION_SCHEMA` tables: `jobs_by_user`, `jobs_by_project`, `jobs_by_folder`, `jobs_by_organization`.
* Introduced quick actions for resolving dbt dependencies and authentication issues.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.31.0...v0.32.0
---

## Version 0.31.0 (23/10/2023)
## What's Changed
* Extended go-to-column functionality to recognize column aliases and locate columns in additional areas within the SELECT statement, as well as in external models.
* Enabled column autocompletion within CTEs.
* Optimized preview load time by skipping model compilation on first open event if project is already compiled.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.30.2...v0.31.0
---

## Version 0.30.2 (25/09/2023)
## What's Changed
* Added support for the following Snowflake functions: `grouping`, `decode`, `iff`, `nvl`, `nvl2`, `regr_valx`.
* Resolved an issue where false positives occurred during arithmetic operations with the Snowflake VARIANT type.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.30.1...v0.30.2
---

## Version 0.30.1 (06/09/2023)
## What's Changed
* Improved errors handling.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.30.0...v0.30.1
---

## Version 0.30.0 (04/09/2023)
## What's Changed
* Introduced a feature to display previews utilizing model configuration values for refs.  It can be useful for users who separates dev and prod environments. To use, right-click and select `Use schema from config for refs` from the context menu in the Preview editor.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.29.1...v0.30.0
---

## Version 0.29.1 (01/09/2023)
## What's Changed
* Supported double quoted names for Snowflake.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.29.0...v0.29.1
---

## Version 0.29.0 (10/08/2023)
## What's Changed
* Added `CONTAINS_SUBSTR` function.
* Fixed `ModuleNotFoundError: No module named 'dbt.adapters.bigquery'` error.
* Update ZetaSQL version.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.28.2...v0.29.0
---

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
