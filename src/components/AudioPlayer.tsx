import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { cn, formatTime } from '../lib/utils'

interface AudioPlayerProps {
  src?: string
  title: string
  subtitle?: string
  previewDuration?: number
  onEnded?: () => void
}

export function AudioPlayer({ src, title, subtitle, previewDuration, onEnded }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [onEnded])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // Stop at preview duration
  useEffect(() => {
    if (previewDuration && currentTime >= previewDuration) {
      audioRef.current?.pause()
      setIsPlaying(false)
    }
  }, [currentTime, previewDuration])

  const togglePlay = () => {
    if (!audioRef.current || !src) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const displayDuration = previewDuration || duration

  return (
    <div className="w-full">
      {src && <audio ref={audioRef} src={src} preload="metadata" />}
      
      {/* Waveform visualization */}
      <div className="flex items-center justify-center gap-1 h-16 mb-4">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1 rounded-full transition-all duration-150",
              isPlaying ? "bg-primary equalizer-bar" : "bg-muted-foreground/30",
              "h-2"
            )}
            style={{
              height: isPlaying ? `${Math.random() * 40 + 8}px` : '8px',
              animationDelay: `${i * 0.05}s`,
              opacity: i / 40 < currentTime / displayDuration ? 1 : 0.3,
            }}
          />
        ))}
      </div>

      {/* Track info */}
      <div className="text-center mb-4">
        <h3 className="font-display font-semibold text-lg">{title}</h3>
        {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
      </div>

      {/* Progress bar */}
      <div className="relative mb-4">
        <input
          type="range"
          min={0}
          max={displayDuration || 100}
          value={currentTime}
          onChange={seek}
          disabled={!src}
          className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                     [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
                     [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-glow-primary
                     [&::-webkit-slider-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) ${(currentTime / displayDuration) * 100}%, hsl(var(--muted)) ${(currentTime / displayDuration) * 100}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(displayDuration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button className="btn-ghost p-2" disabled={!src}>
          <SkipBack className="w-5 h-5" />
        </button>
        
        <button
          onClick={togglePlay}
          disabled={!src}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
            src 
              ? "bg-gradient-primary shadow-glow-primary hover:scale-110" 
              : "bg-muted cursor-not-allowed"
          )}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-primary-foreground" />
          ) : (
            <Play className="w-6 h-6 text-primary-foreground ml-1" />
          )}
        </button>
        
        <button className="btn-ghost p-2" disabled={!src}>
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="btn-ghost p-1"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={isMuted ? 0 : volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-24 h-1 bg-muted rounded-full appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                     [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full 
                     [&::-webkit-slider-thumb]:bg-accent"
        />
      </div>
    </div>
  )
}
