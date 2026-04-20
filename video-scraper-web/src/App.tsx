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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-center mb-8">Universal Video Downloader</h1>
        
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste video URL here..."
            className="flex-1 p-3 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={fetchInfo}
            disabled={loading || !url}
            className="px-6 py-3 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Get Info
          </button>
        </div>

        {error && (
          <div className="text-red-400 mb-4 p-3 bg-red-900/20 rounded">{error}</div>
        )}

        {loading && !videoInfo && (
          <div className="text-center text-gray-400 mb-4">Loading...</div>
        )}

        {videoInfo && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="flex gap-4 mb-4">
              <img 
                src={videoInfo.thumbnail} 
                alt={videoInfo.title} 
                className="w-48 h-28 object-cover rounded" 
              />
              <div className="flex-1">
                <h2 className="font-bold text-lg mb-1 line-clamp-2">{videoInfo.title}</h2>
                <p className="text-gray-400 text-sm">{videoInfo.uploader}</p>
                <p className="text-gray-400 text-sm">{formatDuration(videoInfo.duration)}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="p-2 bg-gray-700 rounded flex-1"
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
                className="px-6 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Processing...' : 'Download'}
              </button>
            </div>
          </div>
        )}

        <div className="text-center text-gray-500 text-sm">
          Supports YouTube, Instagram, Facebook, Twitter, TikTok, Reddit, Vimeo, and more
        </div>
      </div>
    </div>
  )
}

export default App