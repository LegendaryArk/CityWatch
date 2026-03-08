import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import uuid

from backend.prediction.ingest_datasets import supabase

roads = supabase.table('roads').select('*').execute().data
traffic_signs = supabase.table('traffic_signs').select('*').execute().data

assets_df = pd.DataFrame(roads + traffic_signs)

np.random.seed()
num_incidents = 5000
start_date = datetime(2020, 1, 1)
end_date = datetime(2026, 1, 1)

incidents_list = []
for _ in range(num_incidents):
    asset = assets_df.sample(1).iloc[0]
    incident = {
        'id': str(uuid.uuid4()),
        'asset_id': int(asset['id']),
        'issue_type': str(np.random.choice(['Pothole', 'Cracks', 'Broken Road Sign', 'Graffiti'])),
        'severity': int(np.random.randint(1, 5)),
        'created_at': (start_date + timedelta(days=np.random.randint(0, (end_date - start_date).days))).isoformat()
    }
    incidents_list.append(incident)

supabase.table('incidents').insert(incidents_list).execute()

print(f'Generated {num_incidents} incidents.')