import { Disc3, Music2 } from 'lucide-react'
import { cn } from '../lib/utils'

interface HeaderProps {
  step: number
}

export function Header({ step }: HeaderProps) {
  const steps = [
    { num: 1, label: '上传音乐' },
    { num: 2, label: '选择风格' },
    { num: 3, label: '生成完整版' },
  ]

  return (
    <header className="glass sticky top-0 z-50 border-b border-border/50">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Disc3 className="w-10 h-10 text-primary vinyl-spinning" />
              <Music2 className="w-4 h-4 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-glow">DJ Composer</h1>
              <p className="text-xs text-muted-foreground">智能 DJ 混音生成器</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="hidden md:flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
                  step === s.num && "bg-primary/20 text-primary",
                  step > s.num && "text-success",
                  step < s.num && "text-muted-foreground"
                )}>
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    step === s.num && "bg-primary text-primary-foreground shadow-glow-primary",
                    step > s.num && "bg-success text-background",
                    step < s.num && "bg-muted"
                  )}>
                    {step > s.num ? '✓' : s.num}
                  </div>
                  <span className="text-sm font-medium">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn(
                    "w-8 h-0.5 mx-1",
                    step > s.num ? "bg-success" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
