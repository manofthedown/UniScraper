from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp
import io
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        seen_qualities = set()
        for f in info.get('formats', []):
            if f.get('ext') in ['mp4', 'm4a', 'webm']:
                quality = f.get('resolution') or 'audio'
                if quality not in seen_qualities:
                    seen_qualities.add(quality)
                    formats.append({
                        'format_id': f['format_id'],
                        'ext': f['ext'],
                        'quality': quality,
                        'filesize': f.get('filesize') or 0
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
    if format_id and format_id.lower() == 'none':
        format_id = None
    
    ydl_opts = {
        'format': format_id if format_id else 'best',
        'noplaylist': True,
        'outtmpl': '/tmp/video.%(ext)s',
    }
    
    ydl = yt_dlp.YoutubeDL(ydl_opts)
    info = ydl.extract_info(url, download=True)
    ext = info.get('ext', 'mp4')
    filepath = '/tmp/video.' + ext
    
    file_size = os.path.getsize(filepath)
    title = info.get('title', 'video')
    
    def file_generator():
        try:
            with open(filepath, 'rb') as f:
                while True:
                    chunk = f.read(8192)
                    if not chunk:
                        break
                    yield chunk
        finally:
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except:
                    pass
    
    media_type = f'audio/{ext}' if ext == 'mp3' else 'application/octet-stream'

    return StreamingResponse(
        file_generator(),
        media_type=media_type,
        headers={
            'Content-Disposition': f'attachment; filename="{title}.{ext}"',
            'Content-Length': str(file_size)
        }
    )