from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from ultralytics import YOLO
import uuid
from supabase import create_client, Client
from datetime import datetime
from waitress import serve  # ✅ Production-ready WSGI server

# ------------------- CONFIGURATION -------------------

# ⚠️ Do NOT hardcode service keys in production!
# For Render, move these to Environment Variables (explained below)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://fdiroazxrgqlqmcnxeea.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkaXJvYXp4cmdxbHFtY254ZWVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTczMjg4OSwiZXhwIjoyMDc3MzA4ODg5fQ.MNkUwiA5MnbJQvXjEsMbfZ_NDNL-ZhRUqE9JbE1qT-w")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

UPLOAD_FOLDER = "uploads"
RESULT_FOLDER = "results"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

# Load YOLO model once (Render keeps it cached between requests)
model = YOLO("models/yolo.pt")

# ------------------- ROUTES -------------------

@app.route("/")
def home():
    """Serve index.html (main frontend)"""
    return send_from_directory(".", "index.html")


@app.route("/detect", methods=["POST"])
def detect():
    """Run YOLO detection and log results to Supabase"""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    patient_name = request.form.get("patient_name")
    doctor_license_no = request.form.get("doctor_license_no")

    if not patient_name or not doctor_license_no:
        return jsonify({"error": "Missing patient or doctor info"}), 400

    # Save uploaded image
    filename = f"{uuid.uuid4().hex}.jpg"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    # YOLO detection
    results = model.predict(source=filepath, save=True, project=RESULT_FOLDER, name="det")
    r = results[0]

    # Count detected objects
    class_names = r.names
    counts = {}
    for c in r.boxes.cls:
        label = class_names[int(c)].lower().strip()
        counts[label] = counts.get(label, 0) + 1

    rbc_count = counts.get("rbc", 0)
    wbc_count = counts.get("wbc", 0)
    platelet_count = counts.get("platelet", 0)

    # Get output image
    save_dir = r.save_dir
    output_files = [f for f in os.listdir(save_dir) if f.endswith(".jpg")]
    output_path = os.path.join(save_dir, output_files[0]) if output_files else None

    if not output_path or not os.path.exists(output_path):
        return jsonify({"error": "No output image found"}), 500

    rel_path = os.path.relpath(output_path, start=os.getcwd()).replace("\\", "/")

    # Save results to Supabase
    try:
        data = {
            "patient_name": patient_name,
            "doctor_license_no": doctor_license_no,
            "rbc_count": rbc_count,
            "wbc_count": wbc_count,
            "platelet_count": platelet_count,
            "detected_at": datetime.now().isoformat()
        }
        supabase.table("detections").insert(data).execute()
        print("✅ Stored detection for:", patient_name)
    except Exception as e:
        print("❌ Supabase insert failed:", e)

    return jsonify({
        "image_url": "/" + rel_path,
        "rbc_count": rbc_count,
        "wbc_count": wbc_count,
        "platelet_count": platelet_count
    })


@app.route("/results/<path:filename>")
def serve_result(filename):
    return send_from_directory("results", filename)


@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory("uploads", filename)

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory('assets', filename)


# ------------------- START SERVER -------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # ✅ Render assigns dynamic port
    serve(app, host="0.0.0.0", port=port)
