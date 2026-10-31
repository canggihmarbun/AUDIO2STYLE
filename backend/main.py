from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import shutil
import tempfile
import base64
import subprocess

app = FastAPI(title="Audio2Style Pro - Demucs & Basic Pitch Python Backend", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    demucs_installed = False
    basic_pitch_installed = False
    
    try:
        import demucs
        demucs_installed = True
    except ImportError:
        pass

    try:
        import basic_pitch
        basic_pitch_installed = True
    except ImportError:
        pass

    return {
        "status": "ok",
        "message": "Python FastAPI Demucs & Basic Pitch server is running.",
        "demucs_ready": demucs_installed,
        "basic_pitch_ready": basic_pitch_installed
    }

@app.post("/separate-stems")
async def separate_stems(file: UploadFile = File(...)):
    """
    Separate MP3 or WAV audio into 4 stems using Meta Demucs (Drums, Bass, Vocals, Other).
    """
    tmp_path = None
    output_dir = None
    try:
        suffix = os.path.splitext(file.filename)[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        output_dir = tempfile.mkdtemp()

        # Try running demucs via CLI or python package
        try:
            cmd = ["demucs", "-n", "htdemucs", "--out", output_dir, tmp_path]
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            
            if result.returncode != 0:
                raise RuntimeError(result.stderr or "Demucs execution failed.")

            # Demucs output folder structure: output_dir/htdemucs/{track_name}/[drums.wav, bass.wav, vocals.wav, other.wav]
            model_dir = os.path.join(output_dir, "htdemucs")
            track_dirs = [os.path.join(model_dir, d) for d in os.listdir(model_dir) if os.path.isdir(os.path.join(model_dir, d))]
            if not track_dirs:
                raise RuntimeError("Demucs did not output track stems directory.")

            stems_folder = track_dirs[0]
            stems_result = {}

            stem_files = {
                "drum": ["drums.wav", "drum.wav"],
                "bass": ["bass.wav"],
                "vocal": ["vocals.wav", "vocal.wav"],
                "other": ["other.wav", "accompaniment.wav"]
            }

            for key, filenames in stem_files.items():
                found_path = None
                for fn in filenames:
                    p = os.path.join(stems_folder, fn)
                    if os.path.exists(p):
                        found_path = p
                        break
                
                if found_path and os.path.exists(found_path):
                    with open(found_path, "rb") as f:
                        stems_result[key] = base64.b64encode(f.read()).decode("utf-8")

            return {
                "success": True,
                "filename": file.filename,
                "stems": stems_result
            }

        except Exception as demucs_err:
            raise HTTPException(
                status_code=500,
                detail=f"Demucs AI separation failed: {str(demucs_err)}. Pastikan paket 'demucs' dan 'torch' terpasang di Python (pip install demucs torch torchaudio)."
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except:
                pass
        if output_dir and os.path.exists(output_dir):
            try:
                shutil.rmtree(output_dir, ignore_errors=True)
            except:
                pass

@app.post("/convert-audio-to-midi")
async def convert_audio_to_midi(file: UploadFile = File(...)):
    """
    Endpoint to process MP3/WAV audio using Spotify Basic Pitch for high-accuracy polyphonic MIDI transcription.
    """
    tmp_path = None
    output_dir = None
    try:
        suffix = os.path.splitext(file.filename)[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        try:
            from basic_pitch.inference import predict_and_save
            
            output_dir = tempfile.mkdtemp()
            predict_and_save(
                [tmp_path],
                output_dir,
                onset_threshold=0.5,
                frame_threshold=0.3,
                minimum_note_length=58.2,
                midi_tempo=120.0
            )
            
            midi_files = [os.path.join(output_dir, f) for f in os.listdir(output_dir) if f.endswith('.mid')]
            if not midi_files:
                raise HTTPException(status_code=500, detail="Basic Pitch did not generate a MIDI file.")
            
            generated_midi_path = midi_files[0]
            with open(generated_midi_path, "rb") as f:
                midi_bytes = f.read()
                
            return {
                "success": True,
                "filename": file.filename,
                "midi_base64": base64.b64encode(midi_bytes).decode('utf-8')
            }

        except ImportError:
            raise HTTPException(
                status_code=500, 
                detail="Python package 'basic-pitch' is not installed. Run 'pip install basic-pitch tensorflow' in your Windows terminal."
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except:
                pass
        if output_dir and os.path.exists(output_dir):
            try:
                shutil.rmtree(output_dir, ignore_errors=True)
            except:
                pass

@app.post("/convert-stem-to-midi")
async def convert_stem_to_midi(file: UploadFile = File(...), stem_type: str = Form("other")):
    """
    Convert a specific isolated stem (drum, bass, vocal, other) to MIDI with tailored onset/frame sensitivity.
    """
    tmp_path = None
    output_dir = None
    try:
        suffix = os.path.splitext(file.filename)[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        try:
            from basic_pitch.inference import predict_and_save
            output_dir = tempfile.mkdtemp()

            # Tune parameters based on stem type
            onset_th = 0.55 if stem_type == 'drum' else (0.45 if stem_type == 'vocal' else 0.5)
            frame_th = 0.35 if stem_type == 'drum' else 0.28
            min_len = 35.0 if stem_type == 'drum' else 58.2

            predict_and_save(
                [tmp_path],
                output_dir,
                onset_threshold=onset_th,
                frame_threshold=frame_th,
                minimum_note_length=min_len,
                midi_tempo=120.0
            )

            midi_files = [os.path.join(output_dir, f) for f in os.listdir(output_dir) if f.endswith('.mid')]
            if not midi_files:
                raise HTTPException(status_code=500, detail=f"Basic Pitch did not generate a MIDI file for stem {stem_type}.")
            
            with open(midi_files[0], "rb") as f:
                midi_bytes = f.read()

            return {
                "success": True,
                "stem_type": stem_type,
                "filename": file.filename,
                "midi_base64": base64.b64encode(midi_bytes).decode('utf-8')
            }

        except ImportError:
            raise HTTPException(
                status_code=500, 
                detail="Python package 'basic-pitch' is not installed in the Python environment."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except:
                pass
        if output_dir and os.path.exists(output_dir):
            try:
                shutil.rmtree(output_dir, ignore_errors=True)
            except:
                pass

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
