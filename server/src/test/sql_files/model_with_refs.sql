select *
from {{ ref('package', 'package_model') }} pm1
  inner join {{ ref('package_model') }} pm2 on pm1.parent_id = pm2.id
  inner join {{ ref('project_model') }} prm on pm1.id = prm.id