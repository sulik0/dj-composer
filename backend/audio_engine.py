import os
from typing import Callable, Optional, Tuple

import librosa
import numpy as np
from pedalboard import Bitcrush, Compressor, HighPassFilter, Pedalboard, Reverb
from pedalboard.io import AudioFile

class DJEngine:
    def __init__(self, output_dir="processed"):
        self.output_dir = output_dir
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

    def get_bpm(self, file_path):
        y, sr = librosa.load(file_path)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        return float(tempo)

    def _analyze_reference(self, reference_path: str) -> Tuple[Optional[float], Optional[float]]:
        try:
            y, sr = librosa.load(reference_path)
        except Exception:
            return None, None

        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        brightness = float(np.mean(spectral_centroid) / (sr / 2))
        brightness = max(0.0, min(1.0, brightness))
        return float(tempo), brightness

    def process_mix(
        self,
        input_path,
        style,
        target_bpm=124,
        is_preview=False,
        reference_path: Optional[str] = None,
        progress_cb: Optional[Callable[[int], None]] = None,
    ):
        if progress_cb:
            progress_cb(10)
        # 1. Load audio
        with AudioFile(input_path) as f:
            audio = f.read(f.frames)
            samplerate = f.samplerate
        if progress_cb:
            progress_cb(30)

        # 2. BPM Analysis and Time Stretching (using librosa for better quality)
        # Convert to mono for librosa if needed
        y = librosa.to_mono(audio) if audio.shape[0] > 1 else audio[0]
        current_bpm = self.get_bpm(input_path)
        if current_bpm <= 0:
            current_bpm = float(target_bpm)

        reference_bpm = None
        reference_brightness = None
        if reference_path:
            reference_bpm, reference_brightness = self._analyze_reference(reference_path)

        # Calculate stretch factor
        effective_bpm = float(target_bpm)
        if reference_bpm and 60 <= reference_bpm <= 200:
            effective_bpm = (effective_bpm + reference_bpm) / 2

        stretch_factor = effective_bpm / current_bpm
        # Limit stretch to avoid extreme distortion
        stretch_factor = max(0.8, min(1.2, stretch_factor))
        
        # Time stretch (librosa uses pitch-preserving stretching)
        y_stretched = librosa.effects.time_stretch(y, rate=stretch_factor)
        
        # Convert back to stereo if it was stereo (simple duplication for demo)
        audio_stretched = np.stack([y_stretched, y_stretched])

        if progress_cb:
            progress_cb(60)

        # 3. Apply Effects based on style
        board = Pedalboard()

        brightness = reference_brightness if reference_brightness is not None else 0.5
        
        if style == 'house':
            threshold = -14 + (brightness * 6)
            cutoff = 80 + (brightness * 140)
            board.append(Compressor(threshold_db=threshold, ratio=4))
            board.append(HighPassFilter(cutoff_frequency_hz=cutoff))
        elif style == 'techno':
            bit_depth = int(10 + (1 - brightness) * 6)
            board.append(Bitcrush(bit_depth=bit_depth))
            board.append(Compressor(threshold_db=-12 + (brightness * 4), ratio=6))
        elif style == 'trance':
            room_size = 0.6 + (1 - brightness) * 0.3
            board.append(Reverb(room_size=room_size))
        elif style == 'drum-n-bass':
            board.append(Compressor(threshold_db=-16 + (brightness * 4), ratio=8))

        # Process through pedalboard
        effected = board(audio_stretched, samplerate)

        # 4. Handle Preview (cut to 30s)
        if is_preview:
            max_frames = int(samplerate * 30)
            effected = effected[:, :max_frames]
        if progress_cb:
            progress_cb(90)

        # 5. Save result
        filename = os.path.basename(input_path)
        output_filename = f"{style}_{'preview_' if is_preview else ''}{filename}"
        output_path = os.path.join(self.output_dir, output_filename)
        
        with AudioFile(output_path, 'w', samplerate, effected.shape[0]) as f:
            f.write(effected)
        if progress_cb:
            progress_cb(100)

        return output_path
