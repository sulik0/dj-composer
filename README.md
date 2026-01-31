# DJ Composer - AI 驱动的 DJ 音乐生成应用

DJ Composer 是一款基于 AI 技术的 DJ 音乐生成工具，旨在帮助用户快速将原始音乐文件转换为多种风格的 DJ 混音版本。用户只需上传一段原始音轨，系统即可自动分析并生成多个不同流派的试听片段，供用户选择并最终生成完整的 DJ 作品。

## 核心功能

- **智能上传**：支持上传原始音乐文件，并可选上传“参照音乐”以辅助 AI 定向学习特定 DJ 风格。
- **多风格生成**：AI 自动生成多种 DJ 流派（如 House, Techno, Trance, Drum & Bass 等）的试听片段。
- **实时预览**：内置音频播放器，用户可以即时试听生成的各版本 30 秒预览片段。
- **高品质交付**：用户在选定心仪版本后，系统将生成高保真的完整 DJ 音轨。

## 技术栈

- **前端框架**：React 18
- **构建工具**：Vite
- **样式处理**：Tailwind CSS
- **图标库**：Lucide React
- **编程语言**：TypeScript

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建项目

```bash
npm run build
```

## 后端与任务队列

后端处理需要 Redis、FFmpeg、Demucs 与 ElevenLabs API。

### 环境变量

```bash
# OSS
export OSS_ENDPOINT="https://oss-cn-xxx.aliyuncs.com"
export OSS_BUCKET="your-bucket"
export OSS_ACCESS_KEY_ID="xxx"
export OSS_ACCESS_KEY_SECRET="xxx"
export OSS_PUBLIC_BASE_URL="https://your-bucket.oss-cn-xxx.aliyuncs.com"

# Redis
export REDIS_URL="redis://localhost:6379/0"

# ElevenLabs
export ELEVENLABS_API_KEY="xxx"
```

### 启动后端

```bash
python -m backend.main
```

### 启动 Worker

```bash
python -m backend.worker
```

> 需要系统已安装 ffmpeg，且可执行 `demucs` 命令。

## 项目结构

```
.
├── src/
│   ├── components/    # UI 组件（播放器、上传区、版本卡片等）
│   ├── lib/           # 工具函数与共享逻辑
│   ├── App.tsx        # 应用主入口与状态管理
│   └── main.tsx       # 挂载点
├── tailwind.config.ts # 样式配置
└── vite.config.ts     # 构建配置
```

---

*由 DJ Composer 团队开发，助力您的音乐创作旅程。*
