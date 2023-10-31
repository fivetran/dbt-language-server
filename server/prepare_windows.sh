#!/usr/bin/env bash

mkdir -p out/zetasql
mkdir -p out/snowflake
cp node_modules/@fivetrandevelopers/zetasql/lib/zetasql/remote_server.so out/zetasql/remote_server.so
cp node_modules/@fivetrandevelopers/zetasql-snowflake/lib/snowflake/remote_server.so out/snowflake/remote_server.so
