# Changelog

## Version 0.11.0 (01/01/1970)
## What's Changed
* Add support for temporary UDFs.
* Decrease VSIX package size.
* Fix extension restart issue for big dbt models.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.10.0...v0.11.0
---

## Version 0.10.0 (14/09/2022)
## What's Changed
* Fix the issue with showing not all available dbt packages.
* Support linux-arm64 platform.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.9.1...v0.10.0
---

## Version 0.9.1 (05/09/2022)
## What's Changed
* Fix issue with handling new tabs created using VS Code API.
* Fix compilation issue on Windows.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.9.0...v0.9.1
---

## Version 0.9.0 (02/09/2022)
## What's Changed
* Update ZetaSQL version.
* Update function signatures descriptions.
* Fix wrong diagnostics issues.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.8.0...v0.9.0
---

## Version 0.8.0 (30/08/2022)
## What's Changed
* Fix issue with underlining `qualify` keyword.
* Show signature for keywords in uppercase and in lowercase.
* Now features that doesn't require additional processes like autocompletions, go to definitions and so on are available quickly.
* Refresh SQL diagnostics after active tab change.
* Fix error message in dbt 1.2.1.
* Add status item to show/create packages.yml file.
* Add `dbtWizard.installDbtPackages` command and run it from status item.
* Small bug fixes.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.7.0...v0.8.0
---

## Version 0.7.0 (10/08/2022)
## What's Changed
* [Lock](https://code.visualstudio.com/updates/v1_60#_locked-editor-groups) query preview group automatically.
* Fix diagnostics issue after deleting/creating file.
* Add Windows support.
* Show information about python and dbt and dbt adapters in status bar.
* Add the ability to install dbt, dbt adapters and choose python environment from status bar.


**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.6.3...v0.7.0
---

## Version 0.6.3 (26/07/2022)
## What's Changed
* Fix issue with `_dbt_max_partition` dbt specific keyword.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.6.2...v0.6.3
---

## Version 0.6.2 (20/07/2022)
## What's Changed
* Fix working with python >= 3.10. Now extension uses dbt CLI in such case.
* Add setting `dbtWizard.dbtCompiler` to specify which command the extension will use to compile models.

**Full Changelog**: https://github.com/fivetran/dbt-language-server/compare/v0.6.1...v0.6.2
---

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