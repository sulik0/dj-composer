from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import shutil
import uuid
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

UPLOAD_DIR = "uploads"
PROCESSED_DIR = "processed"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

engine = DJEngine(output_dir=PROCESSED_DIR)

# Store file mappings in memory (for demo purposes)
# In real app, use a database
file_registry = {}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    save_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
    
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    file_registry[file_id] = save_path
    return {"file_id": file_id, "filename": file.filename}

@app.post("/process")
async def process_audio(
    file_id: str = Form(...),
    style: str = Form(...),
    target_bpm: int = Form(124),
    is_preview: bool = Form(True)
):
    if file_id not in file_registry:
        raise HTTPException(status_code=404, detail="File not found")
    
    input_path = file_registry[file_id]
    try:
        output_path = engine.process_mix(
            input_path, 
            style, 
            target_bpm=target_bpm, 
            is_preview=is_preview
        )
        return {"output_file": os.path.basename(output_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download/{filename}")
async def download_file(filename: str):
    path = os.path.join(PROCESSED_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
