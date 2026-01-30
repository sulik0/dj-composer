import { Play, Pause, Check, Sparkles, Zap, Waves, Flame } from 'lucide-react'
import { cn } from '../lib/utils'
import { useRef, useEffect } from 'react'

export interface DJVersion {
  id: string
  name: string
  description: string
  icon: 'sparkles' | 'zap' | 'waves' | 'flame'
  bpm: number
  style: string
  previewUrl?: string
}

interface VersionCardProps {
  version: DJVersion
  isSelected: boolean
  isPlaying: boolean
  previewSrc?: string
  onSelect: () => void
  onPlayToggle: () => void
}

const iconMap = {
  sparkles: Sparkles,
  zap: Zap,
  waves: Waves,
  flame: Flame,
}

const styleColors: Record<string, string> = {
  house: 'from-purple-500 to-pink-500',
  techno: 'from-cyan-500 to-blue-500',
  trance: 'from-blue-500 to-purple-500',
  'drum-n-bass': 'from-orange-500 to-red-500',
}

export function VersionCard({ version, isSelected, isPlaying, previewSrc, onSelect, onPlayToggle }: VersionCardProps) {
  const Icon = iconMap[version.icon]
  const gradientClass = styleColors[version.style] || 'from-primary to-accent'
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && previewSrc) {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e))
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying, previewSrc])

  return (
    <div
      className={cn(
        "card-interactive relative overflow-hidden",
        isSelected && "border-primary shadow-glow-primary"
      )}
    >
      {previewSrc && <audio ref={audioRef} src={previewSrc} loop={false} onEnded={onPlayToggle} />}
      {/* Background gradient decoration */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2",
        `bg-gradient-to-br ${gradientClass}`
      )} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            `bg-gradient-to-br ${gradientClass}`
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          
          {isSelected && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              <Check className="w-3 h-3" />
              已选择
            </div>
          )}
        </div>

        {/* Info */}
        <h3 className="font-display font-semibold text-lg mb-1">{version.name}</h3>
        <p className="text-muted-foreground text-sm mb-4">{version.description}</p>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-display font-bold text-glow">{version.bpm}</span>
            <span className="text-muted-foreground text-xs uppercase">BPM</span>
          </div>
          <div className={cn(
            "px-2 py-1 rounded-md text-xs font-medium capitalize",
            `bg-gradient-to-r ${gradientClass} text-white`
          )}>
            {version.style.replace('-', ' & ')}
          </div>
        </div>

        {/* Mini waveform */}
        <div className="flex items-center gap-0.5 h-8 mb-4">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-all duration-150",
                isPlaying ? `bg-gradient-to-t ${gradientClass} equalizer-bar` : "bg-muted-foreground/30"
              )}
              style={{
                height: isPlaying ? `${Math.random() * 24 + 8}px` : '8px',
                animationDelay: `${i * 0.03}s`,
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPlayToggle()
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all duration-300",
              isPlaying 
                ? `bg-gradient-to-r ${gradientClass} text-white shadow-lg` 
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                暂停试听
              </>
            ) : (
              <>
                <Play className="w-4 h-4 ml-0.5" />
                试听 30 秒
              </>
            )}
          </button>
          
          <button
            onClick={onSelect}
            className={cn(
              "px-4 py-3 rounded-xl font-medium transition-all duration-300",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:border-primary hover:text-primary"
            )}
          >
            {isSelected ? '已选' : '选择'}
          </button>
        </div>
      </div>
    </div>
  )
}
