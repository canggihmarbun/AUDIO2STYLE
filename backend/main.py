from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import shutil
import tempfile

app = FastAPI(title="Audio2Style Pro - Basic Pitch Python Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Python FastAPI Basic Pitch server is running successfully."}

@app.post("/convert-audio-to-midi")
async def convert_audio_to_midi(file: UploadFile = File(...)):
    """
    Endpoint to process MP3/WAV audio using Spotify Basic Pitch for high-accuracy polyphonic MIDI transcription.
    """
    try:
        # Create temp file for upload
        suffix = os.path.splitext(file.filename)[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        # Try importing basic_pitch if installed
        try:
            from basic_pitch.inference import predict_and_save
            from basic_pitch import ICASSP_2022_MODEL_PATH
            
            output_dir = tempfile.mkdtemp()
            predict_and_save(
                [tmp_path],
                output_dir,
                onset_threshold=0.5,
                frame_threshold=0.3,
                minimum_note_length=58.2,
                midi_tempo=120.0
            )
            
            # Find generated midi file
            midi_files = [os.path.join(output_dir, f) for f in os.listdir(output_dir) if f.endswith('.mid')]
            if not midi_files:
                raise HTTPException(status_code=500, detail="Basic Pitch did not generate a MIDI file.")
            
            generated_midi_path = midi_files[0]
            with open(generated_midi_path, "rb") as f:
                midi_bytes = f.read()
                
            # Cleanup
            os.unlink(tmp_path)
            shutil.rmtree(output_dir, ignore_errors=True)
            
            import base64
            return {
                "success": True,
                "filename": file.filename,
                "midi_base64": base64.b64encode(midi_bytes).decode('utf-8')
            }

        except ImportError:
            # Fallback if basic_pitch python package is not installed yet
            os.unlink(tmp_path)
            raise HTTPException(
                status_code=500, 
                detail="Python package 'basic-pitch' is not installed in the Python environment. Run 'pip install basic-pitch tensorflow' in your Windows terminal."
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
