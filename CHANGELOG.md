# Changelog

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
---

## Version 0.11.0 (16/09/2022)
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
