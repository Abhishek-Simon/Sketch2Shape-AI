# Sketch2Shape AI Studio

An interactive web application that bridges hand-drawn sketches and images to 3D shape generation workflows. Featuring a reactive HTML5 canvas sketchpad, image upload pipeline, real-time generation polling, and interactive Three.js 3D viewport preview with GLB asset export.

---

## 🚀 Overview & Architecture

Sketch2Shape AI Studio is organized as a decoupled frontend and backend:

```
Hypertune/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── core/config.py    # Environment settings & directory management
│   │   ├── routes/           # Generation endpoints (POST /generate, GET /status, GET /model)
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Image processing & job pipeline logic
│   │   └── main.py           # FastAPI entrypoint and CORS config
│   ├── uploads/              # Staging directory for input drawings/images
│   ├── outputs/              # Staging directory for generated 3D models (.glb/.obj)
│   └── requirements.txt      # Python dependencies
├── src/                      # React Frontend (Vite + TailwindCSS + Three.js)
│   ├── components/           # SketchCanvas, ModelViewer, Header, ExportPanel, etc.
│   ├── pages/Workspace.jsx   # Main workspace coordinating canvas, inputs, and 3D preview
│   └── services/api.js       # Axios service client connecting to the FastAPI backend
├── index.html
├── vite.config.js
└── package.json
```

---

## ✨ Features

- **Interactive HTML5 Sketchpad**:
  - Persistent freehand stroke drawing with smooth path interpolation.
  - Brush and Eraser tools with dynamic brush size slider (1px - 40px).
  - Multi-step Undo, Redo, and Clear capabilities.
  - One-click Preset loader (e.g. starter drone sketch).
  - Canvas export as PNG Blob for direct model generation.
- **Image Upload Pipeline**:
  - Drag-and-drop or file picker for PNG, JPG, and WebP images.
  - Image preview with dimension inspection and quick removal/replacement.
- **Generation Control**:
  - Prompt input with material/style preset chips.
  - Input validation ensuring either a canvas sketch or uploaded image is present.
  - Polling mechanism tracking job status (`queued`, `processing`, `completed`, `failed`).
- **Interactive 3D Preview (Three.js & React Three Fiber)**:
  - Real-time GLB model rendering using `GLTFLoader`.
  - OrbitControls for 360° pan, zoom, and inspection.
  - Dynamic camera framing and neutral lighting setup.
- **Asset Export**:
  - Instant GLB download when generation completes.
  - Responsive, dark-themed UI inspired by modern creative suites.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite**
- **Three.js** + **@react-three/fiber** + **@react-three/drei**
- **Tailwind CSS**
- **Lucide React** (Icons)
- **Axios**

### Backend
- **Python 3.11**
- **FastAPI** + **Uvicorn**
- **Pillow** & **OpenCV** (Image processing & validation)
- **Pydantic**
- **python-multipart**

---

## ⚡ Getting Started

### 1. Backend Setup

1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   Interactive API documentation will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 2. Frontend Setup

1. From the project root directory, install npm packages:
   ```bash
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to the local server URL (typically [http://localhost:5173](http://localhost:5173)).

---

## 📄 License

MIT License.
