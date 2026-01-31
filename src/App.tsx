import { useState, useEffect } from 'react'
import { ChevronRight, Sparkles, ArrowLeft } from 'lucide-react'
import { Header } from './components/Header'
import { UploadZone } from './components/UploadZone'
import { VersionCard, type DJVersion } from './components/VersionCard'
import { GenerationView } from './components/GenerationView'
import { AudioPlayer } from './components/AudioPlayer'
import { cn } from './lib/utils'

// Mock DJ versions for demo
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
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [playingVersion, setPlayingVersion] = useState<string | null>(null)
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'complete'>('idle')
  const [generationProgress, setGenerationProgress] = useState(0)
  const [fileId, setFileId] = useState<string | null>(null)
  const [referenceFileId, setReferenceFileId] = useState<string | null>(null)
  const [versionPreviews, setVersionPreviews] = useState<Record<string, string>>({})
  const [isUploading, setIsUploading] = useState(false)
  const [finalFileUrl, setFinalFileUrl] = useState<string | null>(null)
  const [generationJobId, setGenerationJobId] = useState<string | null>(null)
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false)

  const API_BASE = 'http://localhost:8000'

  // Poll backend job status for real progress
  useEffect(() => {
    if (generationStatus === 'generating' && generationJobId) {
      const interval = setInterval(() => {
        fetch(`${API_BASE}/process/status/${generationJobId}`)
          .then(res => res.json())
          .then(data => {
            if (data.status === 'error') {
              console.error('Generation failed:', data.error)
              setGenerationStatus('idle')
              clearInterval(interval)
              return
            }
            if (typeof data.progress === 'number') {
              setGenerationProgress(data.progress)
            }
            if (data.status === 'complete' && data.output_file) {
              setFinalFileUrl(`${API_BASE}/download/${data.output_file}`)
              setGenerationProgress(100)
              setGenerationStatus('complete')
              clearInterval(interval)
            }
          })
          .catch(error => {
            console.error('Status polling failed:', error)
          })
      }, 300)
      return () => clearInterval(interval)
    }
  }, [generationStatus, generationJobId, API_BASE])

  const canProceedToStep2 = originalFile !== null
  const canProceedToStep3 = selectedVersion !== null

  const handleProceedToStep3 = () => {
    if (canProceedToStep3) {
      setStep(3)
      setGenerationStatus('idle')
      setGenerationProgress(0)
      setGenerationJobId(null)
    }
  }

  const handleVersionPlay = async (versionId: string) => {
    if (playingVersion === versionId) {
      setPlayingVersion(null)
      return
    }

    if (!versionPreviews[versionId]) {
      try {
        const version = djVersions.find(v => v.id === versionId)
        const formData = new FormData()
        formData.append('file_id', fileId!)
        formData.append('style', version?.style || 'house')
        formData.append('target_bpm', version?.bpm.toString() || '124')
        formData.append('is_preview', 'true')
        if (referenceFileId) {
          formData.append('reference_file_id', referenceFileId)
        }

        const response = await fetch(`${API_BASE}/process/start`, {
          method: 'POST',
          body: formData,
        })
        const { job_id } = await response.json()
        const previewInterval = setInterval(async () => {
          const statusResponse = await fetch(`${API_BASE}/process/status/${job_id}`)
          const statusData = await statusResponse.json()
          if (statusData.status === 'complete' && statusData.output_file) {
            const previewUrl = `${API_BASE}/download/${statusData.output_file}`
            setVersionPreviews(prev => ({ ...prev, [versionId]: previewUrl }))
            setPlayingVersion(versionId)
            clearInterval(previewInterval)
          } else if (statusData.status === 'error') {
            console.error('Preview generation failed:', statusData.error)
            clearInterval(previewInterval)
          }
        }, 300)
      } catch (error) {
        console.error('Preview generation failed:', error)
      }
    } else {
      setPlayingVersion(versionId)
    }
  }

  const handleStartGeneration = async () => {
    setGenerationStatus('generating')
    setGenerationProgress(0)

    try {
      const version = djVersions.find(v => v.id === selectedVersion)
      const formData = new FormData()
      formData.append('file_id', fileId!)
      formData.append('style', version?.style || 'house')
      formData.append('target_bpm', version?.bpm.toString() || '124')
      formData.append('is_preview', 'false')
      if (referenceFileId) {
        formData.append('reference_file_id', referenceFileId)
      }

      const response = await fetch(`${API_BASE}/process/start`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      setGenerationJobId(data.job_id)
    } catch (error) {
      console.error('Generation failed:', error)
      setGenerationStatus('idle')
    }
  }

  const handleDownload = () => {
    if (finalFileUrl) {
      const link = document.createElement('a')
      link.href = finalFileUrl
      link.download = `dj_mix_${selectedVersion}.wav`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleReset = () => {
    setStep(1)
    setOriginalFile(null)
    setReferenceFile(null)
    setSelectedVersion(null)
    setPlayingVersion(null)
    setGenerationStatus('idle')
    setGenerationProgress(0)
    setFileId(null)
    setReferenceFileId(null)
    setVersionPreviews({})
    setFinalFileUrl(null)
    setGenerationJobId(null)
  }

  const handleProceedToStep2 = async () => {
    if (canProceedToStep2 && originalFile) {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', originalFile)
      if (referenceFile) {
        formData.append('reference_file', referenceFile)
      }
      
      try {
        const response = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          body: formData,
        })
        const data = await response.json()
        setFileId(data.file_id)
        setReferenceFileId(data.reference_file_id || null)
        setStep(2)
        setIsGeneratingPreviews(true)
        const styles = djVersions.map(v => v.style).join(',')
        const previewForm = new FormData()
        previewForm.append('file_id', data.file_id)
        previewForm.append('styles', styles)
        previewForm.append('is_preview', 'true')
        if (data.reference_file_id) {
          previewForm.append('reference_file_id', data.reference_file_id)
        }
        const previewResponse = await fetch(`${API_BASE}/process/batch`, {
          method: 'POST',
          body: previewForm,
        })
        const previewData = await previewResponse.json()
        const outputs = previewData.outputs || {}
        const previewUrls: Record<string, string> = {}
        djVersions.forEach(version => {
          if (outputs[version.style]) {
            previewUrls[version.id] = `${API_BASE}/download/${outputs[version.style]}`
          }
        })
        setVersionPreviews(previewUrls)
      } catch (error) {
        console.error('Upload failed:', error)
        alert('上传失败，请检查后端服务是否启动')
      } finally {
        setIsUploading(false)
        setIsGeneratingPreviews(false)
      }
    }
  }

  const selectedVersionData = djVersions.find(v => v.id === selectedVersion)

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      <Header step={step} />

      <main className="relative max-w-6xl mx-auto px-6 py-12">
        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center mb-12">
              <h2 className="font-display font-bold text-4xl mb-4 text-glow">
                上传你的音乐
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                上传原始音乐，AI 将自动分析并生成多种 DJ 混音版本供你选择
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

            {/* Original file player preview */}
            {originalFile && (
              <div className="max-w-md mx-auto mt-8">
                <div className="card">
                  <AudioPlayer
                    src={URL.createObjectURL(originalFile)}
                    title={originalFile.name}
                    subtitle="原始音频预览"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-center mt-8">
              <button
                onClick={handleProceedToStep2}
                disabled={!canProceedToStep2}
                className="btn-primary flex items-center gap-2 text-lg px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                <Sparkles className={cn("w-5 h-5", isUploading && "animate-spin")} />
                {isUploading ? '正在上传...' : '生成 DJ 版本'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Version */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={() => setStep(1)}
                className="btn-ghost flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                返回上传
              </button>
              <div className="text-center flex-1">
                <h2 className="font-display font-bold text-3xl mb-2">
                  选择你喜欢的风格
                </h2>
                <p className="text-muted-foreground">
                  试听每个版本的 30 秒预览，选择最满意的一个生成完整版
                </p>
                {isGeneratingPreviews && (
                  <p className="text-primary text-sm mt-2">正在生成全部预览...</p>
                )}
              </div>
              <div className="w-24" /> {/* Spacer for centering */}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {djVersions.map(version => (
                <VersionCard
                  key={version.id}
                  version={version}
                  isSelected={selectedVersion === version.id}
                  isPlaying={playingVersion === version.id}
                  previewSrc={versionPreviews[version.id]}
                  onSelect={() => setSelectedVersion(version.id)}
                  onPlayToggle={() => handleVersionPlay(version.id)}
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

        {/* Step 3: Generation */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center mb-8">
              <button 
                onClick={() => setStep(2)}
                className="btn-ghost flex items-center gap-2"
              >
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

      {/* Footer */}
      <footer className="relative border-t border-border/50 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-muted-foreground text-sm">
          <p>DJ Composer - 让每首歌都能成为派对焦点</p>
        </div>
      </footer>
    </div>
  )
}

export default App
