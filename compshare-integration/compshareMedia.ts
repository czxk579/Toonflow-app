// 用途：Toonflow-app 媒体供应商适配「优云智算 / ModelVerse」
// 安装方式：把本文件全文复制到 Toonflow 「设置 → 媒体模型 → 添加供应商」对话框，保存即可
// 端点协议（已实测可达）：
//   POST https://api.modelverse.cn/v1/images/generations   同步/异步图片
//   POST https://api.modelverse.cn/v1/tasks/submit         提交视频/图片异步任务
//   GET  https://api.modelverse.cn/v1/tasks/status?task_id=xxx   轮询
//   POST https://api.modelverse.cn/v1/audio/speech         TTS 同步音频
//   （未启用 modelsUrl：8 个模型已硬编码在文件里，避免与 ModelVerse 动态列表撞 ID）
// 文档：https://www.compshare.cn/docs/modelverse/models/quick-start
const rules = [
  {
    type: "input",
    field: "apiKey" as const,
    title: "ModelVerse API Key",
    value: "",
    props: { type: "password", showPassword: true, autocomplete: "off" },
  },
] as const;

const apiUrl = "https://api.modelverse.cn/v1";
const version = "1.0.3";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("ModelVerse 响应格式错误");
  return value as Record<string, unknown>;
}

function wait(signal: AbortSignal, ms: number) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

/** 把 MediaInput 规范成 url / data: URI，方便所有需要参考素材的接口使用 */
function mediaUrl(input: MediaInput): string {
  if (input.type === "url") return input.url;
  const data = input.type === "binary" ? Buffer.from(input.data).toString("base64") : input.data;
  return data.startsWith("data:") ? data : `data:${input.mimeType};base64,${data}`;
}

/** ModelVerse 异步任务轮询：output.task_status / output.urls / output.error_message。 */
async function pollTask(context: ProviderContext, apiKey: string, taskId: string, signal: AbortSignal, intervalMs = 4000): Promise<Record<string, unknown>> {
  while (true) {
    const response = await context.tool.fetch(`${apiUrl}/tasks/status?task_id=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    });
    if (!response.ok) throw new Error(`ModelVerse 轮询失败：HTTP ${response.status}（任务 ${taskId}）`);
    const payload = object(await response.json());
    const data = object(payload.output ?? payload.data ?? payload);
    const status = String(data.task_status ?? data.status ?? "").trim().toLowerCase();
    if (status === "success" || status === "succeeded" || status === "completed") return data;
    if (status === "failure" || status === "failed" || status === "cancelled" || status === "canceled") {
      const reason = data.error_message ?? data.fail_reason ?? data.error ?? data.message ?? status;
      throw new Error(`ModelVerse 任务失败（${taskId}）：${typeof reason === "string" ? reason : JSON.stringify(reason)}`);
    }
    if (status !== "pending" && status !== "running" && status !== "queued" && status !== "processing") {
      throw new Error(`ModelVerse 任务状态无效（${taskId}）：${status || "缺少 output.task_status"}`);
    }
    await wait(signal, intervalMs);
  }
}

/** 从异步任务结果中按平台约定提取首个媒体 URL；不同模型字段名差异较大，做归一化 */
function extractMediaUrl(data: Record<string, unknown>, kind: "image" | "video"): string {
  const candidates: unknown[] = [
    (Array.isArray(data.urls) ? data.urls[0] : undefined),
    data.url,
    data.result,
    data.output,
    data.video_url,
    data.image_url,
    (Array.isArray(data.images) ? data.images[0] : undefined),
    (Array.isArray(data.videos) ? data.videos[0] : undefined),
    (Array.isArray(data.output) ? data.output[0] : undefined),
    (Array.isArray(data.result) ? data.result[0] : undefined),
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && /^https?:\/\//.test(candidate)) return candidate;
    if (candidate && typeof candidate === "object") {
      const obj = candidate as Record<string, unknown>;
      for (const key of ["url", `${kind}_url`, "video_url", "image_url"]) {
        const value = obj[key];
        if (typeof value === "string" && /^https?:\/\//.test(value)) return value;
      }
    }
  }
  throw new Error(`未从 ModelVerse ${kind} 结果中提取到 URL，请检查模型返回结构`);
}

/** 把 Toonflow 节点的 (size, ratio) 翻译成 ModelVerse 接受的像素字符串，如 "1024x1792" */
function resolveImageSize(size: string | undefined, ratio: string | undefined, model: string): string {
  if (model === "qwen-image-3.0") {
    const dimensions: Record<string, [number, number]> = {
      "1:1": [1024, 1024], "3:4": [864, 1152], "4:3": [1152, 864],
      "9:16": [720, 1280], "16:9": [1280, 720],
    };
    if (size !== undefined && size !== "1K" && size !== "2K") throw new Error("Qwen-Image-3.0 请选择 1K 或 2K 尺寸");
    const pixels = dimensions[ratio ?? "1:1"];
    if (!pixels) throw new Error("Qwen-Image-3.0 不支持此比例，请选择 1:1、3:4、4:3、9:16 或 16:9");
    const scale = size === "2K" ? 2 : 1;
    // 每档保持所选比例，2K 总像素不超过 2048*2048。
    return `${pixels[0] * scale}*${pixels[1] * scale}`;
  }
  const sizes: Record<string, Record<string, [number, number]>> = {
    "1K":   { "1:1": [1024, 1024], "3:4": [1024, 1536], "4:3": [1152, 896],  "9:16": [1024, 1792], "16:9": [1792, 1024] },
    "1.5K": { "1:1": [1536, 1536], "3:4": [1536, 2048], "4:3": [1728, 1296], "9:16": [1536, 2688], "16:9": [2688, 1536] },
    "2K":   { "1:1": [2048, 2048], "3:4": [2048, 3072], "4:3": [2304, 1728], "9:16": [2048, 3584], "16:9": [3584, 2048] },
  };
  const tier = size && sizes[size] ? size : "1K";
  const r = ratio && sizes[tier][ratio] ? ratio : "1:1";
  const [w, h] = sizes[tier][r];
  return `${w}x${h}`;
}

export default {
  id: "compshareMedia",
  label: "优云智算 ModelVerse",
  version,
  apiUrl,
  readme: "## 优云智算 ModelVerse\n\n按量付费的多模态模型 API（文本/图像/视频/音频），单 API Key 直连。\n\n- 文本：`deepseek-v4-flash-sg` 等（OpenAI 兼容 `/v1/chat/completions`）\n- 图像：`qwen-image-3.0`（¥0.02/张）、`doubao-seedream-5-0-pro-260628`（¥0.02/张）、`MiniMax-H3`（¥0.2/张）\n- 视频：`wan2.6-r2v-flash`（¥0.15/s 首尾帧）、`wan2.7-i2v`（¥0.6/s）、`wan3.0-video`（¥0.3/s）、`MiniMax-H3`（¥0.5–0.8/s）\n- 语音：`speech-2.8-hd`（¥0.00035/字）、`qwen3-tts-flash`（¥0.00008/字）\n\n文本模型供应商见 `packages/providers/src/language/compshareLanguage.ts`，需要修改源码后重新构建。\n\n🔗 [注册领取 5 元体验金](https://www.compshare.cn/video-studio?ytag=GPU_YY_YX_git_toonflow)",
  rules,
  models: [
    {
      id: "qwen-image-3.0",
      label: "通义千问 Qwen-Image-3.0（¥0.02/张）",
      type: "image",
      mode: ["text", "singleImage", "multiReference"],
      imageSizes: ["1K", "2K"],
      imageRatios: ["1:1", "3:4", "4:3", "9:16", "16:9"],
    },
    {
      id: "doubao-seedream-5-0-pro-260628",
      label: "豆包 Seedream 5.0 Pro（¥0.02/张）",
      type: "image",
      mode: ["text", "singleImage", "multiReference"],
      imageSizes: ["1K", "1.5K", "2K"],
      imageRatios: ["1:1", "9:16", "16:9", "3:4", "4:3"],
    },
    {
      id: "wan2.7-i2v",
      label: "Wan2.7 图生视频（¥0.6/s）",
      type: "video",
      mode: ["singleImage", "endFrameOptional"],
      audio: "optional",
      durationResolutionMap: [{ duration: [5, 10, 15], resolution: ["720P", "1080P"] }],
    },
    {
      id: "wan2.6-r2v-flash",
      label: "Wan2.6 R2V Flash 首尾帧（¥0.15/s）",
      type: "video",
      mode: ["startEndRequired", "startFrameOptional", ["imageReference:2"]],
      audio: false,
      durationResolutionMap: [{ duration: [5, 10], resolution: ["720P", "480P"] }],
    },
    {
      id: "wan3.0-video",
      label: "Wan3.0 视频（¥0.3/s）",
      type: "video",
      mode: ["text", "endFrameOptional", ["imageReference:4", "videoReference:2", "audioReference:2"]],
      audio: "optional",
      durationResolutionMap: [{ duration: [5, 10, 15], resolution: ["720P", "1080P", "480P"] }],
    },
    {
      id: "MiniMax-H3",
      label: "MiniMax-H3（¥0.5–0.8/s）",
      type: "video",
      mode: ["text", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]],
      audio: "optional",
      durationResolutionMap: [{ duration: [5, 10, 15], resolution: ["1080P", "768P"] }],
    },
    {
      id: "speech-2.8-hd",
      label: "语音合成 speech-2.8-hd（¥0.00035/字）",
      type: "audio",
      voices: [
        { title: "默认女声", voice: "female-yujie" },
        { title: "默认男声", voice: "male-qn-jingying" },
        { title: "温柔女声", voice: "female-shaonv" },
      ],
    },
    {
      id: "qwen3-tts-flash",
      label: "通义 TTS Flash（¥0.00008/字）",
      type: "audio",
      voices: [
        { title: "默认女声", voice: "Cherry" },
        { title: "默认男声", voice: "Ethan" },
      ],
    },
  ] satisfies ProviderModel[],
  async generateImage(request: ImageRequest): Promise<MediaAsset[]> {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) throw new Error("请填写 ModelVerse API Key");
    const signal = AbortSignal.any([AbortSignal.timeout(10 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const imageUrls = (request.images ?? []).map(mediaUrl);
    const isQwenImage = request.model === "qwen-image-3.0";
    if (isQwenImage && imageUrls.length > 3) throw new Error("Qwen-Image-3.0 最多支持 3 张参考图");
    if (isQwenImage && request.n !== undefined && (!Number.isInteger(request.n) || request.n < 1 || request.n > 6)) {
      throw new Error("Qwen-Image-3.0 每次支持生成 1 至 6 张图片");
    }

    // 把 Toonflow 的 (size, ratio) 翻成 ModelVerse 接受的像素字符串
    const pixelSize = resolveImageSize(request.size, request.ratio, request.model);

    // 主路径：同步出图（OpenAI images 协议）—— ModelVerse 已实测支持
    const syncResponse = await this.tool.fetch(`${apiUrl}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        n: request.n ?? 1,
        size: pixelSize,
        ...(imageUrls.length ? (isQwenImage ? { images: imageUrls } : { image_urls: imageUrls }) : {}),
      }),
      signal,
    });

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text().catch(() => "");
      throw new Error(
        `图片生成失败：HTTP ${syncResponse.status}` +
        (errorText ? ` ${errorText.slice(0, 300)}` : "")
      );
    }

    const payload = object(await syncResponse.json());
    const data = payload.data ?? payload.images ?? payload;
    if (Array.isArray(data) && data.length) {
      if (isQwenImage) return data.map((item): MediaAsset => {
        const url = object(item).url;
        if (typeof url !== "string" || !/^https?:\/\//.test(url)) throw new Error("Qwen-Image-3.0 返回了无效的图片 URL");
        return { mediaType: "image", type: "url", url };
      });
      const first = data[0];
      if (typeof first === "string" && /^https?:\/\//.test(first)) return [{ mediaType: "image", type: "url", url: first }];
      if (first && typeof first === "object") {
        const obj = first as Record<string, unknown>;
        const url = obj.url ?? obj.image_url;
        if (typeof url === "string" && /^https?:\/\//.test(url)) return [{ mediaType: "image", type: "url", url }];
      }
    }
    throw new Error("图片生成成功但未返回可解析的 URL，请检查 ModelVerse 响应结构");
  },
  async generateVideo(request: VideoRequest): Promise<MediaAsset[]> {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) throw new Error("请填写 ModelVerse API Key");
    const signal = AbortSignal.any([AbortSignal.timeout(30 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const imageUrls = (request.images ?? []).map(mediaUrl);
    const videoUrls = (request.videos ?? []).map(mediaUrl);
    const audioUrls = (request.audios ?? []).map(mediaUrl);
    const firstFrame = request.firstFrame ? mediaUrl(request.firstFrame) : imageUrls[0];
    const lastFrame = request.lastFrame ? mediaUrl(request.lastFrame) : undefined;

    // ACT: ModelVerse /v1/tasks/submit 真实协议是嵌套的 { model, input, parameters }，
    // 没有顶层 task_type，也没有顶层 prompt/duration/resolution。早期版本用扁平字段
    // 提交，所有视频模型都会被服务端 reject（HTTP 400）。
    const model = request.model.toLowerCase();
    if ((model === "wan2.7-i2v" || model === "wan3.0-video") && lastFrame && !firstFrame) {
      throw new Error(`${request.model} 不支持仅尾帧生成，请刷新页面并选择「尾帧可选」模式，第一张图片作为首帧`);
    }
    if (model === "wan2.7-i2v" && !firstFrame) {
      throw new Error("Wan2.7 图生视频需要首帧图片，请连接图片后选择「单图参考」或「尾帧可选」模式");
    }
    const input: Record<string, unknown> = { prompt: request.prompt };
    // 平台通用分辨率不等于每个模型都支持；模型限制须在提交前单独检查。
    const allowed = new Set(["480P", "720P", "1080P"]);
    const normalized = String(request.resolution ?? "").trim().toUpperCase().replace(/P$/, "");
    const resolution = allowed.has(`${normalized}P`) ? `${normalized}P` : "720P";
    if (model === "wan2.7-i2v" && resolution === "480P") {
      throw new Error("Wan2.7 不支持 480P，请刷新页面并选择 720P 或 1080P");
    }
    const parameters: Record<string, unknown> = {
      duration: request.duration ?? 5,
      resolution,
    };
    if (request.ratio) parameters.ratio = request.ratio;

    if (model.includes("r2v") || model.includes("reference")) {
      // ACT: wan2.6-r2v-flash 等「参考图生视频」模型接受平铺字符串数组
      // input.reference_urls，按数组顺序映射为 prompt 里的 character1/2/3…
      const refs: string[] = [];
      if (firstFrame) refs.push(firstFrame);
      if (lastFrame && !refs.includes(lastFrame)) refs.push(lastFrame);
      for (const u of imageUrls) if (!refs.includes(u)) refs.push(u);
      for (const u of videoUrls) if (!refs.includes(u)) refs.push(u);
      if (refs.length) input.reference_urls = refs;
    } else {
      // ACT: wan2.7-i2v / wan3.0-video / MiniMax-H3 等新一代模型使用
      // input.media[]，每个元素带 type + url；type ∈ first_frame | last_frame
      // | reference_image | reference_video | reference_audio
      const media: Array<{ type: string; url: string }> = [];
      if (firstFrame) media.push({ type: "first_frame", url: firstFrame });
      if (lastFrame) media.push({ type: "last_frame", url: lastFrame });
      for (const u of imageUrls) {
        if (u !== firstFrame && u !== lastFrame) media.push({ type: "reference_image", url: u });
      }
      for (const u of videoUrls) media.push({ type: "reference_video", url: u });
      for (const u of audioUrls) media.push({ type: "reference_audio", url: u });
      if (media.length) input.media = media;
    }

    if (typeof request.generateAudio === "boolean") parameters.audio = request.generateAudio;

    const body = { model: request.model, input, parameters };
    const response = await this.tool.fetch(`${apiUrl}/tasks/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `视频任务提交失败：HTTP ${response.status}` +
        (errorText ? ` ${errorText.slice(0, 300)}` : "")
      );
    }
    const payload = object(await response.json());
    // ACT: ModelVerse 任务提交的真实响应嵌套在 output.task_id / data.task_id / 顶层 task_id
    // 三个位置，按出现顺序逐级 fallback；旧代码漏了 output 导致每次都报「未返回 task_id」。
    const taskId = String(
      object(payload.output ?? {}).task_id
      ?? object(payload.data ?? {}).task_id
      ?? payload.task_id
      ?? object(object(payload.data ?? {}).output ?? {}).task_id
      ?? ""
    );
    if (!taskId) throw new Error(`ModelVerse 视频任务未返回 task_id，原始响应：${JSON.stringify(payload).slice(0, 200)}`);

    const data = await pollTask(this, apiKey, taskId, signal, 6000);
    const url = extractMediaUrl(data, "video");
    return [{ mediaType: "video", type: "url", url }];
  },
  async generateAudio(request: AudioRequest): Promise<MediaAsset[]> {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) throw new Error("请填写 ModelVerse API Key");
    const signal = AbortSignal.any([AbortSignal.timeout(5 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const response = await this.tool.fetch(`${apiUrl}/audio/speech`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model,
        input: request.text,
        voice: request.voice ?? "female-yujie",
        response_format: request.format === "wav" ? "wav" : "mp3",
        speed: request.speed ?? 1,
      }),
      signal,
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`语音合成失败：HTTP ${response.status}${errorText ? ` ${errorText.slice(0, 200)}` : ""}`);
    }
    const contentType = response.headers.get("content-type") ?? "audio/mpeg";
    const bytes = new Uint8Array(await response.arrayBuffer());
    const mimeType = contentType.includes("wav") ? "audio/wav" : "audio/mpeg";
    return [{ mediaType: "audio", type: "binary", data: bytes, mimeType }];
  },
} satisfies ProviderDefinition<typeof rules>;
