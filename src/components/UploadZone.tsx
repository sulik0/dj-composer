import { useCallback } from 'react'
import { Upload, Music, X, Check } from 'lucide-react'
import { cn, formatFileSize } from '../lib/utils'

interface UploadZoneProps {
  label: string
  description: string
  accept?: string
  file: File | null
  onFileSelect: (file: File | null) => void
  variant?: 'primary' | 'secondary'
  optional?: boolean
}

export function UploadZone({ 
  label, 
  description, 
  accept = 'audio/*', 
  file, 
  onFileSelect,
  variant = 'primary',
  optional = false
}: UploadZoneProps) {
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('audio/')) {
      onFileSelect(droppedFile)
    }
  }, [onFileSelect])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      onFileSelect(selectedFile)
    }
  }

  const isPrimary = variant === 'primary'

  if (file) {
    return (
      <div className={cn(
        "card relative overflow-hidden",
        isPrimary ? "border-primary/50 bg-primary/5" : "border-accent/50 bg-accent/5"
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            isPrimary ? "bg-primary/20" : "bg-accent/20"
          )}>
            <Music className={cn("w-6 h-6", isPrimary ? "text-primary" : "text-accent")} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{file.name}</p>
            <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              isPrimary ? "bg-primary" : "bg-accent"
            )}>
              <Check className="w-4 h-4 text-background" />
            </div>
            <button
              onClick={() => onFileSelect(null)}
              className="btn-ghost p-2 hover:text-destructive"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <label
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={cn(
        "card cursor-pointer group transition-all duration-300",
        "border-dashed border-2 hover:border-solid",
        isPrimary 
          ? "hover:border-primary hover:shadow-glow-primary" 
          : "hover:border-accent hover:shadow-glow-accent"
      )}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300",
          "bg-muted group-hover:scale-110",
          isPrimary ? "group-hover:bg-primary/20" : "group-hover:bg-accent/20"
        )}>
          <Upload className={cn(
            "w-8 h-8 transition-colors",
            isPrimary ? "group-hover:text-primary" : "group-hover:text-accent"
          )} />
        </div>
        <h3 className="font-display font-semibold text-lg mb-1">
          {label}
          {optional && <span className="text-muted-foreground font-normal text-sm ml-2">(可选)</span>}
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs">{description}</p>
        <p className="text-muted-foreground/60 text-xs mt-3">支持 MP3, WAV, FLAC, AAC</p>
      </div>
    </label>
  )
}
