import { useState, useEffect } from 'react'
import { ChevronRight, Sparkles, ArrowLeft } from 'lucide-react'
import { Header } from './components/Header'
import { UploadZone } from './components/UploadZone'
import { VersionCard, type DJVersion } from './components/VersionCard'
import { GenerationView } from './components/GenerationView'
import { AudioPlayer } from './components/AudioPlayer'

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

  // Simulate generation progress
  useEffect(() => {
    if (generationStatus === 'generating') {
      const interval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 100) {
            setGenerationStatus('complete')
            clearInterval(interval)
            return 100
          }
          return prev + Math.random() * 8 + 2
        })
      }, 300)
      return () => clearInterval(interval)
    }
  }, [generationStatus])

  const canProceedToStep2 = originalFile !== null
  const canProceedToStep3 = selectedVersion !== null

  const handleProceedToStep2 = () => {
    if (canProceedToStep2) {
      setStep(2)
      // Simulate generating preview versions
    }
  }

  const handleProceedToStep3 = () => {
    if (canProceedToStep3) {
      setStep(3)
      setGenerationStatus('idle')
      setGenerationProgress(0)
    }
  }

  const handleStartGeneration = () => {
    setGenerationStatus('generating')
    setGenerationProgress(0)
  }

  const handleDownload = () => {
    // In real app, trigger download
    alert('下载功能将在后端集成后启用')
  }

  const handleReset = () => {
    setStep(1)
    setOriginalFile(null)
    setReferenceFile(null)
    setSelectedVersion(null)
    setPlayingVersion(null)
    setGenerationStatus('idle')
    setGenerationProgress(0)
  }

  const handleVersionPlay = (versionId: string) => {
    setPlayingVersion(playingVersion === versionId ? null : versionId)
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
                <Sparkles className="w-5 h-5" />
                生成 DJ 版本
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
