import os
import hashlib
import joblib
import numpy as np
from datetime import timedelta
import pandas as pd
import geopandas as gpd
import matplotlib.pyplot as plt
from dotenv import load_dotenv
from supabase import create_client
from shapely.geometry import shape, Point, LineString
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

FEATURE_COLUMNS = [
    'rainfall',
    'snowfall',
    'freeze_thaw_cycles',
    'humidity',
    'wind_speed',
    'incidents_within_100m',
    'avg_severity_within_150m',
    'avg_report_severity_within_100m',
    'reports_last_30d',
    'lon',
    'lat',
    'cumulative_incidents',
    'days_since_last_incident',
    'incidents_last_12m',

    'road_type_residential',
    'road_type_secondary',
    'road_type_tertiary',
    'road_type_unclassified',
    'road_type_nan',

    'sign_type_INFORMATION / COK-P-2-17',
    'sign_type_INFORMATION / COK-P-2-29',
    'sign_type_INFORMATION / COK-T-3-28',
    'sign_type_INFORMATION / COK-T-5-15S',
    'sign_type_INFORMATION / COK-T-5-21',
    'sign_type_INFORMATION / COK-T-5-30S',
    'sign_type_INFORMATION / COK-T-5-53',
    'sign_type_INFORMATION / COK-T-5-56L',
    'sign_type_INFORMATION / COK-T-5-56S',
    'sign_type_INFORMATION / COK-T-9-04',
    'sign_type_INFORMATION / NAME BLADE',

    'sign_type_REGULATORY / COK-P-2-27',
    'sign_type_REGULATORY / COK-P-2-30',
    'sign_type_REGULATORY / COK-P-2-32',
    'sign_type_REGULATORY / COK-P-2-50',
    'sign_type_REGULATORY / COK-T-1-13',
    'sign_type_REGULATORY / COK-T-1-25R',
    'sign_type_REGULATORY / COK-T-1-31',
    'sign_type_REGULATORY / COK-T-3-17',
    'sign_type_REGULATORY / COK-T-6-07',
    'sign_type_REGULATORY / NAME BLADE',
    'sign_type_REGULATORY / RA-1',
    'sign_type_REGULATORY / RA-101',
    'sign_type_REGULATORY / RA-1T',
    'sign_type_REGULATORY / RA-2',
    'sign_type_REGULATORY / RA-33',
    'sign_type_REGULATORY / RB-1',
    'sign_type_REGULATORY / RB-189',
    'sign_type_REGULATORY / RB-19',
    'sign_type_REGULATORY / RB-2',
    'sign_type_REGULATORY / RB-20',
    'sign_type_REGULATORY / RB-21',
    'sign_type_REGULATORY / RB-24',
    'sign_type_REGULATORY / RB-25',
    'sign_type_REGULATORY / RB-51',
    'sign_type_REGULATORY / RB-51/RB-56',
    'sign_type_REGULATORY / RB-51A',
    'sign_type_REGULATORY / RB-51L',
    'sign_type_REGULATORY / RB-51R',
    'sign_type_REGULATORY / RB-52',
    'sign_type_REGULATORY / RB-52L',
    'sign_type_REGULATORY / RB-52R',
    'sign_type_REGULATORY / RB-53',
    'sign_type_REGULATORY / RB-53L',
    'sign_type_REGULATORY / RB-53R',
    'sign_type_REGULATORY / RB-55',
    'sign_type_REGULATORY / RB-55L',
    'sign_type_REGULATORY / RB-55R',
    'sign_type_REGULATORY / RB-56',
    'sign_type_REGULATORY / RB-57',
    'sign_type_REGULATORY / RB-61',
    'sign_type_REGULATORY / RB-61T',
    'sign_type_REGULATORY / RB-62',
    'sign_type_REGULATORY / RB-76',
    'sign_type_REGULATORY / RB-78',
    'sign_type_REGULATORY / RB-84A',
    'sign_type_REGULATORY / RB-84T',
    'sign_type_REGULATORY / RB-85T',
    'sign_type_REGULATORY / WC-2',

    'sign_type_WARNING / COK-P-2-33',
    'sign_type_WARNING / COK-T-6-19',
    'sign_type_WARNING / COK-T-6-26',
    'sign_type_WARNING / RA-33',
    'sign_type_WARNING / WA-108',
    'sign_type_WARNING / WA-11A',
    'sign_type_WARNING / WA-1L',
    'sign_type_WARNING / WA-22',
    'sign_type_WARNING / WA-24',
    'sign_type_WARNING / WA-27',
    'sign_type_WARNING / WA-2L',
    'sign_type_WARNING / WA-2R',
    'sign_type_WARNING / WA-31',
    'sign_type_WARNING / WA-33',
    'sign_type_WARNING / WA-33L',
    'sign_type_WARNING / WA-33R',
    'sign_type_WARNING / WA-39',
    'sign_type_WARNING / WA-3L',
    'sign_type_WARNING / WA-3R',
    'sign_type_WARNING / WA-5R',
    'sign_type_WARNING / WA-74',
    'sign_type_WARNING / WA-7T',
    'sign_type_WARNING / WA-8',
    'sign_type_WARNING / WA-8LR',
    'sign_type_WARNING / WA-8R',
    'sign_type_WARNING / WA-9',
    'sign_type_WARNING / WB-1',
    'sign_type_WARNING / WB-2',
    'sign_type_WARNING / WC-1',
    'sign_type_WARNING / WC-11',
    'sign_type_WARNING / WC-19',
    'sign_type_WARNING / WC-19T',
    'sign_type_WARNING / WC-2',
    'sign_type_WARNING / WC-24',
    'sign_type_WARNING / WC-24T',
    'sign_type_WARNING / WC-2A',
    'sign_type_WARNING / WC-3',
    'sign_type_WARNING / WC-4',
    'sign_type_WARNING / WC-7',

    'sign_type_nan',

    'asset_type_road',
    'asset_type_traffic_sign',
    'asset_type_nan'
]

def load_data():
    roads = supabase.table('roads').select('*').execute().data
    roads_df = pd.DataFrame(roads)

    traffic_signs = supabase.table('traffic_signs').select('*').execute().data
    signs_df = pd.DataFrame(traffic_signs)

    incidents = supabase.table('incidents').select('*').execute().data
    inc_df = pd.DataFrame(incidents)

    reports = supabase.table('reports').select('*').execute().data
    reports_df = pd.DataFrame(reports)

    return roads_df, signs_df, inc_df, reports_df

def get_features(snapshot_date, roads_df, signs_df, inc_df, reports_df):
    def geom_to_point(geom_json):
        geom = shape(geom_json)
        if isinstance(geom, Point):
            return geom
        if isinstance(geom, LineString):
            return geom.interpolate(geom.length / 2)
        return geom.centroid

    roads_df['geometry'] = roads_df['loc'].apply(geom_to_point)
    signs_df['geometry'] = signs_df['loc'].apply(geom_to_point)
    assets_df = pd.concat([roads_df, signs_df], ignore_index=True)
    assets_df['snapshot_date'] = pd.to_datetime(snapshot_date.strftime('%Y-%m-%d'))

    inc_df['created_at'] = pd.to_datetime(inc_df['created_at'])

    reports_df['created_at'] = pd.to_datetime(reports_df['created_at'])
    reports_df['geometry'] = reports_df['loc'].apply(geom_to_point)

    def compute_labels(asset_id):
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
        lbls = compute_labels(row['id'])
        lbls['asset_id'] = row['id']
        lbls['snapshot_date'] = row['snapshot_date']
        labels_list.append(lbls)

    labels_df = pd.DataFrame(labels_list)

    labels_df.to_csv('labels.csv')

    road_features = roads_df[['id', 'road_type', 'geometry']].copy()
    road_features['asset_type'] = 'road'

    sign_features = signs_df[['id', 'sign_type', 'geometry']].copy()
    sign_features['asset_type'] = 'traffic_sign'

    assets_df = pd.concat([road_features, sign_features], ignore_index=True)
    assets_df = assets_df.rename(columns={'id': 'asset_id'})

    history = inc_df.groupby('asset_id').agg(
        cumulative_incidents=('id', 'count'),
        last_incident=('created_at', 'max')
    ).reset_index()
    history['last_incident'] = pd.to_datetime(history['last_incident'], errors='coerce')
    history['days_since_last_incident'] = (snapshot_date - history['last_incident']).dt.days
    history['days_since_last_incident'] = history['days_since_last_incident'].fillna(9999).astype(int)

    recent = inc_df[
        inc_df['created_at'] > snapshot_date - pd.Timedelta(days=30)
    ]
    recent_counts = recent.groupby('asset_id').size().reset_index(name='incidents_last_12m')

    history = history.merge(recent_counts, on='asset_id', how='left')
    history['incidents_last_12m'] = history['incidents_last_12m'].fillna(0)

    assets_gdf = gpd.GeoDataFrame(assets_df, geometry='geometry', crs='EPSG:4326')
    inc_gdf = inc_df.merge(assets_gdf[['asset_id', 'geometry']], how='left', on='asset_id')
    inc_gdf = gpd.GeoDataFrame(inc_gdf, geometry='geometry', crs='EPSG:4326')
    reports_gdf = gpd.GeoDataFrame(reports_df, geometry='geometry', crs='EPSG:4326')

    assets_gdf = assets_gdf.to_crs(epsg=3857)
    inc_gdf = inc_gdf.to_crs(epsg=3857)
    reports_gdf = reports_gdf.to_crs(epsg=3857)

    buffer_distance = 100
    assets_gdf['geometry_buffer'] = assets_gdf.geometry.buffer(buffer_distance)
    assets_buffer_gdf = gpd.GeoDataFrame(assets_gdf[['asset_id', 'geometry_buffer']], geometry='geometry_buffer', crs=assets_gdf.crs)

    joined = gpd.sjoin(
        reports_gdf,
        assets_buffer_gdf,
        how='inner',
        predicate='within'
    )

    if 'asset_id' not in joined.columns and 'asset_id_right' in joined.columns:
        joined = joined.rename(columns={'asset_id_right': 'asset_id'})
    if 'geometry_right' in joined.columns:
        joined = joined.drop(columns='geometry_right')

    weather_cols = ['rainfall', 'snowfall', 'freeze_thaw_cycles', 'humidity', 'wind_speed']
    weather_features_per_asset = joined.groupby('asset_id')[weather_cols].mean().reset_index()

    assets_gdf = assets_gdf.merge(weather_features_per_asset, on='asset_id', how='left')
    assets_gdf[weather_cols] = assets_gdf[weather_cols].fillna(0)

    recent_reports = reports_gdf[reports_gdf['created_at'] >= snapshot_date - timedelta(days=30)]

    def count_incidents(asset_point):
        buffer = asset_point.buffer(100)
        return inc_gdf[inc_gdf.geometry.within(buffer)].shape[0]

    def avg_severity(asset_point):
        buffer = asset_point.buffer(150)
        nearby = inc_gdf[inc_gdf.geometry.within(buffer)]
        if nearby.empty:
            return 0
        return nearby['severity'].mean()

    def avg_report_severity(asset_point):
        buffer = asset_point.buffer(100)
        nearby = recent_reports[recent_reports.geometry.within(buffer)]
        if nearby.empty:
            return 0
        return nearby['severity'].mean()

    assets_gdf['incidents_within_100m'] = assets_gdf.geometry.apply(count_incidents)
    assets_gdf['avg_severity_within_150m'] = assets_gdf.geometry.apply(avg_severity)
    assets_gdf['avg_report_severity_within_100m'] = assets_gdf.geometry.apply(avg_report_severity)

    def count_reports(asset_point):
        buffer = asset_point.buffer(100)
        return recent_reports[recent_reports.geometry.within(buffer)].shape[0]

    assets_gdf['reports_last_30d'] = assets_gdf.geometry.apply(count_reports)

    def generate_hash(row):
        row_string = "|".join(str(v) for v in row.values)
        return hashlib.sha256(row_string.encode()).hexdigest()

    assets_gdf['lon'] = assets_gdf.geometry.x
    assets_gdf['lat'] = assets_gdf.geometry.y

    features = assets_gdf.merge(history, on='asset_id', how='left')
    features['snapshot_date'] = snapshot_date
    features['snapshot_date'] = pd.to_datetime(features['snapshot_date'])
    features['feature_hash'] = features.apply(generate_hash, axis=1)
    features = features.fillna({
        'cumulative_incidents': 0,
        'incidents_last_12m': 0,
    })

    features = features.merge(
        labels_df[['asset_id', 'fail_in_30d', 'fail_in_90d', 'fail_in_365d']],
        on='asset_id',
        how='left'
    )
    features['fail_in_30d'] = features['fail_in_30d'].fillna(0).astype(int)
    features['fail_in_90d'] = features['fail_in_90d'].fillna(0).astype(int)
    features['fail_in_365d'] = features['fail_in_365d'].fillna(0).astype(int)

    features['lon'] = assets_gdf['lon'].values
    features['lat'] = assets_gdf['lat'].values

    features['asset_id'] = features['asset_id'].astype(str)

    features = features.drop(columns=['geometry', 'geometry_buffer'], errors='ignore')

    features = pd.get_dummies(
        features,
        columns=['road_type', 'sign_type', 'asset_type'],
        dummy_na=True
    )

    return assets_gdf, features

def train():
    roads_df, signs_df, inc_df, reports_df = load_data()

    snapshots = [
        "2024-01-01",
        "2024-06-01",
        "2024-12-01",
    ]

    all_features = []
    assets_snapshots = {}

    for s in snapshots:
        assets_gdf, f = get_features(pd.Timestamp(s), roads_df, signs_df, inc_df, reports_df)
        for col in FEATURE_COLUMNS:
            if col not in f.columns:
                f[col] = 0

        all_features.append(f)
        assets_snapshots[s] = assets_gdf

    features = pd.concat(all_features, ignore_index=True)

    x = features[FEATURE_COLUMNS].copy()
    x = x.replace([np.inf, -np.inf], np.nan)
    x = x.fillna(0)

    targets = ['fail_in_30d', 'fail_in_90d', 'fail_in_365d']
    models = {}

    for label in targets:
        y = features[label]

        x_train, x_test, y1_train, y1_test = train_test_split(x, y, test_size=0.2, random_state=42)

        clf = RandomForestClassifier(n_estimators=100, max_depth=10)
        clf.fit(x_train, y1_train)

        models[label] = clf

        test_preds = clf.predict_proba(x_test)[:,1]
        print(test_preds)

        features[f'risk_score_{label}'] = clf.predict_proba(x)[:,1]
        print(features[f'risk_score_{label}'].describe())

        features['asset_id'] = features['asset_id'].astype(int)

        filename = f'model_{label.split('_')[-1]}.joblib'
        joblib.dump({'model': clf, 'features': FEATURE_COLUMNS}, filename)
        print(f'Saved {label} model to {filename}')

    for s in snapshots:
        f_snapshot = features[features['snapshot_date'] == pd.Timestamp(s)]
        assets_gdf = assets_snapshots[s]

        plt.figure(figsize=(10, 8))
        for label in targets:
            plt.scatter(
                assets_gdf['lon'],
                assets_gdf['lat'],
                c=f_snapshot[f'risk_score_{label}'],
                cmap='Reds',
                s=50,
                alpha=0.7
            )
            plt.colorbar(label=f'{label} Risk Score')
            plt.xlabel('Longitude')
            plt.ylabel('Latitude')
            plt.title(f'Asset Risk Heatmap ({label}) - {s}')
            plt.show()

    print(features[['risk_score_fail_in_30d', 'risk_score_fail_in_90d', 'risk_score_fail_in_365d']].describe())