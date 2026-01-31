from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import Optional
import os
import shutil
import uuid
import json
from concurrent.futures import ThreadPoolExecutor
from .audio_engine import DJEngine

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")
REGISTRY_PATH = os.path.join(BASE_DIR, "file_registry.json")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

engine = DJEngine(output_dir=PROCESSED_DIR)

# Store file mappings in memory (for demo purposes)
# In real app, use a database
file_registry = {}
reference_registry = {}
jobs = {}
executor = ThreadPoolExecutor(max_workers=2)

def load_registry():
    if not os.path.exists(REGISTRY_PATH):
        return
    try:
        with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        file_registry.update(data.get("file_registry", {}))
        reference_registry.update(data.get("reference_registry", {}))
    except Exception:
        pass

def save_registry():
    data = {
        "file_registry": file_registry,
        "reference_registry": reference_registry,
    }
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f)

load_registry()

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    reference_file: Optional[UploadFile] = File(None)
):
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    save_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
    
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    file_registry[file_id] = save_path
    reference_file_id = None
    if reference_file:
        reference_file_id = str(uuid.uuid4())
        ref_ext = os.path.splitext(reference_file.filename)[1]
        ref_path = os.path.join(UPLOAD_DIR, f"{reference_file_id}{ref_ext}")
        with open(ref_path, "wb") as buffer:
            shutil.copyfileobj(reference_file.file, buffer)
        reference_registry[reference_file_id] = ref_path

    save_registry()
    return {
        "file_id": file_id,
        "filename": file.filename,
        "reference_file_id": reference_file_id,
        "reference_filename": reference_file.filename if reference_file else None,
    }

def _run_job(job_id, input_path, style, target_bpm, is_preview, reference_path):
    try:
        jobs[job_id]["status"] = "running"
        output_path = engine.process_mix(
            input_path,
            style,
            target_bpm=target_bpm,
            is_preview=is_preview,
            reference_path=reference_path,
            progress_cb=lambda p: jobs[job_id].update({"progress": p}),
        )
        jobs[job_id]["status"] = "complete"
        jobs[job_id]["output_file"] = os.path.basename(output_path)
        jobs[job_id]["progress"] = 100
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)

@app.post("/process/start")
async def process_audio_start(
    file_id: str = Form(...),
    style: str = Form(...),
    target_bpm: int = Form(124),
    is_preview: bool = Form(True),
    reference_file_id: Optional[str] = Form(None)
):
    if file_id not in file_registry:
        raise HTTPException(status_code=404, detail="File not found")
    
    input_path = file_registry[file_id]
    reference_path = None
    if reference_file_id:
        if reference_file_id not in reference_registry:
            raise HTTPException(status_code=404, detail="Reference file not found")
        reference_path = reference_registry[reference_file_id]

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "output_file": None,
        "error": None,
    }
    executor.submit(_run_job, job_id, input_path, style, target_bpm, is_preview, reference_path)
    return {"job_id": job_id}

@app.get("/process/status/{job_id}")
async def process_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]

@app.post("/process/batch")
async def process_audio_batch(
    file_id: str = Form(...),
    styles: str = Form(...),
    target_bpm: int = Form(124),
    is_preview: bool = Form(True),
    reference_file_id: Optional[str] = Form(None)
):
    if file_id not in file_registry:
        raise HTTPException(status_code=404, detail="File not found")
    input_path = file_registry[file_id]
    reference_path = None
    if reference_file_id:
        if reference_file_id not in reference_registry:
            raise HTTPException(status_code=404, detail="Reference file not found")
        reference_path = reference_registry[reference_file_id]

    style_list = [s.strip() for s in styles.split(",") if s.strip()]
    outputs = {}
    for style in style_list:
        output_path = engine.process_mix(
            input_path,
            style,
            target_bpm=target_bpm,
            is_preview=is_preview,
            reference_path=reference_path,
        )
        outputs[style] = os.path.basename(output_path)
    return {"outputs": outputs}

@app.get("/download/{filename}")
async def download_file(filename: str):
    path = os.path.join(PROCESSED_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
