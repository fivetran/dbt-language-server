# Changelog

## Version 0.6.1 (12/07/2022)
## What's Changed
* Fix an issue when go to definition didn't work for models from packages if package is not specified
* Go to definition now works in all jinja blocks
* Improve performance for models with a lot of tables

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.6.0...v0.6.1
---

## Version 0.6.0 (07/07/2022)
## What's Changed
* dbt models autocompletion improvements
* Refresh dbt-rpc server after packages installation
* Use diagnostics to highlight the ability to convert sql to ref
* Add query preview button on top panel
* Improve sources definitions suggestions
* Prompt to install dbt if it is not installed
* Do not show warning for non BigQuery profiles
* Support working with multiple dbt profiles
* Fix issue with adding/deleting columns in models during development
* Support table suggestion from `with` clause
* Support persistent UDFs
* Fix issue with not showing signatures in some cases
* Improve Readme.md

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.5.0...v0.6.0
---

## Version 0.5.0 (26/05/2022)
## What's Changed
* Upgrade ZetaSQL to Apr 21, 2022 version
* Add support for `_PARTITIONTIME`, `_PARTITIONDATE` and `INFORMATION_SCHEMA` keywords
* Fix incorrect text position calculation
* Show error when `dbt-rpc` fails to start
* Restart language server in case of error
* Fix conflict with other extension


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.4.2...v0.5.0
---

## Version 0.4.2 (04/05/2022)
## What's Changed
* Fix parsing `dbt_project.yml` from package
* Fix issue with finding package install path

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.4.1...v0.4.2
---

## Version 0.4.1 (29/04/2022)
## What's Changed
* Fix problems with macros preview
* Fix wrong diff results in some cases
* Support nested structs and array of structs
* Add support `qualify`, `recursive` and other ZetaSQL features in development
* Fix preview for models with `materialized='ephemeral'`
* Add additional logs


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.4.0...v0.4.1
---

## Version 0.4.0 (12/04/2022)
## What's Changed
* Add the ability to compile models inside dbt packages
* Fix bugs with signature hints
* Show functions signature hints on hover
* Autocompletion for all dbt models, macros and sources


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.3.1...v0.4.0
---

## Version 0.3.1 (02/04/2022)
## What's Changed
* Fix changelog population
* Fix restart issue when dbt-rpc command is not found

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.3.0...v0.3.1
---

## Version 0.3.0 (29/03/2022)
## What's Changed
* Support Apple M1 target
* Support number of features for all [dbt adapters](https://docs.getdbt.com/docs/available-adapters#dbt-labs-supported) (see [Features](https://github.com/fivetran/dbt-language-server#features))
* Set icon for extension


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.2.0...v0.3.0
---

## Version 0.2.0 (11/03/2022)
## What's Changed
* Rename extension to **dbt Wizard**
* Go to model/macros/source definition
* Run extension for documents with `sql-bigquery` language id
* Improve error display for dbt problems

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.1.0...v0.2.0
---

## Version 0.1.0 (03/02/2022)
## What's Changed
* Add oauth token-based authentication method
* Support Linux
* Add commands to convert ref to SQL and SQL to ref
* Fix infinite loop bug while compiling models
* Show errors in preview
* Fix compile issue when model edited before extension initialized
* Rename extension to dbt Language Support
* Publish repository
* Add docs for Windows users
* Delete compile button

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.0.3...v0.1.0