import numpy as np
from datetime import datetime, timedelta
from shapely.geometry import shape, Point, LineString
import uuid

from backend.prediction.ingest_datasets import supabase

roads = supabase.table('roads').select('*').execute().data
traffic_signs = supabase.table('traffic_signs').select('*').execute().data

assets = roads + traffic_signs

np.random.seed()
num_reports = 10000
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

for _ in range(num_reports):
    asset = np.random.choice(assets)

    lon_offset = np.random.uniform(-0.0002, 0.0002)
    lat_offset = np.random.uniform(-0.0002, 0.0002)
    geom = asset['loc']

    pt = sample_point_from_geom(geom)

    lon = pt.x + lon_offset
    lat = pt.y + lat_offset

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

supabase.table('reports').insert(reports_list).execute()

print(f'Generated {num_reports} reports.')