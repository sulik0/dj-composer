from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rq.job import Job
from typing import Optional
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Lock

from .queue import get_queue
from .storage import OssStorage
from .tasks import process_remix
from dotenv import load_dotenv

app = FastAPI()

load_dotenv()

executor = ThreadPoolExecutor(max_workers=2)
local_jobs = {}
local_lock = Lock()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UploadSignRequest(BaseModel):
    filename: str
    content_type: str


class UploadSignResponse(BaseModel):
    upload_url: str
    file_url: str
    headers: dict
    object_key: str


class CreateTaskRequest(BaseModel):
    original_url: str
    reference_url: Optional[str] = None
    style_text: str
    preset_style: Optional[str] = None
    output_format: str = "mp3"


@app.post("/upload/sign", response_model=UploadSignResponse)
async def sign_upload(payload: UploadSignRequest):
    try:
        storage = OssStorage.from_env()
    except RuntimeError as e:
        raise HTTPException(status_code=501, detail=str(e))

    ext = os.path.splitext(payload.filename)[1] or ".bin"
    object_key = f"uploads/{uuid.uuid4()}{ext}"
    signed = storage.sign_put(object_key, payload.content_type)
    return UploadSignResponse(
        upload_url=signed.upload_url,
        file_url=signed.file_url,
        headers=signed.headers,
        object_key=signed.object_key,
    )


@app.post("/tasks/create")
async def create_task(payload: CreateTaskRequest):
    try:
        queue = get_queue()
    except RuntimeError:
        task_id = str(uuid.uuid4())
        with local_lock:
            local_jobs[task_id] = {"status": "queued", "progress": 0, "result": None, "error": None}

        def _run_local():
            with local_lock:
                local_jobs[task_id]["status"] = "running"

            def _progress(p):
                with local_lock:
                    local_jobs[task_id]["progress"] = p

            try:
                result = process_remix(
                    payload.original_url,
                    payload.reference_url,
                    payload.style_text,
                    payload.preset_style,
                    payload.output_format,
                    progress_cb=_progress,
                )
                with local_lock:
                    local_jobs[task_id]["status"] = "finished"
                    local_jobs[task_id]["result"] = result
                    local_jobs[task_id]["progress"] = 100
            except Exception as e:
                with local_lock:
                    local_jobs[task_id]["status"] = "failed"
                    local_jobs[task_id]["error"] = str(e)

        executor.submit(_run_local)
        return {"task_id": task_id, "mode": "local"}

    job = queue.enqueue(
        process_remix,
        payload.original_url,
        payload.reference_url,
        payload.style_text,
        payload.preset_style,
        payload.output_format,
    )
    return {"task_id": job.id, "mode": "rq"}


@app.get("/tasks/status/{task_id}")
async def task_status(task_id: str):
    try:
        queue = get_queue()
    except RuntimeError:
        with local_lock:
            job = local_jobs.get(task_id)
        if not job:
            raise HTTPException(status_code=404, detail="Task not found")
        response = {"status": job["status"], "progress": job.get("progress", 0)}
        if job["status"] == "failed":
            response["error"] = job.get("error")
        if job["status"] == "finished" and job.get("result"):
            response.update(job["result"])
        return response

    try:
        job = Job.fetch(task_id, connection=queue.connection)
    except Exception:
        raise HTTPException(status_code=404, detail="Task not found")

    status = job.get_status()
    meta = job.meta or {}
    response = {"status": status, "progress": meta.get("progress", 0)}
    if status == "failed":
        response["error"] = str(job.exc_info)
    if status == "finished" and job.result:
        response.update(job.result)
    return response


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
