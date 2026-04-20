import { useState } from 'react'
import axios from 'axios'

interface VideoInfo {
  title: string
  thumbnail: string
  duration: number
  uploader: string
  formats: { format_id: string; ext: string; quality: string }[]
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
    setVideoInfo(null)
    try {
      const { data } = await axios.get(`${API_BASE}/api/info?url=${encodeURIComponent(url)}`)
      setVideoInfo(data)
      setSelectedFormat(data.formats[0]?.format_id || '')
    } catch (err: unknown) {
      const errorMessage = axios.isAxiosError(err) && err.response?.data?.detail 
        ? err.response.data.detail 
        : 'Failed to fetch video info'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const downloadVideo = async () => {
    if (!url || !selectedFormat) return
    setLoading(true)
    try {
      const response = await axios.get(
        `${API_BASE}/api/download?url=${encodeURIComponent(url)}&format_id=${selectedFormat}`,
        { responseType: 'blob' }
      )
      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      const ext = videoInfo?.formats.find(f => f.format_id === selectedFormat)?.ext || 'mp4'
      link.download = `${videoInfo?.title || 'video'}.${ext}`
      link.click()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err: unknown) {
      const errorMessage = axios.isAxiosError(err) && err.response?.data?.detail 
        ? err.response.data.detail 
        : 'Download failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && url) {
      fetchInfo()
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
      <div className="max-w-lg mx-auto px-6" style={{ paddingTop: '15vh', paddingBottom: '10vh' }}>
        
        <header className="text-center mb-16">
          <h1 
            className="text-5xl font-medium tracking-tight" 
            style={{ 
              color: '#111111', 
              fontWeight: 400,
              letterSpacing: '-2px',
              lineHeight: 1.1
            }}
          >
            Download any<br />
            <span style={{ color: '#888888' }}>video.</span>
          </h1>
          <p 
            className="mt-6 text-base"
            style={{ color: '#888888', fontWeight: 300 }}
          >
            Paste a link from YouTube, Instagram, TikTok and more.
          </p>
        </header>

        <div className="mb-10">
          <div className="flex flex-col gap-4" style={{ alignItems: 'center' }}>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="https://..."
              disabled={loading}
              className="px-6 py-4 text-lg rounded-2xl bg-white border-0 transition-all duration-300"
              style={{ 
                border: '1px solid #EEEEEE',
                color: '#111111',
                boxShadow: loading ? 'none' : '0 1px 3px rgba(0,0,0,0.02)',
                outline: 'none',
                fontWeight: 300,
                width: '340px'
              }}
            />
            <button
              onClick={fetchInfo}
              disabled={loading || !url}
              className="px-10 py-4 text-base font-medium rounded-2xl transition-all duration-300"
              style={{ 
                backgroundColor: '#111111', 
                color: 'black',
                opacity: loading || !url ? 0.3 : 1,
                boxShadow: loading || !url ? 'none' : '0 4px 12px rgba(17,17,17,0.15)'
              }}
            >
              {loading ? 'Fetching video...' : 'Wizard Shit'}
            </button>
          </div>
        </div>

        {error && (
          <div 
            className="mb-8 p-4 rounded-xl text-sm text-center"
            style={{ 
              backgroundColor: '#FEF2F2', 
              color: '#DC2626',
              fontWeight: 300
            }}
          >
            {error}
          </div>
        )}

        {videoInfo && (
          <div 
            className="bg-white rounded-2xl p-6 mb-8"
            style={{ 
              boxShadow: '0 2px 20px rgba(0,0,0,0.04)',
              border: '1px solid #F0F0F0'
            }}
          >
            <div className="flex gap-5 mb-6">
              <img 
                src={videoInfo.thumbnail} 
                alt={videoInfo.title} 
                className="w-32 h-20 object-cover rounded-lg flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h2 
                  className="font-medium text-base leading-snug"
                  style={{ color: '#111111', lineHeight: 1.3 }}
                >
                  {videoInfo.title}
                </h2>
                <p 
                  className="text-sm mt-2"
                  style={{ color: '#999999', fontWeight: 300 }}
                >
                  {videoInfo.uploader} · {formatDuration(videoInfo.duration)}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="flex-1 px-4 py-3.5 rounded-xl text-base"
                style={{ 
                  backgroundColor: '#FAFAFA', 
                  border: '1px solid #EEEEEE',
                  color: '#111111',
                  fontWeight: 300
                }}
              >
                {videoInfo.formats.map(f => (
                  <option key={f.format_id} value={f.format_id}>
                    {f.quality} · {f.ext.toUpperCase()}
                  </option>
                ))}
              </select>
              <button
                onClick={downloadVideo}
                disabled={loading}
                className="px-8 py-3.5 rounded-xl font-medium text-base transition-all duration-300"
                style={{ 
                  backgroundColor: '#111111', 
                  color: 'white',
                  opacity: loading ? 0.3 : 1
                }}
              >
                {loading ? 'Downloading...' : 'Download'}
              </button>
            </div>
          </div>
        )}

        <footer className="text-center mt-12">
          <p 
            className="text-xs uppercase tracking-widest"
            style={{ color: '#CCCCCC', fontWeight: 500 }}
          >
            Supports 1700+ sites
          </p>
        </footer>
      </div>
    </div>
  )
}

export default App