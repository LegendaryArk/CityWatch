# import numpy as np
# from datetime import datetime, timedelta
# from shapely.geometry import shape, Point, LineString
# import uuid
# import matplotlib.pyplot as plt
#
# from backend.prediction.ingest_datasets import supabase
#
# roads = supabase.table('roads').select('*').execute().data
# traffic_signs = supabase.table('traffic_signs').select('*').execute().data
#
# assets = roads + traffic_signs
#
# np.random.seed()
# num_reports = 10000
# start_date = datetime(2020, 1, 1)
# end_date = datetime(2026, 1, 1)
#
# reports_list = []
#
# def sample_point_from_geom(geom_json):
#     geom = shape(geom_json)
#
#     if isinstance(geom, Point):
#         return geom
#
#     if isinstance(geom, LineString):
#         distance = np.random.uniform(0, geom.length)
#         return geom.interpolate(distance)
#
#     return geom.centroid
#
# for _ in range(num_reports):
#     asset = np.random.choice(assets)
#
#
#     lon_offset = np.random.uniform(-0.0002, 0.0002)
#     lat_offset = np.random.uniform(-0.0002, 0.0002)
#     geom = asset['loc']
#
#     pt = sample_point_from_geom(geom)
#
#     lon = pt.x + lon_offset
#     lat = pt.y + lat_offset
#
#     lon = pt.x + lon_offset
#     lat = pt.y + lat_offset
#
#     report = {
#         'id': str(uuid.uuid4()),
#         'asset_id': int(asset['id']),
#         'issue_type': str(np.random.choice(['Pothole', 'Cracks', 'Broken Road Sign', 'Graffiti'])),
#         'severity': int(np.random.randint(1, 5)),
#         'created_at': (start_date + timedelta(days=np.random.randint(0, (end_date - start_date).days))).isoformat(),
#         'loc': f'POINT({lon} {lat})',
#         'temp': np.random.uniform(-10, 35),
#         'humidity': np.random.uniform(30, 100),
#         'wind_speed': np.random.uniform(0, 20),
#         'rainfall': np.random.uniform(0, 30),
#         'snowfall': np.random.uniform(0, 10),
#         'freeze_thaw_cycles': int(np.random.uniform(0, 10)),
#         'weather_conditions': np.random.choice(['clear', 'rain', 'snow', 'fog', 'cloudy'])
#     }
#     reports_list.append(report)
#
# supabase.table('reports').insert(reports_list).execute()
#
# print(f'Generated {num_reports} reports.')

import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from shapely.geometry import shape, Point, LineString
import uuid

from backend.prediction.ingest_datasets import supabase

# Fetch assets
roads = supabase.table('roads').select('*').execute().data
traffic_signs = supabase.table('traffic_signs').select('*').execute().data
assets = roads + traffic_signs

#np.random.seed(42)
num_reports = 10000
cluster_prob = 0.30  # 30% of points near clusters
num_hotspots = 200

start_date = datetime(2020, 1, 1)
end_date = datetime(2026, 1, 1)

reports_list = []

def sample_point_from_geom(geom_json):
    geom = shape(geom_json)

    if isinstance(geom, Point):
        return geom

    if isinstance(geom, LineString):
        distance = np.random.uniform(0, geom.length)
        return geom.interpolate(distance)

    return geom.centroid

# Pick some "hotspots" to cluster around
hotspot_assets = np.random.choice(assets, size=num_hotspots, replace=False)
hotspot_weights = np.random.dirichlet(np.random.rand(num_hotspots) * 5 + 0.5)

hotspot_spreads = np.random.uniform(0.0005, 0.002, size=num_hotspots)

num_clustered = int(num_reports * cluster_prob)
num_scattered = num_reports - num_clustered

# For plotting
lons, lats = [], []

points_per_hotspot = (hotspot_weights * num_clustered).astype(int)

for idx, asset in enumerate(hotspot_assets):
    geom = asset['loc']
    spread = hotspot_spreads[idx]
    for _ in range(points_per_hotspot[idx]):
        pt = sample_point_from_geom(geom)
        lon = pt.x + np.random.normal(0, spread)
        lat = pt.y + np.random.normal(0, spread)
        report = {
            'id': str(uuid.uuid4()),
            'asset_id': int(asset['id']),
            'issue_type': str(np.random.choice(['Pothole', 'Cracks', 'Broken Road Sign', 'Graffiti'])),
            'severity': int(np.random.randint(1, 5)),
            'created_at': (start_date + timedelta(days=np.random.randint(0, (end_date - start_date).days))).isoformat(),
            'loc': f'POINT({lon} {lat})',
            'temp': np.random.uniform(-10, 35),
            'humidity': np.random.uniform(30, 100),
            'wind_speed': np.random.uniform(0, 20),
            'rainfall': np.random.uniform(0, 30),
            'snowfall': np.random.uniform(0, 10),
            'freeze_thaw_cycles': int(np.random.uniform(0, 10)),
            'weather_conditions': np.random.choice(['clear', 'rain', 'snow', 'fog', 'cloudy'])
        }
        reports_list.append(report)
        lons.append(lon)
        lats.append(lat)

# --- Scattered points ---
for _ in range(num_scattered):
    asset = np.random.choice(assets)
    geom = asset['loc']
    pt = sample_point_from_geom(geom)
    lon = pt.x + np.random.uniform(-0.003, 0.003)
    lat = pt.y + np.random.uniform(-0.003, 0.003)
    report = {
        'id': str(uuid.uuid4()),
        'asset_id': int(asset['id']),
        'issue_type': str(np.random.choice(['Pothole', 'Cracks', 'Broken Road Sign', 'Graffiti'])),
        'severity': int(np.random.randint(1, 5)),
        'created_at': (start_date + timedelta(days=np.random.randint(0, (end_date - start_date).days))).isoformat(),
        'loc': f'POINT({lon} {lat})',
        'temp': np.random.uniform(-10, 35),
        'humidity': np.random.uniform(30, 100),
        'wind_speed': np.random.uniform(0, 20),
        'rainfall': np.random.uniform(0, 30),
        'snowfall': np.random.uniform(0, 10),
        'freeze_thaw_cycles': int(np.random.uniform(0, 10)),
        'weather_conditions': np.random.choice(['clear', 'rain', 'snow', 'fog', 'cloudy'])
    }
    reports_list.append(report)
    lons.append(lon)
    lats.append(lat)

# Scatterplot
plt.figure(figsize=(10, 8))
plt.scatter(lons, lats, s=5, alpha=0.5, c='blue')
plt.title('Realistic Scatterplot with Controlled Clusters')
plt.xlabel('Longitude')
plt.ylabel('Latitude')
plt.grid(True)
plt.show()