# Changelog

## Version 0.4.1 (01/01/1970)
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