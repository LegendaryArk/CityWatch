import cv2
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse

IMG_SIZE = 224

model = tf.keras.models.load_model('infrastructure_model.keras')

classes_names = ['cracks', 'graffiti', 'potholes', 'broken_road_signs']

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

    preds = model.predict(img)

    class_index = int(np.argmax(preds))
    confidence = float(preds[0][class_index])

    result = {
        'prediction': classes_names[class_index],
        'confidence': confidence
    }

    return JSONResponse(status_code=200, content=result)