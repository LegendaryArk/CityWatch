import os
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

print("Connecting to DB...")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

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