# Universal Video Downloader

A web-based application for downloading videos from any video-sharing platform.

## Features

- Download videos from YouTube, Instagram, Facebook, Twitter/X, TikTok, Reddit, Vimeo, and 1700+ more sites
- Video metadata display (title, thumbnail, duration, uploader)
- Quality/format selection
- Simple URL input with one-click download
- Direct streaming to your device

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI (Python) + yt-dlp

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend Setup

```bash
cd video-scraper-api
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/python -m uvicorn main:app --port 8000
```

### Frontend Setup

```bash
cd video-scraper-web
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

## Deployment

### Backend (Render.com)

1. Create `requirements.txt` with your dependencies
2. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Set `PYTHON_VERSION` to `3.10` or higher

### Frontend (Vercel/Netlify)

```bash
cd video-scraper-web
npm run build
# Deploy the 'dist' folder
```

## Environment Variables

- `VITE_API_URL` - Backend API URL (optional for local development)

## Supported Platforms

YouTube, YouTube Music, Instagram, Facebook, Twitter/X, TikTok, Reddit, Vimeo, Dailymotion, Twitch, and 1700+ more sites.

## License

MIT