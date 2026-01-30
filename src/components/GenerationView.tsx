import { Loader2, Wand2, CheckCircle, Download, RotateCcw } from 'lucide-react'
import { cn } from '../lib/utils'

interface GenerationViewProps {
  status: 'idle' | 'generating' | 'complete'
  progress: number
  selectedVersionName?: string
  onDownload: () => void
  onReset: () => void
}

export function GenerationView({ 
  status, 
  progress, 
  selectedVersionName,
  onDownload,
  onReset 
}: GenerationViewProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="card text-center">
        {/* Animated Icon */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          {/* Outer ring */}
          <div className={cn(
            "absolute inset-0 rounded-full border-4 border-muted",
            status === 'generating' && "border-t-primary animate-spin"
          )} />
          
          {/* Inner circle */}
          <div className={cn(
            "absolute inset-4 rounded-full flex items-center justify-center transition-all duration-500",
            status === 'idle' && "bg-muted",
            status === 'generating' && "bg-primary/20 shadow-glow-primary",
            status === 'complete' && "bg-success/20 shadow-glow-success"
          )}>
            {status === 'idle' && <Wand2 className="w-12 h-12 text-muted-foreground" />}
            {status === 'generating' && <Loader2 className="w-12 h-12 text-primary animate-spin" />}
            {status === 'complete' && <CheckCircle className="w-12 h-12 text-success" />}
          </div>

          {/* Progress ring (when generating) */}
          {status === 'generating' && (
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeDasharray={`${progress * 2.89} 289`}
                className="transition-all duration-300"
              />
            </svg>
          )}
        </div>

        {/* Status Text */}
        <h2 className={cn(
          "font-display font-bold text-2xl mb-2",
          status === 'complete' && "text-glow"
        )}>
          {status === 'idle' && '准备生成'}
          {status === 'generating' && '正在生成 DJ 版本...'}
          {status === 'complete' && '生成完成！'}
        </h2>
        
        <p className="text-muted-foreground mb-6">
          {status === 'idle' && `已选择「${selectedVersionName}」风格，点击下方按钮开始生成完整版本`}
          {status === 'generating' && (
            <>
              AI 正在为您的音乐添加专业 DJ 混音效果
              <br />
              <span className="text-primary font-medium">{progress}%</span>
            </>
          )}
          {status === 'complete' && '您的 DJ 混音版本已准备就绪，可以下载或重新生成'}
        </p>

        {/* Progress bar (when generating) */}
        {status === 'generating' && (
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-6">
            <div 
              className="h-full bg-gradient-primary progress-glow transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Generation steps */}
        {status === 'generating' && (
          <div className="flex justify-center gap-6 mb-6 text-sm">
            {[
              { label: '分析音频', done: progress > 20 },
              { label: '节拍匹配', done: progress > 40 },
              { label: '添加效果', done: progress > 60 },
              { label: '混音处理', done: progress > 80 },
              { label: '输出文件', done: progress === 100 },
            ].map((step, i) => (
              <div key={i} className={cn(
                "flex items-center gap-1 transition-colors",
                step.done ? "text-success" : "text-muted-foreground"
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  step.done ? "bg-success" : "bg-muted"
                )} />
                {step.label}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          {status === 'complete' ? (
            <>
              <button onClick={onDownload} className="btn-primary flex items-center gap-2">
                <Download className="w-5 h-5" />
                下载 DJ 版本
              </button>
              <button onClick={onReset} className="btn-secondary flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                重新生成
              </button>
            </>
          ) : status === 'idle' ? (
            <button onClick={onDownload} className="btn-primary flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              开始生成完整版
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
