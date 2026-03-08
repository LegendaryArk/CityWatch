import os
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client
from pyproj import Transformer
import osmnx as ox

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

print("Connecting to DB...")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

transformer = Transformer.from_crs('EPSG:26917', 'EPSG:4326', always_xy=True)

def ingest_signs():
    print("Fetching data...")

    url = '/home/noahsun/Downloads/Traffic_Signs_-4214485011506185686.csv'

    df = pd.read_csv(url)

    print("Adding to DB...")

    buff = []
    for i, row in df.iterrows():
        x = row['x']
        y = row['y']
        lon, lat = transformer.transform(x, y)

        geojson = {
            'type': 'Point',
            'coordinates': [lon, lat]
        }
        buff.append((row['TRAFFICSIGNID'], {
            'id': int(f'2{i:06d}'),
            'sign_type': f"{row['CATEGORY']} / {row['OTM_CODE']}",
            'loc': geojson
        }))

        if len(buff) >= 100:
            batch = []
            seen_ids = set()
            for idx, r in buff:
                if idx not in seen_ids:
                    batch.append(r)
                    seen_ids.add(idx)

            supabase.table('traffic_signs').upsert(batch, on_conflict='id').execute()
            buff = []

    if buff:
        batch = []
        seen_ids = set()
        for idx, r in buff:
            if idx not in seen_ids:
                batch.append(r)
                seen_ids.add(idx)

        supabase.table('traffic_signs').upsert(batch, on_conflict='id').execute()

    print("Ingestion Completed")

def ingest_roads():
    print("Fetching data...")

    G = ox.graph_from_place("Waterloo, Ontario, Canada", network_type="drive")
    edges = ox.graph_to_gdfs(G, nodes=False)

    roads = []

    for idx, row in edges.iterrows():
        geom = row.geometry
        if geom is None:
            continue

        osm_id = row.get('osm_id')
        if isinstance(osm_id, list):
            osm_id = osm_id[0]

        coords = list(geom.coords)


        road = {
            'osm_id': osm_id,
            'road_type': row.get('highway'),
            'coordinates': [{'lon': c[0], 'lat': c[1]} for c in coords]
        }

        roads.append(road)

    print("Adding to DB...")

    buff = []
    for i, road in enumerate(roads):
        coords = [[pt['lon'], pt['lat']] for pt in road['coordinates']]
        geojson = {
            'type': 'LineString',
            'coordinates': coords,
        }
        buff.append((road['osm_id'], {
            'id': f'1{i:06d}',
            'road_type': road['road_type'],
            'loc': geojson
        }))

        if len(buff) >= 100:
            batch = []
            seen_ids = set()
            for idx, row in buff:
                if idx not in seen_ids:
                    batch.append(row)
                    seen_ids.add(idx)

            supabase.table('roads').upsert(batch, on_conflict='id').execute()
            buff = []

    if buff:
        batch = []
        seen_ids = set()
        for idx, row in buff:
            if idx not in seen_ids:
                batch.append(row)
                seen_ids.add(idx)

        supabase.table('roads').upsert(batch, on_conflict='id').execute()

    print("Ingestion Completed")