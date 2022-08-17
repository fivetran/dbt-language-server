#!/bin/bash

gh search prs \
  --repo fivetran/dbt-language-server \
  --state open \
  --label dependencies \
  --limit 200 \
  --json "url" --jq ".[] | .url" \
| xargs -n 1 -I{} \
  gh pr comment -b "@dependabot rebase" {}
