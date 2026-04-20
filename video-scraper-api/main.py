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
    'format': 'bestvideo+bestaudio/best',
    'noplaylist': True,
    'quiet': True,
    'no_warnings': True,
    'merge_output_format': 'mp4',
}


@app.get("/api/info")
async def get_video_info(url: str = Query(...)):
    ydl = yt_dlp.YoutubeDL(YTDLP_OPTIONS)
    try:
        info = ydl.extract_info(url, download=False)
        formats = []
        seen_qualities = set()
        for f in info.get('formats', []):
            ext = f.get('ext', '')
            vcodec = f.get('vcodec', 'none')
            acodec = f.get('acodec', 'none')
            resolution = f.get('resolution') or f.get('height')
            
            has_audio = acodec != 'none'
            
            if resolution:
                quality = f"{resolution}p"
            elif acodec != 'none' and vcodec == 'none':
                quality = 'audio'
            else:
                quality = 'video'
            
            quality_key = f"{quality}-{ext}"
            if quality_key not in seen_qualities and ext in ['mp4', 'm4a', 'mp3']:
                if not has_audio and resolution:
                    continue
                if ext in ['m4a', 'mp3']:
                    quality = 'audio'
                elif resolution:
                    quality = f"{resolution}p"
                seen_qualities.add(quality_key)
                formats.append({
                    'format_id': f.get('format_id', ''),
                    'ext': ext,
                    'quality': quality,
                    'filesize': f.get('filesize') or 0
                })
        
        if not formats:
            for f in info.get('formats', [])[:5]:
                formats.append({
                    'format_id': f.get('format_id', 'best'),
                    'ext': f.get('ext', 'mp4'),
                    'quality': f.get('resolution') or f.get('height') or 'best',
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
    
    if format_id and format_id != 'best':
        ydl_opts = {
            'format': format_id,
            'noplaylist': True,
            'outtmpl': '/tmp/video.%(ext)s',
        }
    else:
        ydl_opts = {
            'format': 'best',
            'noplaylist': True,
            'outtmpl': '/tmp/video.%(ext)s',
        }
    
    ydl = yt_dlp.YoutubeDL(ydl_opts)
    info = ydl.extract_info(url, download=True)
    ext = info.get('ext', 'mp4')
    filepath = '/tmp/video.' + ext
    
    file_size = os.path.getsize(filepath)
    title = info.get('title', 'video')
    
    safe_title = ''.join(c if ord(c) < 128 else '_' for c in title)
    
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
            'Content-Disposition': f'attachment; filename="{safe_title}.{ext}"',
            'Content-Length': str(file_size)
        }
    )