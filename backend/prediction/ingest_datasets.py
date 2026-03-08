import os
import requests
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

print("Connecting to DB...")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# url = '/home/noahsun/Downloads/Traffic_Signs_-4214485011506185686.csv'
#
# df = pd.read_csv(url)
#
# buff = []
# for i, row in df.iterrows():
#     geojson = {
#         'type': 'Point',
#         'coordinates': [float(row['x']), float(row['y'])]
#     }
#     buff.append((row['TRAFFICSIGNID'], {
#         'id': int(f'2{i:06d}'),
#         'sign_type': f"{row['CATEGORY']} / {row['OTM_CODE']}",
#         'loc': geojson
#     }))
#
#     if len(buff) >= 100:
#         batch = []
#         seen_ids = set()
#         for idx, r in buff:
#             if idx not in seen_ids:
#                 batch.append(r)
#                 seen_ids.add(idx)
#
#         supabase.table('traffic_signs').upsert(batch, on_conflict='id').execute()
#         buff = []
#
# if buff:
#     batch = []
#     seen_ids = set()
#     for idx, r in buff:
#         if idx not in seen_ids:
#             batch.append(r)
#             seen_ids.add(idx)
#
#     supabase.table('traffic_signs').upsert(batch, on_conflict='id').execute()
#     buff = []

# query = """
# [out:json];
# area["name"="Waterloo"]->.searchArea;
#
# (
#     way["highway"](area.searchArea);
# );
#
# out geom;
# """

# print("Fetching data...")
#
# url = 'https://overpass-api.de/api/interpreter'
# res = requests.post(url, data=query)
# data = res.json()
#
# roads = []
#
# for elem in data['elements']:
#     coords = elem['geometry']
#     road = {
#         'osm_id': elem['id'],
#         'road_type': elem['tags'].get('highway'),
#         'coordinates': coords
#     }
#
#     roads.append(road)
#
# print("Adding to DB...")
#
# buff = []
# for i, road in enumerate(roads):
#     coords = [[pt['lon'], pt['lat']] for pt in road['coordinates']]
#     geojson = {
#         'type': 'LineString',
#         'coordinates': coords,
#     }
#     buff.append((road['osm_id'], {
#         'id': f'1{i:06d}',
#         'road_type': road['road_type'],
#         'loc': geojson
#     }))
#
#     if len(buff) >= 100:
#         batch = []
#         seen_ids = set()
#         for idx, row in buff:
#             if idx not in seen_ids:
#                 batch.append(row)
#                 seen_ids.add(idx)
#
#         supabase.table('roads').upsert(batch, on_conflict='id').execute()
#         buff = []
#
# if buff:
#     batch = []
#     seen_ids = set()
#     for idx, row in buff:
#         if idx not in seen_ids:
#             batch.append(row)
#             seen_ids.add(idx)
#
#     supabase.table('roads').upsert(batch, on_conflict='id').execute()

# print("Ingestion Completed")
# query = """
# [out:json];
# area["name"="Waterloo"]->.searchArea;
#
# (
#     way["highway"](area.searchArea);
# );
#
# out geom;
# """
#
# print("Fetching data...")
#
# url = 'https://overpass-api.de/api/interpreter'
# res = requests.post(url, data=query)
# data = res.json()
#
# roads = []
#
# for elem in data['elements']:
#     coords = elem['geometry']
#     road = {
#         'osm_id': elem['id'],
#         'road_type': elem['tags'].get('highway'),
#         'coordinates': coords
#     }
#
#     roads.append(road)
#
# print("Adding to DB...")
#
# for road in roads:
#     coords = [[pt['lon'], pt['lat']] for pt in road['coordinates']]
#     geojson = {
#         'type': 'LineString',
#         'coordinates': coords,
#     }
#
#     supabase.table('roads').insert({
#         'id': road['osm_id'],
#         'road_type': road['road_type'],
#         'loc': geojson
#     }).execute()
#
# print("Ingestion Completed")