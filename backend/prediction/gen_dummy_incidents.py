# import pandas as pd
# import numpy as np
# from datetime import datetime, timedelta
# import uuid
#
# from backend.prediction.ingest_datasets import supabase
#
# roads = supabase.table('roads').select('*').execute().data
# traffic_signs = supabase.table('traffic_signs').select('*').execute().data
#
# assets_df = pd.DataFrame(roads + traffic_signs)
#
# np.random.seed()
# num_incidents = 5000
# start_date = datetime(2020, 1, 1)
# end_date = datetime(2026, 1, 1)
#
# # ---------- NON-UNIFORM SETTINGS ----------
#
# # issue type probabilities
# issue_types = ['Pothole', 'Cracks', 'Broken Road Sign', 'Graffiti']
# issue_weights = [0.45, 0.30, 0.15, 0.10]
#
# # severity depends on issue type
# severity_map = {
#     'Pothole': [2,3,4],
#     'Cracks': [1,2,3],
#     'Broken Road Sign': [3,4],
#     'Graffiti': [1,2]
# }
#
# # create asset hotspots (20% of assets get most incidents)
# assets_df['weight'] = 1
# hotspot_indices = np.random.choice(assets_df.index, int(len(assets_df)*0.2), replace=False)
# assets_df.loc[hotspot_indices, 'weight'] = 6
#
# asset_weights = assets_df['weight'] / assets_df['weight'].sum()
#
# # time clusters (incident bursts)
# num_time_clusters = 8
# cluster_centers = [
#     start_date + timedelta(days=np.random.randint(0,(end_date-start_date).days))
#     for _ in range(num_time_clusters)
# ]
#
# def generate_date():
#     center = np.random.choice(cluster_centers)
#     offset = int(np.random.normal(0, 30))  # ~30 day cluster
#     return (center + timedelta(days=offset)).isoformat()
#
# # ---------- INCIDENT GENERATION ----------
#
# incidents_list = []
#
# for _ in range(num_incidents):
#
#     # asset with hotspot weighting
#     asset = assets_df.sample(1, weights=asset_weights).iloc[0]
#
#     # weighted issue type
#     issue = np.random.choice(issue_types, p=issue_weights)
#
#     incident = {
#         'id': str(uuid.uuid4()),
#         'asset_id': int(asset['id']),
#         'issue_type': issue,
#         'severity': int(np.random.choice(severity_map[issue])),
#         'created_at': generate_date()
#     }
#
#     incidents_list.append(incident)
#
# supabase.table('incidents').upsert(incidents_list, on_conflict="id").execute()
#
# print(f'Generated {num_incidents} incidents.')

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import uuid
from shapely import wkt
from shapely.geometry import shape, Point

from backend.prediction.ingest_datasets import supabase

# fetch and tag assets
roads_df = pd.DataFrame(supabase.table('roads').select('*').execute().data)
roads_df['type'] = 'road'

signs_df = pd.DataFrame(supabase.table('traffic_signs').select('*').execute().data)
signs_df['type'] = 'sign'

assets_df = pd.concat([roads_df, signs_df], ignore_index=True)

np.random.seed()

num_incidents = 16235
start_date = datetime(2020, 1, 1)
end_date = datetime(2026, 1, 1)

num_assets = len(assets_df)

# random clustering
hotspot_fraction = np.random.uniform(0.05, 0.2)
num_hotspots = int(num_assets * hotspot_fraction)
hotspot_indices = np.random.choice(assets_df.index, num_hotspots, replace=False)

weights = np.ones(num_assets)
cluster_strength = np.random.uniform(8, 25)
weights[hotspot_indices] = cluster_strength
weights = weights / weights.sum()

incidents_list = []

for _ in range(num_incidents):
    asset_index = np.random.choice(assets_df.index, p=weights)
    asset = assets_df.loc[asset_index]

    if asset['type'] == 'road':
        issue = np.random.choice(['Pothole', 'Cracks'], p=[0.7, 0.3])
    else:
        issue = np.random.choice(['Broken Road Sign', 'Graffiti'], p=[0.7, 0.3])

    incident = {
        'id': str(uuid.uuid4()),
        'asset_id': int(asset['id']),
        'issue_type': str(issue),
        'severity': int(np.random.randint(1, 5)),
        'created_at': (start_date + timedelta(days=np.random.randint(0, (end_date - start_date).days))).isoformat()
    }

    incidents_list.append(incident)

supabase.table('incidents').insert(incidents_list).execute()

print(f'Generated {num_incidents} incidents.')

