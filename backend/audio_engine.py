import librosa
import numpy as np
import soundfile as sf
from pedalboard import Pedalboard, Compressor, HighPassFilter, Reverb, Bitcrush
from pedalboard.io import AudioFile
import os

class DJEngine:
    def __init__(self, output_dir="processed"):
        self.output_dir = output_dir
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

    def get_bpm(self, file_path):
        y, sr = librosa.load(file_path)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        return float(tempo)

    def process_mix(self, input_path, style, target_bpm=124, is_preview=False):
        # 1. Load audio
        with AudioFile(input_path) as f:
            audio = f.read(f.frames)
            samplerate = f.samplerate

        # 2. BPM Analysis and Time Stretching (using librosa for better quality)
        # Convert to mono for librosa if needed
        y = librosa.to_mono(audio) if audio.shape[0] > 1 else audio[0]
        current_bpm = self.get_bpm(input_path)
        
        # Calculate stretch factor
        stretch_factor = target_bpm / current_bpm
        # Limit stretch to avoid extreme distortion
        stretch_factor = max(0.8, min(1.2, stretch_factor))
        
        # Time stretch (librosa uses pitch-preserving stretching)
        y_stretched = librosa.effects.time_stretch(y, rate=stretch_factor)
        
        # Convert back to stereo if it was stereo (simple duplication for demo)
        audio_stretched = np.stack([y_stretched, y_stretched])

        # 3. Apply Effects based on style
        board = Pedalboard()
        
        if style == 'house':
            board.append(Compressor(threshold_db=-12, ratio=4))
            board.append(HighPassFilter(cutoff_frequency_hz=100))
        elif style == 'techno':
            board.append(Bitcrush(bit_depth=12))
            board.append(Compressor(threshold_db=-10, ratio=6))
        elif style == 'trance':
            board.append(Reverb(room_size=0.8))
        elif style == 'drum-n-bass':
            board.append(Compressor(threshold_db=-15, ratio=8))

        # Process through pedalboard
        effected = board(audio_stretched, samplerate)

        # 4. Handle Preview (cut to 30s)
        if is_preview:
            max_frames = int(samplerate * 30)
            effected = effected[:, :max_frames]

        # 5. Save result
        filename = os.path.basename(input_path)
        output_filename = f"{style}_{'preview_' if is_preview else ''}{filename}"
        output_path = os.path.join(self.output_dir, output_filename)
        
        with AudioFile(output_path, 'w', samplerate, effected.shape[0]) as f:
            f.write(effected)
            
        return output_path
