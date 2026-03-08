import os
import cv2
import joblib
import pandas as pd
import geopandas as gpd
import numpy as np
import tensorflow as tf
from dotenv import load_dotenv
from supabase import create_client
from shapely.geometry import Point
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse

from prediction.feature_train import load_data, get_features, FEATURE_COLUMNS

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

IMG_SIZE = 224

cv_model = tf.keras.models.load_model('CV Classification/infrastructure_model.keras')
classes_names = ['cracks', 'graffiti', 'potholes', 'broken_road_signs']

pred_model_30d = joblib.load('prediction/model_30d.joblib')['model']
pred_model_90d = joblib.load('prediction/model_90d.joblib')['model']
pred_model_365d = joblib.load('prediction/model_365d.joblib')['model']

grid_size = 10

app = FastAPI()

def preprocess_image(img_bytes):
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img / 255.0

    img = np.expand_dims(img, axis=0)
    return img

@app.get('/')
async def root():
    return {'message': 'Infrastructure classifier API running'}

@app.post('/predict')
async def predict(file: UploadFile = File(...)):
    img_bytes = await file.read()

    img = preprocess_image(img_bytes)

    preds = cv_model.predict(img)

    class_index = int(np.argmax(preds))
    confidence = float(preds[0][class_index])

    result = {
        'prediction': classes_names[class_index],
        'confidence': confidence
    }

    return JSONResponse(status_code=200, content=result)

@app.post('/update_heatmap')
async def update_heatmap():
    try:
        roads_df, signs_df, inc_df, reports_df = load_data()

        assets_gdf, features = get_features(pd.Timestamp.now(), roads_df, signs_df, inc_df, reports_df)
        for col in FEATURE_COLUMNS:
            if col not in features.columns:
                features[col] = 0
        features = features[FEATURE_COLUMNS]
        features = features.replace([np.inf, -np.inf], np.nan)
        features = features.fillna(0)

        risk_30d = pred_model_30d.predict_proba(features)[:,1]
        risk_90d = pred_model_30d.predict_proba(features)[:,1]
        risk_365d = pred_model_30d.predict_proba(features)[:,1]

        assets_gdf = assets_gdf.to_crs(epsg=3857)

        assets_gdf['risk_score_30d'] = risk_30d
        assets_gdf['risk_score_90d'] = risk_90d
        assets_gdf['risk_score_365d'] = risk_365d

        assets_gdf['grid_x'] = (assets_gdf.geometry.x // grid_size) * grid_size
        assets_gdf['grid_y'] = (assets_gdf.geometry.y // grid_size) * grid_size

        assets_gdf['grid_cell_geom'] = assets_gdf.apply(lambda r: Point(r['grid_x'], r['grid_y']), axis=1)

        heatmap_agg = assets_gdf.groupby(['grid_cell_geom']).agg(
            issue_count=('incidents_within_100m', 'sum'),
            avg_severity=('avg_severity_within_150m', 'mean'),
            predict_30d=('risk_score_30d', 'mean'),
            predict_90d=('risk_score_90d', 'mean'),
            predict_365d=('risk_score_365d', 'mean')
        ).reset_index()
        heatmap_gdf = gpd.GeoDataFrame(heatmap_agg, geometry='grid_cell_geom', crs='epsg:3857')

        heatmap_gdf = heatmap_gdf.to_crs(epsg=4326)
        heatmap_gdf['lon'] = heatmap_gdf.geometry.x
        heatmap_gdf['lat'] = heatmap_gdf.geometry.y

        heatmap_gdf['grid_cell'] = heatmap_gdf.geometry.apply(lambda g: g.__geo_interface__)
        heatmap_gdf['last_updated'] = pd.Timestamp.utcnow().isoformat()

        records = heatmap_gdf[['grid_cell', 'issue_count', 'avg_severity', 'predict_30d', 'predict_90d', 'predict_365d', 'last_updated']].to_dict(orient='records')
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={
                'message': 'Prediction failed',
                'error': str(e)
            }
        )

    try:
        res = supabase.table('heatmap_tiles').upsert(records, on_conflict='grid_cell').execute()

        return JSONResponse(status_code=200, content={
            'message': 'Heatmap updated successfully',
            'rows_affected': len(res.data) if res.data else 0,
            'data': res.data
        })
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                'message': 'Supabase upsert failed',
                'error': str(e)
            }
        )