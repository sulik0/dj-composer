import os
import tempfile
import uuid
from typing import Optional

import librosa
import numpy as np
import requests
from rq import get_current_job

from .storage import OssStorage


def _update_progress(value: int, progress_cb=None) -> None:
    job = get_current_job()
    if not job:
        if progress_cb:
            progress_cb(value)
        return
    job.meta["progress"] = value
    job.save_meta()
    if progress_cb:
        progress_cb(value)


def _download(url: str, dest_path: str) -> None:
    with requests.get(url, stream=True, timeout=60) as response:
        response.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)


def _run_cmd(cmd: list[str]) -> None:
    import subprocess

    result = subprocess.run(cmd, check=False, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "Command failed")


def _find_file(root: str, name: str) -> Optional[str]:
    for base, _, files in os.walk(root):
        for file in files:
            if file == name:
                return os.path.join(base, file)
    return None


def _estimate_key(y: np.ndarray, sr: int) -> str:
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    profile = np.mean(chroma, axis=1)
    key_idx = int(np.argmax(profile))
    keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    return keys[key_idx]


def _generate_sound_effect(api_key: str, text: str, duration: int, output_path: str) -> None:
    url = "https://api.elevenlabs.io/v1/text-to-sound-effects/convert"
    headers = {"xi-api-key": api_key}
    payload = {"text": text, "duration_seconds": duration}
    response = requests.post(url, headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    with open(output_path, "wb") as f:
        f.write(response.content)


def process_remix(
    original_url: str,
    reference_url: Optional[str],
    style_text: str,
    preset_style: Optional[str] = None,
    output_format: str = "mp3",
    progress_cb=None,
) -> dict:
    job = get_current_job()
    if job:
        job.meta["progress"] = 0
        job.save_meta()

    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("Missing required env var: ELEVENLABS_API_KEY")

    storage = OssStorage.from_env()

    with tempfile.TemporaryDirectory() as tmpdir:
        original_path = os.path.join(tmpdir, "original.wav")
        reference_path = os.path.join(tmpdir, "reference.wav")
        _update_progress(5, progress_cb)
        _download(original_url, original_path)
        if reference_url:
            _download(reference_url, reference_path)
        _update_progress(15, progress_cb)

        y, sr = librosa.load(original_path)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        key = _estimate_key(y, sr)
        duration = int(librosa.get_duration(y=y, sr=sr))
        _update_progress(25, progress_cb)

        stems_dir = os.path.join(tmpdir, "stems")
        os.makedirs(stems_dir, exist_ok=True)
        _run_cmd(["demucs", "--two-stems=vocals", "-o", stems_dir, original_path])
        vocals_path = _find_file(stems_dir, "vocals.wav")
        no_vocals_path = _find_file(stems_dir, "no_vocals.wav")
        if not no_vocals_path:
            raise RuntimeError("Demucs output missing no_vocals.wav")
        _update_progress(40, progress_cb)

        style_hint = preset_style or "DJ"
        reference_hint = "Use the reference track vibe." if reference_url else ""
        drum_prompt = (
            f"Create a {style_hint} drum loop at {int(tempo)} BPM in key {key}. "
            f"Style: {style_text}. {reference_hint}"
        )
        fx_prompt = f"Create a short EDM FX riser for {style_text}."
        drums_path = os.path.join(tmpdir, "drums.mp3")
        fx_path = os.path.join(tmpdir, "fx.mp3")
        _generate_sound_effect(api_key, drum_prompt, duration=8, output_path=drums_path)
        _generate_sound_effect(api_key, fx_prompt, duration=4, output_path=fx_path)
        _update_progress(60, progress_cb)

        remix_wav = os.path.join(tmpdir, "remix.wav")
        remix_mp3 = os.path.join(tmpdir, "remix.mp3")

        ffmpeg_cmd = ["ffmpeg", "-y", "-i", no_vocals_path]
        inputs = 1
        if vocals_path:
            ffmpeg_cmd += ["-i", vocals_path]
            inputs += 1
        ffmpeg_cmd += ["-stream_loop", "-1", "-i", drums_path, "-stream_loop", "-1", "-i", fx_path]
        inputs += 2

        filter_inputs = []
        for idx in range(inputs):
            filter_inputs.append(f"[{idx}:a]")
        filter_complex = "".join(filter_inputs) + f"amix=inputs={inputs}:duration=longest:dropout_transition=2"

        ffmpeg_cmd += [
            "-filter_complex",
            filter_complex,
            "-t",
            str(duration),
            remix_wav,
        ]
        _run_cmd(ffmpeg_cmd)
        _update_progress(75, progress_cb)

        output_path = remix_mp3
        output_ext = "mp3"
        if output_format.lower() == "wav":
            output_path = remix_wav
            output_ext = "wav"
        else:
            _run_cmd(["ffmpeg", "-y", "-i", remix_wav, "-codec:a", "libmp3lame", "-b:a", "192k", remix_mp3])
        _update_progress(85, progress_cb)

        output_key = f"outputs/{uuid.uuid4()}.{output_ext}"
        output_url = storage.upload_file(output_path, output_key)
        _update_progress(100, progress_cb)

    return {
        "output_url": output_url,
        "output_format": output_format,
        "bpm": float(tempo),
        "key": key,
    }
