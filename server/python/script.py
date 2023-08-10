import http
import sys
from typing import List
from dbt.adapters.factory import FACTORY
from dbt.contracts.connection import AdapterRequiredConfig
from dbt.adapters.base import Column as BaseColumn
from dbt.adapters.base.relation import BaseRelation
import json

# Expected arguments for this script: 
# ['--version'] to get version
# ['3000', '/home/user/.dbt', 'compile', '-m', 'path/to/model.sql'] to compile model
# ['3000', '/home/user/.dbt', 'compile'] to compile all models
# ['3000', '/home/user/.dbt', 'deps'] to install dependencies

dbt1_5 = True
try: 
    from dbt.cli.main import dbtRunner
except:
    dbt1_5 = False

def dbt_command(cli_args) -> None:
    if dbt1_5: 
        dbt_runner = dbtRunner()
        result = dbt_runner.invoke(cli_args)
        sys.exit(0 if result.success else 1)
    else:
        import dbt.main
        dbt.main.main(cli_args)

if sys.argv[1] == "--version":
    dbt_command(["--version"])
else:
    port = sys.argv[1]
    global_old_get_columns_in_relation = None
    def new_get_columns_in_relation(self, relation: BaseRelation) -> List[BaseColumn]:
        global global_old_get_columns_in_relation
        db = relation.path.database if relation.path.database != None else "None"
        schema = relation.path.schema if relation.path.schema != None else "None"
        table = relation.path.identifier if relation.path.identifier != None else "None"

        conn = http.client.HTTPConnection("localhost", port)

        conn.request("GET", "/macro?name=get_columns_in_relation&db=" + db + "&schema=" + schema + "&table=" + table)
        response = conn.getresponse()
        result = response.read().decode();
        if result not in ["SOURCE", "NOT_FOUND"]:
            data = json.loads(result)
            bigquery_columns = [self.Column.create(column[0], column[1]) for column in data]
            return bigquery_columns

        return global_old_get_columns_in_relation(relation)

    old_register_adapter = FACTORY.register_adapter.__get__(FACTORY)

    def new_register_adapter(self, config: AdapterRequiredConfig) -> None:
        global global_old_get_columns_in_relation
        old_register_adapter(config)
        credentials_type = config.credentials.type
        if credentials_type in ["bigquery", "snowflake"]:
            adapter = self.adapters[credentials_type]
            global_old_get_columns_in_relation = adapter.get_columns_in_relation
            adapter.get_columns_in_relation = new_get_columns_in_relation.__get__(adapter)

    FACTORY.register_adapter = new_register_adapter.__get__(FACTORY)

    profiles_dir = sys.argv[2]
    no_stats = "--no-send-anonymous-usage-stats" if dbt1_5 else "--no-anonymous-usage-stats"
    cli_args = [no_stats, "--no-use-colors"] + sys.argv[3:] + ["--profiles-dir", profiles_dir]

    dbt_command(cli_args)
