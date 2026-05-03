"""
main.py
Flask API for Insta-Check / Unfollow-Tracker.

Endpoints:
  POST /upload      — original flow: receives followers.json + following.json
                      as separate multipart fields.
  POST /upload-zip  — new flow: receives the full Instagram export .zip file
                      in a single 'zip' field.
  GET  /health      — liveness check.
"""

import os
import zipfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from processor import process_files, process_zip

app = Flask(__name__)
CORS(app)


# ── Original two-JSON endpoint ────────────────────────────────────────────────

@app.route("/upload", methods=["POST"])
def upload():
    if "followers" not in request.files or "following" not in request.files:
        return jsonify({"error": "Both 'followers' and 'following' files are required."}), 400

    followers_file = request.files["followers"]
    following_file = request.files["following"]

    if not followers_file.filename or not following_file.filename:
        return jsonify({"error": "File names cannot be empty."}), 400

    try:
        result = process_files(followers_file, following_file)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Processing error: {str(e)}"}), 500


# ── ZIP endpoint ──────────────────────────────────────────────────────────────

@app.route("/upload-zip", methods=["POST"])
def upload_zip():
    if "zip" not in request.files:
        return jsonify({"error": "A ZIP file is required in the 'zip' field."}), 400

    zip_file = request.files["zip"]

    if not zip_file.filename:
        return jsonify({"error": "File name cannot be empty."}), 400

    if not zip_file.filename.lower().endswith(".zip"):
        return jsonify({"error": "The uploaded file must have a .zip extension."}), 400

    try:
        zip_bytes = zip_file.read()
        result = process_zip(zip_bytes)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except zipfile.BadZipFile:
        return jsonify({"error": "The uploaded file is not a valid ZIP archive."}), 422
    except Exception as e:
        return jsonify({"error": f"Processing error: {str(e)}"}), 500


# ── Health check ──────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
