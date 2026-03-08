import os
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

roads = supabase.table('roads').select('*').execute().data
traffic_signs = supabase.table('traffic_signs').select('*').execute().data
assets_df = pd.DataFrame(roads + traffic_signs)
assets_df['snapshot_date'] = pd.to_datetime('2025-05-07')

incidents = supabase.table('incidents').select('*').execute().data
inc_df = pd.DataFrame(incidents)
inc_df['created_at'] = pd.to_datetime(inc_df['created_at'])

def compute_labels(asset_id, snapshot_date):
    asset_inc = inc_df[inc_df['asset_id'] == asset_id]
    labels = {}
    for window in [30, 90, 365]:
        labels[f'fail_in_{window}d'] = int(
            any((asset_inc['created_at'] > snapshot_date) & (asset_inc['created_at'] <= snapshot_date + pd.Timedelta(days=window)))
        )

    future_incidents = asset_inc[asset_inc['created_at'] > snapshot_date]
    if not future_incidents.empty:
        first_inc = future_incidents['created_at'].min()
        labels['time_to_failure'] = (first_inc - snapshot_date).days
        labels['events_observed'] = 1
    else:
        labels['time_to_failure'] = None
        labels['events_observed'] = 0
    return labels

labels_list = []
for _, row in assets_df.iterrows():
    lbls = compute_labels(row['id'], row['snapshot_date'])
    lbls['asset_id'] = row['id']
    lbls['snapshot_date'] = row['snapshot_date']
    labels_list.append(lbls)

labels_df = pd.DataFrame(labels_list)

labels_df.to_csv('labels.csv', index=False)