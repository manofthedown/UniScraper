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
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F5' }}>
      <div className="max-w-xl mx-auto px-6 py-16">
        <h1 
          className="text-3xl font-medium text-center mb-10" 
          style={{ color: '#1A1A1A', fontWeight: 400, letterSpacing: '-0.5px' }}
        >
          Universal Video Downloader
        </h1>
        
        <div className="flex gap-3 mb-8">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Paste video URL here..."
            className="flex-1 px-4 py-3 rounded-lg bg-white border"
            style={{ 
              borderColor: '#E5E5E5',
              color: '#1A1A1A',
              fontSize: '15px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          />
          <button
            onClick={fetchInfo}
            disabled={loading || !url}
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200"
            style={{ 
              backgroundColor: '#2D2D2D', 
              color: 'white',
              opacity: loading || !url ? 0.5 : 1,
              cursor: loading || !url ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Get Info'}
          </button>
        </div>

        {error && (
          <div 
            className="mb-6 p-4 rounded-lg text-sm"
            style={{ 
              backgroundColor: '#FEF2F2', 
              color: '#DC2626',
              border: '1px solid #FECACA'
            }}
          >
            {error}
          </div>
        )}

        {videoInfo && (
          <div 
            className="bg-white rounded-xl p-5 mb-8"
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          >
            <div className="flex gap-5 mb-5">
              <img 
                src={videoInfo.thumbnail} 
                alt={videoInfo.title} 
                className="w-44 h-28 object-cover rounded-lg flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h2 
                  className="font-medium text-base mb-2 line-clamp-2" 
                  style={{ color: '#1A1A1A', lineHeight: 1.4 }}
                >
                  {videoInfo.title}
                </h2>
                <p 
                  className="text-sm mb-1" 
                  style={{ color: '#6B6B6B' }}
                >
                  {videoInfo.uploader}
                </p>
                <p 
                  className="text-sm" 
                  style={{ color: '#6B6B6B' }}
                >
                  {formatDuration(videoInfo.duration)}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-lg text-sm"
                style={{ 
                  backgroundColor: '#FAFAFA', 
                  border: '1px solid #E5E5E5',
                  color: '#1A1A1A'
                }}
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
                className="px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
                style={{ 
                  backgroundColor: '#2D2D2D', 
                  color: 'white',
                  opacity: loading ? 0.5 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Processing...' : 'Download'}
              </button>
            </div>
          </div>
        )}

        <div 
          className="text-center text-sm"
          style={{ color: '#9CA3AF' }}
        >
          Supports YouTube, Instagram, Facebook, Twitter, TikTok, Reddit, Vimeo, and more
        </div>
      </div>
    </div>
  )
}

export default App