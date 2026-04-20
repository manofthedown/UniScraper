# Universal Video Scraper - Development Plan

## Project Overview

A web-based application that allows users to download videos from any video-sharing platform (YouTube, Instagram, Facebook, Twitter/X, TikTok, Reddit, Vimeo, etc.) by simply pasting a URL and clicking a download button.

---

## Tech Stack

### Frontend
- **Framework**: React 18+ with Vite
- **Language**: TypeScript
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS
- **State Management**: React hooks (useState, useEffect)

### Backend
- **Framework**: FastAPI (Python)
- **Language**: Python 3.10+
- **Video Processing**: yt-dlp (supports 1700+ sites)
- **Server**: Uvicorn
- **HTTP Client**: httpx (for proxying downloads)

---

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   React UI      │ ──▶  │  FastAPI API    │ ──▶  │  Video Sources  │
│  (Vite + TS)    │      │  (yt-dlp)       │      │  (YouTube,      │
│                 │      │                 │      │   Instagram,    │
│  - URL Input    │      │  - /info        │      │   Facebook,     │
│  - Quality Sel  │      │  - /download     │      │   etc.)         │
│  - Progress     │      │  - Stream       │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

## API Endpoints

### GET /api/info
Fetch video metadata before downloading.

**Request**:
```
GET /api/info?url=<video_url>
```

**Response**:
```json
{
  "title": "Video Title",
  "thumbnail": "https://...",
  "duration": 180,
  "uploader": "Channel Name",
  "formats": [
    {"format_id": "bv+ba", "ext": "mp4", "quality": "1080p"},
    {"format_id": "bv+ba", "ext": "mp4", "quality": "720p"},
    {"format_id": "ba", "ext": "mp3", "quality": "audio"}
  ]
}
```

### GET /api/download
Stream the video file to the client.

**Request**:
```
GET /api/download?url=<video_url>&format_id=<format_id>
```

**Response**: Binary file stream (video/mp4 or audio/mpeg)

---

## Features

### Phase 1 - MVP
1. URL input field with validation
2. Video info fetching and display (title, thumbnail, duration)
3. Quality/format selection dropdown
4. Download button with progress indicator
5. Direct streaming download to user's device

### Phase 2 - Enhanced
1. Batch downloading (multiple URLs)
2. Audio-only extraction (MP3)
3. History of recent downloads (localStorage)
4. Copy-to-clipboard functionality

---

## Implementation Steps

### Step 1: Project Setup

```bash
# Backend
mkdir video-scraper-api
cd video-scraper-api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install fastapi uvicorn yt-dlp python-multipart

# Frontend
cd ..
npm create vite@latest video-scraper-web -- --template react-ts
cd video-scraper-web
npm install axios tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 2: Backend Implementation

Create `main.py`:

```python
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import StreamingResponse
import yt_dlp
import io
import os

app = FastAPI()

YTDLP_OPTIONS = {
    'format': 'best',
    'noplaylist': True,
    'quiet': True,
    'no_warnings': True,
}

@app.get("/api/info")
async def get_video_info(url: str = Query(...)):
    ydl = yt_dlp.YoutubeDL(YTDLP_OPTIONS)
    try:
        info = ydl.extract_info(url, download=False)
        formats = []
        for f in info.get('formats', []):
            if f.get('ext') in ['mp4', 'm4a', 'webm']:
                quality = f.get('resolution', 'audio')
                formats.append({
                    'format_id': f['format_id'],
                    'ext': f['ext'],
                    'quality': quality,
                    'filesize': f.get('filesize', 0)
                })
        return {
            'title': info.get('title'),
            'thumbnail': info.get('thumbnail'),
            'duration': info.get('duration'),
            'uploader': info.get('uploader'),
            'formats': formats[:10]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/download")
async def download_video(url: str = Query(...), format_id: str = Query(None)):
    ydl_opts = {
        'format': format_id or 'best',
        'noplaylist': True,
        'outtmpl': '%(title)s.%(ext)s',
    }
    try:
        info = ydl_opts.copy()
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            filename = os.path.basename(filename)
            
            def iter_file():
                with open(filename, 'rb') as f:
                    while chunk := f.read(8192):
                        yield chunk
                os.remove(filename)
            
            return StreamingResponse(
                iter_file(),
                media_type='application/octet-stream',
                headers={
                    'Content-Disposition': f'attachment; filename="{info["title"]}.{info["ext"]}"'
                }
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### Step 3: Frontend Implementation

Configure Tailwind in `tailwind.config.js`:
```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

Create main component in `src/App.tsx`:

```tsx
import { useState } from 'react'
import axios from 'axios'

interface VideoInfo {
  title: string
  thumbnail: string
  duration: number
  uploader: string
  formats: { format_id: string; ext: string; quality: string }[]
}

function App() {
  const [url, setUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [selectedFormat, setSelectedFormat] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchInfo = async () => {
    if (!url) return
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get(`http://localhost:8000/api/info?url=${encodeURIComponent(url)}`)
      setVideoInfo(data)
      setSelectedFormat(data.formats[0]?.format_id || '')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch video info')
    } finally {
      setLoading(false)
    }
  }

  const downloadVideo = async () => {
    if (!url || !selectedFormat) return
    setLoading(true)
    try {
      const response = await axios.get(
        `http://localhost:8000/api/download?url=${encodeURIComponent(url)}&format_id=${selectedFormat}`,
        { responseType: 'blob' }
      )
      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${videoInfo?.title || 'video'}.mp4`
      link.click()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Download failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Universal Video Downloader</h1>
        
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste video URL here..."
            className="flex-1 p-3 rounded bg-gray-800 border border-gray-700"
          />
          <button
            onClick={fetchInfo}
            disabled={loading || !url}
            className="px-6 py-3 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Get Info
          </button>
        </div>

        {error && <div className="text-red-400 mb-4">{error}</div>}

        {videoInfo && (
          <div className="bg-gray-800 rounded p-4 mb-6">
            <div className="flex gap-4 mb-4">
              <img src={videoInfo.thumbnail} alt="" className="w-48 rounded" />
              <div>
                <h2 className="font-bold">{videoInfo.title}</h2>
                <p className="text-gray-400">{videoInfo.uploader}</p>
                <p className="text-gray-400">{Math.floor(videoInfo.duration / 60)}:{String(videoInfo.duration % 60).padStart(2, '0')}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="p-2 bg-gray-700 rounded"
              >
                {videoInfo.formats.map(f => (
                  <option key={f.format_id} value={f.format_id}>
                    {f.quality} ({f.ext})
                  </option>
                ))}
              </select>
              <button
                onClick={downloadVideo}
                disabled={loading}
                className="px-6 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Download'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
```

### Step 4: CORS Configuration

Add CORS middleware to `main.py` for production:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Deployment Guide for Render.com

### Backend (Render)

1. Create `requirements.txt`:
```
fastapi
uvicorn[standard]
yt-dlp
python-multipart
httpx
```

2. Create `render.yaml` or configure manually:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3.10+

3. **Important**: Set `PYTHON_VERSION` to `3.10` or higher in Render dashboard

### Frontend (Vercel/Netlify)

1. Update `vite.config.ts` for proper base path:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api': 'http://localhost:8000'  // For local dev
    }
  }
})
```

2. **For Production**: Update API base URL in `App.tsx`:
```tsx
const API_BASE = import.meta.env.VITE_API_URL || 'https://your-backend.onrender.com'
// Then use: ${API_BASE}/api/info
```

3. Build and deploy:
```bash
npm run build
# Deploy the 'dist' folder to Vercel/Netlify
```

### Alternative: Single Backend with Static Files

Host frontend as static files from same backend:

1. Place React build in `static/` folder
2. Add to `main.py`:
```python
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app.mount("/static", Static(directory="static"))

@app.get("/")
async def serve_index():
    return FileResponse("static/index.html")
```

---

## Development Commands

```bash
# Backend
cd video-scraper-api
uvicorn main:app --reload --port 8000

# Frontend
cd video-scraper-web
npm run dev
```

---

## Supported Platforms (via yt-dlp)

- YouTube, YouTube Music
- Instagram (posts, reels, stories)
- Facebook, Facebook Watch
- Twitter/X (videos)
- TikTok
- Reddit
- Vimeo
- Dailymotion
- Twitch
- And 1700+ more sites

---

## Environment Variables

```
# Backend (.env)
PORT=8000

# Frontend (.env)
VITE_API_URL=https://your-render-backend.onrender.com
```

---

## Known Limitations

1. **Geo-restrictions**: Some videos may be unavailable due to regional restrictions
2. **Private content**: Cannot download private videos without authentication
3. **Rate limiting**: Some platforms may temporarily block requests
4. **Large files**: Very long videos may take significant time to process

---

## Future Enhancements

1. Authentication for user-specific features
2. Cloud storage integration (S3, Google Drive)
3. Download queue management
4. Mobile app (React Native / Tauri)
5. Browser extension
