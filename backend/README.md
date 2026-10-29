# Audio2Style Pro - Python Backend (Spotify Basic Pitch)

Backend Python FastAPI ini dirancang khusus untuk menangani transkripsi audio polifonik presisi tinggi menggunakan model **Spotify Basic Pitch**, menghasilkan file MIDI profesional yang mendekati melodi lagu asli untuk konversi ke Yamaha Style (PSR-S750).

---

## **Cara Pemasangan & Menjalankan di Windows:**

### **1. Prasyarat Sistem**
* Pastikan **Python 3.9 atau 3.10** terinstal di Windows Anda (disarankan versi 64-bit).
* Pastikan `pip` sudah diperbarui.

### **2. Langkah Instalasi**
Buka Command Prompt (CMD) atau PowerShell di folder `/backend`, lalu jalankan perintah berikut:

```bash
# 1. Buat virtual environment (opsional tapi disarankan)
python -m venv venv
venv\Scripts\activate

# 2. Upgrade pip & setuptools
python -m pip install --upgrade pip

# 3. Instal dependensi dari requirements.txt
pip install -r requirements.txt
```

*(Catatan: Jika instalasi TensorFlow / Basic Pitch mengalami kendala pada Windows, pastikan Anda menggunakan Python 3.10).*

### **3. Menjalankan Server FastAPI**
Jalankan perintah berikut di terminal:
```bash
uvicorn main:app --reload --port 8000
```
Server akan berjalan secara lokal di: `http://127.0.0.1:8000`

### **4. Integrasi dengan Aplikasi Web Audio2Style Pro**
* Buka menu **Audio Converter** di aplikasi web Audio2Style Pro.
* Pilih opsi **Python FastAPI Bridge (Lokal :8000)**.
* Unggah file MP3 atau WAV Anda, lalu klik konversi. Aplikasi akan otomatis mengirimkan file audio ke backend Python dan menerima hasil MIDI berbasis Basic Pitch yang sangat akurat!
