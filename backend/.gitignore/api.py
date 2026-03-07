from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'} #to change (update form to allow and not allow stuff)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def home():
    return render_template('test_form.html')  # serve the form

@app.route('/api/report', methods=['POST'])
def report_pothole():
    if 'photo' not in request.files:
        return jsonify({'error': 'No photo provided'}), 400

    photo = request.files['photo']
    gps_lat = request.form.get('gps_lat')
    gps_lon = request.form.get('gps_lon')

    if photo.filename == '':
        return jsonify({'error': 'No selected photo'}), 400
    if not allowed_file(photo.filename):
        return jsonify({'error': 'File type not allowed'}), 400

    filename = secure_filename(photo.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    photo.save(filepath)

    report_data = {
        'photo_path': filepath,
        'gps_lat': gps_lat,
        'gps_lon': gps_lon,
        'status': 'New'
    }

    return jsonify({'message': 'Report received', 'data': report_data}), 200

if __name__ == '__main__':
    app.run(debug=True)