import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Header } from './components/Header'
import { UploadZone } from './components/UploadZone'
import { VersionCard, type DJVersion } from './components/VersionCard'
import { GenerationView } from './components/GenerationView'
import { AudioPlayer } from './components/AudioPlayer'
import { cn } from './lib/utils'

const djVersions: DJVersion[] = [
  {
    id: 'house',
    name: 'House Vibes',
    description: '经典 House 风格，四四拍律动，适合派对氛围',
    icon: 'sparkles',
    bpm: 124,
    style: 'house',
  },
  {
    id: 'techno',
    name: 'Techno Drive',
    description: '硬核 Techno 节奏，强劲鼓点，适合地下俱乐部',
    icon: 'zap',
    bpm: 138,
    style: 'techno',
  },
  {
    id: 'trance',
    name: 'Trance Journey',
    description: '迷幻 Trance 氛围，层层递进的旋律升华',
    icon: 'waves',
    bpm: 140,
    style: 'trance',
  },
  {
    id: 'dnb',
    name: 'Drum & Bass',
    description: '高速 D&B 节奏，碎拍鼓组，能量爆发',
    icon: 'flame',
    bpm: 174,
    style: 'drum-n-bass',
  },
]

function App() {
  const [step, setStep] = useState(1)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [styleText, setStyleText] = useState('')
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'complete'>('idle')
  const [generationProgress, setGenerationProgress] = useState(0)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [finalFileUrl, setFinalFileUrl] = useState<string | null>(null)
  const [generationJobId, setGenerationJobId] = useState<string | null>(null)

  const API_BASE = 'http://localhost:8000'

  useEffect(() => {
    if (generationStatus === 'generating' && generationJobId) {
      const interval = setInterval(() => {
        fetch(`${API_BASE}/tasks/status/${generationJobId}`)
          .then(res => res.json())
          .then(data => {
            if (data.status === 'failed') {
              console.error('Generation failed:', data.error)
              setGenerationStatus('idle')
              clearInterval(interval)
              return
            }
            if (typeof data.progress === 'number') {
              setGenerationProgress(data.progress)
            }
            if (data.status === 'finished' && data.output_url) {
              setFinalFileUrl(data.output_url)
              setGenerationProgress(100)
              setGenerationStatus('complete')
              clearInterval(interval)
            }
          })
          .catch(error => {
            console.error('Status polling failed:', error)
          })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [generationStatus, generationJobId, API_BASE])

  const canProceedToStep2 = originalFile !== null && styleText.trim().length > 0
  const canProceedToStep3 = selectedVersion !== null

  const handleProceedToStep3 = () => {
    if (canProceedToStep3) {
      setStep(3)
      setGenerationStatus('idle')
      setGenerationProgress(0)
      setGenerationJobId(null)
    }
  }

  const handleStartGeneration = async () => {
    setGenerationStatus('generating')
    setGenerationProgress(0)

    try {
      const version = djVersions.find(v => v.id === selectedVersion)
      const response = await fetch(`${API_BASE}/tasks/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_url: originalUrl,
          reference_url: referenceUrl,
          style_text: styleText,
          preset_style: version?.style || undefined,
          output_format: 'mp3',
        }),
      })
      const data = await response.json()
      setGenerationJobId(data.task_id)
    } catch (error) {
      console.error('Generation failed:', error)
      setGenerationStatus('idle')
    }
  }

  const handleDownload = () => {
    if (finalFileUrl) {
      const link = document.createElement('a')
      link.href = finalFileUrl
      link.download = `dj_remix_${selectedVersion || 'mix'}.mp3`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleReset = () => {
    setStep(1)
    setOriginalFile(null)
    setReferenceFile(null)
    setStyleText('')
    setSelectedVersion(null)
    setGenerationStatus('idle')
    setGenerationProgress(0)
    setOriginalUrl(null)
    setReferenceUrl(null)
    setFinalFileUrl(null)
    setGenerationJobId(null)
  }

  const signUpload = async (file: File) => {
    const response = await fetch(`${API_BASE}/upload/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, content_type: file.type || 'application/octet-stream' }),
    })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.detail || '上传签名失败')
    }
    return response.json()
  }

  const putUpload = async (uploadUrl: string, headers: Record<string, string>, file: File) => {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
    })
    if (!res.ok) {
      throw new Error('上传到存储失败')
    }
  }

  const handleProceedToStep2 = async () => {
    if (canProceedToStep2 && originalFile) {
      setIsUploading(true)
      try {
        const originalSigned = await signUpload(originalFile)
        await putUpload(originalSigned.upload_url, originalSigned.headers, originalFile)
        setOriginalUrl(originalSigned.file_url)

        if (referenceFile) {
          const referenceSigned = await signUpload(referenceFile)
          await putUpload(referenceSigned.upload_url, referenceSigned.headers, referenceFile)
          setReferenceUrl(referenceSigned.file_url)
        } else {
          setReferenceUrl(null)
        }

        setStep(2)
      } catch (error) {
        console.error('Upload failed:', error)
        alert('上传失败，请检查后端服务是否启动')
      } finally {
        setIsUploading(false)
      }
    }
  }

  const selectedVersionData = djVersions.find(v => v.id === selectedVersion)

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      <Header step={step} />

      <main className="relative max-w-6xl mx-auto px-6 py-12">
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center mb-12">
              <h2 className="font-display font-bold text-4xl mb-4 text-glow">上传你的音乐</h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                上传原始音乐与风格描述，系统将自动生成 DJ Remix
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <UploadZone
                label="上传原始音乐"
                description="这是你想要转换成 DJ 版本的音乐文件"
                file={originalFile}
                onFileSelect={setOriginalFile}
                variant="primary"
              />
              <UploadZone
                label="上传参照音乐"
                description="可选：上传一首 DJ 音乐作为风格参考"
                file={referenceFile}
                onFileSelect={setReferenceFile}
                variant="secondary"
                optional
              />
            </div>

            {originalFile && (
              <div className="max-w-md mx-auto mt-8">
                <div className="card">
                  <AudioPlayer src={URL.createObjectURL(originalFile)} title={originalFile.name} subtitle="原始音频预览" />
                </div>
              </div>
            )}

            <div className="max-w-2xl mx-auto">
              <div className="card">
                <label className="block text-sm text-muted-foreground mb-2">风格描述</label>
                <textarea
                  value={styleText}
                  onChange={e => setStyleText(e.target.value)}
                  placeholder="例如：复古 House，温暖低频，带一点 Disco 氛围"
                  className="w-full min-h-[120px] bg-transparent border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <button
                onClick={handleProceedToStep2}
                disabled={!canProceedToStep2}
                className="btn-primary flex items-center gap-2 text-lg px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                <Sparkles className={cn('w-5 h-5', isUploading && 'animate-spin')} />
                {isUploading ? '正在上传...' : '生成 DJ 版本'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setStep(1)} className="btn-ghost flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                返回上传
              </button>
              <div className="text-center flex-1">
                <h2 className="font-display font-bold text-3xl mb-2">选择基础风格</h2>
                <p className="text-muted-foreground">系统会结合你的风格描述生成 Remix</p>
              </div>
              <div className="w-24" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {djVersions.map(version => (
                <VersionCard
                  key={version.id}
                  version={version}
                  isSelected={selectedVersion === version.id}
                  isPlaying={false}
                  previewSrc={undefined}
                  onSelect={() => setSelectedVersion(version.id)}
                  onPlayToggle={() => {}}
                  previewEnabled={false}
                />
              ))}
            </div>

            <div className="flex justify-center mt-8">
              <button
                onClick={handleProceedToStep3}
                disabled={!canProceedToStep3}
                className="btn-primary flex items-center gap-2 text-lg px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                生成完整版本
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center mb-8">
              <button onClick={() => setStep(2)} className="btn-ghost flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                返回选择
              </button>
            </div>

            <GenerationView
              status={generationStatus}
              progress={Math.min(generationProgress, 100)}
              selectedVersionName={selectedVersionData?.name}
              onDownload={generationStatus === 'complete' ? handleDownload : handleStartGeneration}
              onReset={handleReset}
            />
          </div>
        )}
      </main>

      <footer className="relative border-t border-border/50 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-muted-foreground text-sm">
          <p>DJ Composer - 让每首歌都能成为派对焦点</p>
        </div>
      </footer>
    </div>
  )
}

export default App
