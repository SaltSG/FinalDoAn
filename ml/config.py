from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
BACKEND_BASE = os.environ.get("BACKEND_BASE", "http://127.0.0.1:5000").rstrip("/")


