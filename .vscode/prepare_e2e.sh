#!/bin/bash

find ./e2e/projects/ -type f -name 'temp_model*.sql' -exec rm -rf {} +
find ./e2e/projects/ -type d -name target -exec rm -rf {} +
find ./e2e/projects/ -type d -name dbt_packages -exec rm -rf {} +
find ./e2e/projects/ -type d -name logs -exec rm -rf {} +
