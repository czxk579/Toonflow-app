# Toonflow-app × 优云智算 ModelVerse 集成指南（v1.0 / 2026-09-28）

> 目标：把 HBAI-Ltd/Toonflow-app 的「官方模型平台」算力替换为优云智算 ModelVerse，按量付费、单 API Key 直连，把单集 5 分钟漫剧成本从 ¥500–1500 降到约 ¥50。

## 一、整体判断

### 1.1 Toonflow 供应商机制（已读源码确认）

Toonflow 把"模型供应商"抽象成两类文件，**互不重叠**：

| 类型 | 路径 | 注册方式 | 实现方式 |
| --- | --- | --- | --- |
| **媒体供应商**（图/视频/音频） | `<data-dir>/providers/{id}.ts` | 设置页面 → 媒体模型 → 添加供应商（粘贴 TS 全文保存） | 必须显式实现 `generateImage / generateVideo / generateAudio` |
| **文本供应商** | `packages/providers/src/language/{id}.ts` | **必须修改源码后重新构建**（`packages/providers/index.ts` 数组写死） | 只需声明 `apiUrl + protocol: "openai-completions"`，Toonflow 自动按 OpenAI 协议调 |

源码验证位置：

- 供应商解析与文件校验：`apps/server/src/utils/media/provider.ts:71-119`
- 注入沙盒（VM、AbortSignal、fetch）：`apps/server/src/utils/media/provider.ts:258-296`
- 协议定义（`ProviderDefinition`、`MediaInput`、`MediaAsset`）：`packages/providers/types.d.ts:1-192`
- 文本供应商注册：`packages/providers/index.ts:13`
- 媒体供应商热加载：`apps/server/src/router.ts:66-70`（`/api/providers/media/{add,list,save,delete,models}`）

### 1.2 ModelVerse API 协议（已实测端点可达）

| 类型 | 端点 | 形态 |
| --- | --- | --- |
| 文本 | `POST /v1/chat/completions` | 同步，OpenAI 兼容 |
| 图片 | `POST /v1/images/generations` | 同步/异步混用，部分模型只返回 `task_id` |
| 视频 | `POST /v1/tasks/submit` → `GET /v1/tasks/status?task_id=xxx` | 异步 |
| 语音 | `POST /v1/audio/speech` | 同步，返回二进制音频 |
| 模型清单 | `GET /v1/models` | 返回 `{ data: [...] }`，与 Toonflow `refreshMediaProviderModels` 期望完全一致 |

API Key 获取：优云智算控制台 → 「模型 API 服务」→ 创建（**与 GPU 实例管理的 public/private_key 是两套不同凭证，不要混用**）。

### 1.3 推荐模型（按单集 5 分钟漫剧的成本/质量取舍）

| 用途 | 模型 | 单价 | 推荐理由 |
| --- | --- | --- | --- |
| **剧本/对话主力** | `deepseek-v4-flash-sg` | ¥1.5/¥3 /MTok（输入/输出） | 比 deepseek-v3 更稳，按 100k token 算 ~¥0.45 |
| **多模态理解** | `qwen3-vl-flash` | ¥0.15/¥1.5 /MTok | 看图生提示词、解析分镜 |
| **经济批量** | `doubao-seed-2-0-mini-260215` | ¥0.2/¥2 /MTok | 大纲/批量改写 |
| **分镜/角色（主力）** | `qwen-image-3.0` | ¥0.02/张 | 几乎免费，风格稳定 |
| **分镜/角色（备用）** | `doubao-seedream-5-0-pro-260628` | ¥0.02/张 | 中文 prompt 顺 |
| **视频（性价比首选）** | `wan2.6-r2v-flash` | ¥0.15/s（首尾帧） | 5 秒片段仅 ¥0.75 |
| **视频（质量档）** | `wan2.7-i2v` | ¥0.6/s | 2.7 版本，1080p |
| **视频（顶配）** | `wan3.0-video` | ¥0.3–1.2/s | Wan3.0 出片 |
| **TTS 配音** | `speech-2.8-hd` | ¥0.00035/字 | HD 音质，10 分钟台词 ~¥4 |
| **TTS 廉价** | `qwen3-tts-flash` | ¥0.00008/字 | 量大便宜 |

**单集 5 分钟成本估算（60 段 5 秒镜头 + 100 张图 + 8000 字脚本 + 10 分钟配音）：**

- 脚本：`deepseek-v4-flash-sg` ~¥0.5
- 100 张分镜图：`qwen-image-3.0` 100 × ¥0.02 = **¥2**
- 60 段 5 秒视频：`wan2.6-r2v-flash` 60 × 5 × ¥0.15 = **¥45**
- TTS 8000 字：`speech-2.8-hd` 8000 × ¥0.00035 = **¥2.8**
- **合计约 ¥50/集**（官方案例 ¥130 ÷ 官方中转，¥1300 ÷ 第三方散买）

---

## 二、端到端步骤清单

### Step 0 · 准备 API Key
1. 打开 https://console.compshare.cn/uaccount/api_manage ，「模型 API 服务」创建 Key（**不要选 GPU 实例 API 密钥**）。
2. 充值 ¥10 起步（按量扣费）。

### Step 1 · 本地克隆仓库
```bash
git clone https://github.com/czxk579/Toonflow-app.git   # 你的 fork
cd Toonflow-app
```
目录结构：
```
Toonflow-app/
├── apps/server/                # Toonflow 服务端
├── apps/web/                   # 前端
├── packages/providers/         # 内置供应商源
│   └── src/
│       ├── language/           # 文本供应商（需编译）
│       └── media/              # 媒体供应商（运行时上传）
└── compshare-integration/      # 本次新增：交付物
    ├── compshareMedia.ts
    ├── compshareLanguage.ts
    ├── index.ts.patch
    └── INTEGRATION.md
```

### Step 2 · 通过 Docker 部署（macOS）
```bash
# 安装 Docker Desktop for Mac 并切换到 Linux 容器模式
docker compose up -d --build
docker compose logs -f toonflow   # 等到「服务启动成功」
```
访问 http://127.0.0.1:3000 ，首次启动会创建 `toonflowData` 命名卷（**绝对不要 `docker compose down -v`**）。

### Step 3 · 安装文本供应商（必须改源码 + 重建）
**3.1 复制语言供应商文件**
```bash
cp compshare-integration/compshareLanguage.ts \
   packages/providers/src/language/compshareLanguage.ts
```
**3.2 应用 index.ts 补丁（注册新供应商）**
```bash
cd /Users/chen/AIPrograms/Toonflow-app
patch -p1 < compshare-integration/index.ts.patch
# 或手动编辑 packages/providers/index.ts：
#   import compshareLanguage from "./src/language/compshareLanguage";
#   languageProviders = [tfRouterLanguage, compshareLanguage, deepSeek]
```
**3.3 重新构建并重启**
```bash
docker compose down           # 停容器（保留数据卷）
docker compose up -d --build   # 重建镜像
docker compose logs -f toonflow
```
**3.4 在页面内启用**
- 设置 → 文本模型 → 选择「优云智算 ModelVerse（文本）」
- 填入 API Key → 保存
- 选择 `deepseek-v4-flash-sg` 作为默认剧本模型

### Step 4 · 安装媒体供应商（运行时上传，不用重启）
1. 打开 `compshare-integration/compshareMedia.ts` → 选中全文复制
2. Toonflow 页面 → 设置 → 媒体模型 → 添加供应商
3. 把全文粘贴到「上传 TypeScript 文件」对话框 → 保存
4. 列表出现「优云智算 ModelVerse」→ 点编辑 → 填入 API Key → 保存
5. 点「获取模型」按钮 → Toonflow 会调用 `https://api.modelverse.cn/v1/models?type=video` 拉模型清单
6. 列表中出现的模型（已硬编码 7 个常用项）即可在画布里调用

### Step 5 · 配置工作流（在画布上跑通首集）

#### 5.1 建立项目
- 「选择服务器工作目录」→ 选 `myProject`（或新建子目录）

#### 5.2 文本侧（先有剧本）
- 画布里拖入一个 **「剧本/灵感」节点** → 提示词：「写一段 5 分钟漫剧第一集大纲，主角是 XX，剧情是 XX」
- 节点右上角选模型：`优云智算 ModelVerse（文本） / deepseek-v4-flash-sg`
- 生成 → 拿到大纲后继续细化每一场戏

#### 5.3 角色资产
- 画布里拖入「角色三视图」节点（characterImageGeneration.png 类似面板）
- 模型选：`优云智算 / qwen-image-3.0`，尺寸 1K，比例 1:1
- 出图后保存为「角色资产」节点，后续每个镜头都引用这张角色图保持一致性

#### 5.4 场景资产
- 同上用 `qwen-image-3.0` 生成场景图，单图模式（`mode: "text"`）

#### 5.5 镜头（首→尾帧生视频，最便宜）
- 拖入「多参考素材视频生成」节点
- 模型选：`wan2.6-r2v-flash`（¥0.15/s）—— 漫画镜头通常 5 秒就够
- 引用刚生成的「角色资产」+「场景资产」两张图分别作为首帧/尾帧
- 分辨率 720p，时长 5s
- 60 个镜头约 ¥45

#### 5.6 配音
- 单独跑 TTS：`compshareMedia / speech-2.8-hd`，对每场对白生成 mp3
- 拼到视频时间线上

#### 5.7 后期合成
- 用画布里集成的 FFmpeg 节点把画面 + 配音合成成片
- 输出 mp4

### Step 6 · Bug 排查流程（贡献回你的 fork）
源码阅读 + 修改期间大概率会遇到两类 bug：

1. **UI 上传 TS 文件报错**（"供应商对象和模型配置不能使用展开或计算属性"等）
   → 用 `npx tsc --noEmit --target esnext --module esnext --moduleResolution bundler compshare-integration/compshareMedia.ts` 自查表达式是否合规
2. **生成时报"未返回任务 ID"或超时**
   → 打开浏览器 DevTools → Network → 看实际请求体与响应
   → 用 `curl -X POST .../v1/tasks/submit -H "Authorization: Bearer $KEY" -d '{...}'` 复现，对照文档 https://www.compshare.cn/docs/modelverse/models/quick-start 调整字段

提交：
```bash
git checkout -b feat/compshare-integration
git add packages/providers/src/language/compshareLanguage.ts \
        packages/providers/index.ts \
        compshare-integration/
git commit -m "feat(providers): add 优云智算 ModelVerse 供应商适配"
git push origin feat/compshare-integration
```
如果要回到上游 PR，先在 https://github.com/HBAI-Ltd/Toonflow-app 提 Issue 同步需求。

---

## 三、避坑清单

| 现象 | 根因 | 解决 |
| --- | --- | --- |
| 上传 `compshareMedia.ts` 报"未通过 TypeScript 语法检查" | 包含 import / 展开 / 计算属性 | 删除所有 `import`、把 `${expr}` 换成字面量字符串 |
| 添加供应商后点"获取模型"返回 401 | 把 GPU 实例的 public/private_key 填成了模型 API Key | 重新到「模型 API 服务」取 Key |
| 视频生成一直等待，最终超时 | 旧适配器读取 `status`，实际状态为 `output.task_status`；结果地址为 `output.urls`，失败原因为 `output.error_message` | 更新 `compshareMedia.ts` 至 1.0.1 或更新版本，并同步更新数据卷内 `providers/compshareMedia.ts`；仅重建镜像不会覆盖已安装的供应商 |
| 生成图片分辨率异常 | ModelVerse 部分模型对 size 参数不敏感 | 改用 `ratio` 字段（`16:9` / `9:16`），`size` 留空 |
| TTS 返回空音频 | voice 参数不被该模型接受 | 切换模型（如 `qwen3-tts-flash` 改用 `Cherry`/`Ethan`） |
| 文本供应商不显示在列表 | 没在 `packages/providers/index.ts` 注册或没重建 | 重新 `docker compose build` |

---

## 四、扩展：何时该切到 GPU 实例直跑

Compshare 的另一条路是开 GPU 实例自己跑 ComfyUI：

- ¥3–8/小时，按需启停，跑完就销毁
- 适合：长视频、首尾帧精度极致要求、LoRA 训练角色一致性
- 不适合：每次只跑几个素材（启动成本占比太高）

本次默认走 ModelVerse API 的方案覆盖了 80% 用例；只有当某一类资产质量/成本明显不如自托管时才升级到 GPU 实例。建议先用 API 跑通首集，**确认每集成本结构**，再决定要不要长期挂 GPU。

---

## 五、文件清单（已交付到 `compshare-integration/`）

| 文件 | 用途 | 安装位置 |
| --- | --- | --- |
| `compshareMedia.ts` | 媒体供应商（运行时上传） | 设置 → 媒体模型 → 添加供应商 |
| `compshareLanguage.ts` | 文本供应商（需编译） | `packages/providers/src/language/compshareLanguage.ts` |
| `index.ts.patch` | 注册新语言供应商 | `packages/providers/index.ts` |
| `INTEGRATION.md` | 本指南 | — |
