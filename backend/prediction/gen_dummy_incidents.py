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
import uuid
import geopandas as gpd
from shapely.geometry import LineString, Point
from backend.prediction.ingest_datasets import supabase
import matplotlib.pyplot as plt


# ------------------ LOAD WATERLOO ROADS ------------------
roads_gdf = gpd.read_file(r"C:\Users\matth\Downloads\waterloo_roads.geojson")

# Treat each road segment as an “asset”
assets = []
for idx, row in roads_gdf.iterrows():
    geom = row.geometry
    if geom and geom.length > 0:
        # sample a point along the road (normalized 0-1)
        fraction = np.random.random()
        point = geom.interpolate(fraction, normalized=True)
        assets.append({
            'id': idx,  # use index as asset ID
            'geometry': point  # stored internally only
        })

assets_df = pd.DataFrame(assets)

# ------------------ INCIDENT GENERATION ------------------
np.random.seed()
num_incidents = 5000
start_date = datetime(2020, 1, 1)
end_date = datetime(2026, 1, 1)

incidents_list = []

for _ in range(num_incidents):
    asset = assets_df.sample(1).iloc[0]

    # random date
    day_offset = np.random.randint(0, (end_date - start_date).days)
    base_date = start_date + timedelta(days=day_offset)

    # add random time within the day
    random_seconds = np.random.randint(0, 24 * 60 * 60)
    created_at = (base_date + timedelta(seconds=random_seconds)).isoformat()

    incident = {
        'id': str(uuid.uuid4()),
        'asset_id': int(asset['id']),
        'issue_type': str(np.random.choice(['Pothole', 'Cracks', 'Broken Road Sign', 'Graffiti'])),
        'severity': int(np.random.randint(1, 5)),
        'created_at': created_at
    }
    incidents_list.append(incident)

# ------------------ INSERT INTO SUPABASE ------------------
supabase.table('incidents').insert(incidents_list).execute()

print(f'Generated {num_incidents} incidents on Waterloo roads with randomized time.')

# # Extract the points used for incidents
# # Since each incident was assigned a random road point internally:
incident_points = [p for p in assets_df.sample(n=num_incidents, replace=True).geometry]

# Separate x and y
x_coords = [p.x for p in incident_points]
y_coords = [p.y for p in incident_points]

# Plot
plt.figure(figsize=(10,10))
plt.scatter(x_coords, y_coords, c='red', s=10, alpha=0.6)
plt.title("Generated Incident Points on Waterloo Roads")
plt.xlabel("Longitude")
plt.ylabel("Latitude")
plt.axis('equal')
plt.show()