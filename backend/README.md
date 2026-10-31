# Audio2Style Pro - Python Backend (Demucs 4-Stem & Spotify Basic Pitch)

Backend Python FastAPI ini dirancang khusus untuk menangani:
1. **AI Audio Stem Separator (Meta Demucs 4-Stem `htdemucs`)**: Memisahkan audio MP3/WAV menjadi 4 track terisolasi: **Drums**, **Bass**, **Vocals**, dan **Other**.
2. **Polyphonic Audio-to-MIDI Transcription (Spotify Basic Pitch)**: Menghasilkan notasi MIDI presisi tinggi per stem untuk dipetakan ke 8 part Yamaha Style Arranger (PSR-S750).

---

## **Cara Pemasangan & Menjalankan di Windows:**

### **1. Prasyarat Sistem**
* Disarankan menggunakan **Python 3.9 atau 3.10** (64-bit).
* Koneksi internet untuk unduhan awal model Demucs (~80MB).

### **2. Langkah Instalasi**
Buka Command Prompt (CMD) atau PowerShell di folder `/backend`:

```bash
# 1. Buat virtual environment (disarankan)
python -m venv venv
venv\Scripts\activate

# 2. Upgrade pip
python -m pip install --upgrade pip

# 3. Instal dependensi Demucs, PyTorch, dan Basic Pitch
pip install -r requirements.txt
```

*(Tips: Jika Anda memiliki kartu grafis NVIDIA, instal PyTorch CUDA untuk pemisahan stem secepat kilat: `pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118`).*

### **3. Menjalankan Server FastAPI**
Jalankan perintah berikut di terminal:
```bash
uvicorn main:app --reload --port 8000
```
Server akan aktif di: `http://127.0.0.1:8000`

### **4. Endpoint yang Tersedia**
* `GET /health` : Mengecek kesiapan server, Demucs, dan Basic Pitch.
* `POST /separate-stems` : Memisahkan file MP3/WAV menjadi 4 stem (drum, bass, vocal, other).
* `POST /convert-stem-to-midi` : Mengonversi satu stem terisolasi ke file MIDI (.mid).
* `POST /convert-audio-to-midi` : Mengonversi audio penuh ke MIDI.

### **5. Integrasi dengan Audio2Style Pro**
Di aplikasi web Audio2Style Pro, buka menu **AI Stem Separator** atau **Audio Converter**, pilih opsi **Demucs AI Backend Python (:8000)**, dan nikmati pemisahan stem tingkat studio!
