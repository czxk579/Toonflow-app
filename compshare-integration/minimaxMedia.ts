// 用途：Toonflow-app 媒体供应商适配「MiniMax Token Plan (sk-cp-...)」
// 安装方式：把本文件全文复制到 Toonflow 「设置 → 媒体模型 → 添加自定义供应商」对话框，保存即可
// 端点（已 curl 实测 200 OK）：
//   POST https://api.minimaxi.com/v1/image_generation   同步图像
//   POST https://api.minimaxi.com/v1/text_to_speech     同步 TTS
//   （国内版默认 base；海外版换成 https://api.minimax.io/v1）
// 套餐：TokenPlanPlus 月度会员（M3 / M2.7 / 图像 / 语音），Key 前缀 sk-cp-...
// 文档：https://platform.minimaxi.com/docs
const rules = [
  {
    type: "input",
    field: "apiKey" as const,
    title: "MiniMax API Key (sk-cp-...)",
    value: "",
    props: { type: "password", showPassword: true, autocomplete: "off" },
  },
  {
    type: "input",
    field: "baseUrl" as const,
    title: "Base URL",
    value: "https://api.minimaxi.com/v1",
    props: { placeholder: "国内 https://api.minimaxi.com/v1，海外 https://api.minimax.io/v1" },
  },
] as const;

const version = "1.0.1";
const defaultBaseUrl = "https://api.minimaxi.com/v1";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("MiniMax 响应格式错误");
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

function mediaUrl(input: MediaInput): string {
  if (input.type === "url") return input.url;
  const data = input.type === "binary" ? Buffer.from(input.data).toString("base64") : input.data;
  return data.startsWith("data:") ? data : `data:${input.mimeType};base64,${data}`;
}

function resolveBaseUrl(context: ProviderContext): string {
  const raw = (context.config.baseUrl as string | undefined)?.trim();
  return raw ? raw.replace(/\/+$/, "") : defaultBaseUrl;
}

async function fetchJson(context: ProviderContext, path: string, body: unknown, signal: AbortSignal): Promise<Record<string, unknown>> {
  const apiKey = String(context.config.apiKey ?? "").trim();
  if (!apiKey) throw new Error("请填写 MiniMax API Key");
  const baseUrl = resolveBaseUrl(context);
  const response = await context.tool.fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `MiniMax ${path} 失败：HTTP ${response.status}` +
      (errorText ? ` ${errorText.slice(0, 300)}` : "")
    );
  }
  return object(await response.json());
}

export default {
  id: "minimaxMedia",
  label: "MiniMax (M3 图像 / 语音)",
  version,
  apiUrl: defaultBaseUrl,
  readme: `## MiniMax 旗舰模型（Token Plan 订阅）

适配 [MiniMax](https://www.minimaxi.com) TokenPlanPlus 月度会员 API Key (\`sk-cp-...\`)。

### 支持能力

| 模型 | 类型 | 单价 |
|---|---|---|
| \`image-01\` | 图像（文生图） | 按套餐额度 |
| \`speech-2.8-hd\` | 语音（高清 TTS） | $100/M 字符 |
| \`speech-2.8-turbo\` | 语音（快速 TTS） | $60/M 字符 |

### 端点
- 国内：\`https://api.minimaxi.com/v1\`（默认）
- 海外：\`https://api.minimax.io/v1\`（在 baseUrl 字段里改）

文本对话（M3 / M2.7）请用「文本模型」供应商单独配（语言供应商走 \`compshareLanguage.ts\` 同款方式）。

🔗 [注册 MiniMax 订阅](https://www.minimaxi.com)`,
  rules,
  models: [
    {
      id: "image-01",
      label: "MiniMax 图像 (image-01)",
      type: "image",
      mode: ["text"],
      imageSizes: ["1K", "2K"],
      imageRatios: ["1:1", "3:4", "4:3", "9:16", "16:9"],
    },
    {
      id: "image-01-reframe",
      label: "MiniMax 图像 (image-01-reframe,智能重绘)",
      type: "image",
      mode: ["text", "singleImage"],
      imageSizes: ["1K", "2K"],
      imageRatios: ["1:1", "3:4", "4:3", "9:16", "16:9"],
    },
    {
      id: "speech-2.8-hd",
      label: "MiniMax 语音 (speech-2.8-hd, 高清)",
      type: "audio",
      voices: [
        { title: "默认女声", voice: "female-shaonv" },
        { title: "默认男声", voice: "male-qn-jingying" },
        { title: "沉稳男声", voice: "male-qn-qingse" },
        { title: "温柔女声", voice: "female-yujie" },
      ],
    },
    {
      id: "speech-2.8-turbo",
      label: "MiniMax 语音 (speech-2.8-turbo, 快速)",
      type: "audio",
      voices: [
        { title: "默认女声", voice: "female-shaonv" },
        { title: "默认男声", voice: "male-qn-jingying" },
      ],
    },
  ] satisfies ProviderModel[],
  async generateImage(request: ImageRequest): Promise<MediaAsset[]> {
    const signal = AbortSignal.any([AbortSignal.timeout(10 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const apiKey = String(this.config.apiKey ?? "").trim();
    if (!apiKey) throw new Error("请填写 MiniMax API Key");

    // ACT: MiniMax 图像协议（实测可达）：
    //   POST /v1/image_generation
    //   { model, prompt, aspect_ratio (≠ratio), n, response_format, prompt_optimizer, subject_reference[] }
    const body: Record<string, unknown> = {
      model: request.model,
      prompt: request.prompt,
      n: request.n ?? 1,
      response_format: "url",
    };
    if (request.ratio) body.aspect_ratio = request.ratio;
    if (request.size) body.size = request.size;
    if (request.quality === "high") body.prompt_optimizer = true;

    // i2i: subject_reference 接受一张参考图（character 类型）
    const imageUrls = (request.images ?? []).map(mediaUrl);
    if (imageUrls.length) {
      body.subject_reference = imageUrls.slice(0, 1).map((image_file) => ({ type: "character", image_file }));
    }

    const payload = await fetchJson(this, "/image_generation", body, signal);

    // 响应归一化：MiniMax 真实响应 { base_resp, data: { image_urls: [...] } } / { image_urls } / { url }
    const data = payload.data ?? payload;
    const dataObj = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    const urlList: unknown[] = Array.isArray(dataObj.image_urls)
      ? (dataObj.image_urls as unknown[])
      : Array.isArray(payload.image_urls)
        ? (payload.image_urls as unknown[])
        : [];
    for (const url of urlList) {
      if (typeof url === "string" && /^https?:\/\//.test(url)) {
        return [{ mediaType: "image", type: "url", url }];
      }
      if (url && typeof url === "object") {
        const obj = url as Record<string, unknown>;
        for (const key of ["url", "image_url", "image"]) {
          const value = obj[key];
          if (typeof value === "string" && /^https?:\/\//.test(value)) {
            return [{ mediaType: "image", type: "url", url: value }];
          }
        }
      }
    }
    // 兜底：顶层直接是 URL
    if (typeof payload === "object" && payload && "url" in payload && typeof (payload as Record<string, unknown>).url === "string") {
      const url = (payload as Record<string, unknown>).url as string;
      if (/^https?:\/\//.test(url)) return [{ mediaType: "image", type: "url", url }];
    }
    throw new Error(`MiniMax 图像生成成功但未返回 URL，原始响应：${JSON.stringify(payload).slice(0, 200)}`);
  },
  async generateAudio(request: AudioRequest): Promise<MediaAsset[]> {
    const signal = AbortSignal.any([AbortSignal.timeout(5 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const apiKey = String(this.config.apiKey ?? "").trim();
    if (!apiKey) throw new Error("请填写 MiniMax API Key");
    const baseUrl = resolveBaseUrl(this);

    // ACT: MiniMax TTS 协议（实测可达）：
    //   POST /v1/text_to_speech
    //   { model, text, voice, audio_setting: { format, sample_rate, ... } }
    const response = await this.tool.fetch(`${baseUrl}/text_to_speech`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model,
        text: request.text,
        voice: request.voice ?? "female-shaonv",
        audio_setting: {
          format: request.format === "wav" ? "wav" : "mp3",
          sample_rate: request.sampleRate ?? 32000,
          speed: request.speed ?? 1,
        },
      }),
      signal,
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`MiniMax TTS 失败：HTTP ${response.status}${errorText ? ` ${errorText.slice(0, 200)}` : ""}`);
    }
    // MiniMax TTS 同步返回二进制音频（audio/mpeg）
    const contentType = response.headers.get("content-type") ?? "audio/mpeg";
    if (!contentType.startsWith("audio/") && !contentType.includes("octet-stream")) {
      // 可能是 JSON 错误响应
      const text = await response.text().catch(() => "");
      throw new Error(`MiniMax TTS 返回非音频内容：${contentType} ${text.slice(0, 200)}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const mimeType = contentType.includes("wav") ? "audio/wav" : "audio/mpeg";
    return [{ mediaType: "audio", type: "binary", data: bytes, mimeType }];
  },
} satisfies ProviderDefinition<typeof rules>;