import http
import os
import sys
from typing import List
from dbt.adapters.factory import FACTORY
from dbt.contracts.connection import AdapterRequiredConfig
from dbt.adapters.bigquery import BigQueryColumn
from dbt.adapters.bigquery.relation import BigQueryRelation
import google.cloud.exceptions
import json

print("CWD: " + os.getcwd())

port = sys.argv[1]
def new_get_columns_in_relation(self, relation: BigQueryRelation) -> List[BigQueryColumn]:
    db = relation.path.database if relation.path.database != None else "None"
    schema = relation.path.schema if relation.path.schema != None else "None"
    table = relation.path.identifier if relation.path.identifier != None else "None"

    conn = http.client.HTTPConnection("localhost", port)

    conn.request("GET", "/macro?name=get_columns_in_relation&db=" + db + "&schema=" + schema + "&table=" + table)
    response = conn.getresponse()
    result = response.read().decode();
    if result != "SOURCE" and result != "NOT FOUND!":
      data = json.loads(result)
      bigquery_columns = [BigQueryColumn(column[0], BigQueryColumn.translate_type(column[1])) for column in data]

    #   try:
    #       table1 = self.connections.get_bq_table(
    #           database=relation.database, schema=relation.schema, identifier=relation.identifier
    #       )

    #       print("get_columns_in_relation for relation: " + db + "." + schema + "." + table + ": ")
    #       print(self._get_dbt_columns_from_bq_table(table1))
    #       print("---" + db + "." + schema + "." + table + "---")

    #       print("get_columns_in_relation for relation: " + db + "." + schema + "." + table + ": ")
    #       print(bigquery_columns)
    #       print("---"+ db + "." + schema + "." + table + "---")


    #   except (ValueError, google.cloud.exceptions.NotFound) as e:
    #       print()
      return bigquery_columns
    
    try:
        table3 = self.connections.get_bq_table(
            database=relation.database, schema=relation.schema, identifier=relation.identifier
        )
        return self._get_dbt_columns_from_bq_table(table3)

    except (ValueError, google.cloud.exceptions.NotFound) as e:
        return []

old_register_adapter = FACTORY.register_adapter.__get__(FACTORY)

def new_register_adapter(self, config: AdapterRequiredConfig) -> None:
    old_register_adapter(config)
    credentials_type = config.credentials.type
    if credentials_type == "bigquery":
        adapter = self.adapters[credentials_type]
        adapter.get_columns_in_relation = new_get_columns_in_relation.__get__(adapter)

FACTORY.register_adapter = new_register_adapter.__get__(FACTORY)


# Expected arguments for this script: 
# ['3000', '/home/user/.dbt', 'compile', '-m', 'path/to/model.sql'] to compile model
# ['3000', '/home/user/.dbt', 'compile'] to compile all models
# ['3000', '/home/user/.dbt', 'deps'] to install dependencies

dbt1_5 = True
try: 
    from dbt.cli.main import dbtRunner
except:
    dbt1_5 = False

profiles_dir = sys.argv[2]
no_stats = "--no-send-anonymous-usage-stats" if dbt1_5 else "--no-anonymous-usage-stats"
cli_args = [no_stats, "--no-use-colors"] + sys.argv[3:] + ["--profiles-dir", profiles_dir]
print(cli_args)

if dbt1_5: 
    dbt_runner = dbtRunner()
    result = dbt_runner.invoke(cli_args)
    sys.exit(0 if result.success else 1)
else:
    import dbt.main
    dbt.main.main(cli_args)
