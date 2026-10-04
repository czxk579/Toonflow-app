// 用途：Toonflow-app 媒体供应商适配「ComfyUI 云 GPU（图像）」
// 安装方式：Toonflow「设置 → 媒体模型 → 添加供应商」，选择「文件导入」或「粘贴代码」，
// 保存后点编辑，填入 ComfyUI 服务地址（云 GPU 实例的公网地址，如 http://1.2.3.4:8188）。
// 覆盖模型：
//   - krea2-t2i：文生图（Krea-2-Turbo，两段式采样）
//   - qwen-image-edit-i2i：图生图/图像编辑（Qwen-Image-Edit 2511 + Lightning LoRA，最多 3 张参考图）
// 调用协议（标准 ComfyUI HTTP API）：
//   POST {baseUrl}/prompt 提交 API 格式工作流 → 轮询 GET {baseUrl}/history/{promptId}
//   → 经 GET {baseUrl}/view 下载产出；参考图经 POST {baseUrl}/upload/image 上传。
const rules = [
  {
    type: "input",
    field: "baseUrl" as const,
    title: "ComfyUI 服务地址",
    value: "http://127.0.0.1:8188",
    props: { placeholder: "http://公网IP:8188（云 GPU 实例的 ComfyUI 地址）" },
  },
] as const;

const version = "1.0.0";

// ===== 内嵌工作流（ComfyUI API 格式）=====
const t2iWorkflow = {"223":{"inputs":{"unet_name":"Krea-2-Turbo/turbo.safetensors","weight_dtype":"default"},"class_type":"UNETLoader","_meta":{"title":"UNet加载器"}},"225":{"inputs":{"aspect_ratio":"original","proportional_width":1,"proportional_height":1,"fit":"crop","method":"bicubic","round_to_multiple":"16","scale_to_side":"longest","scale_to_length":2048,"background_color":"#000000","image":["240",0]},"class_type":"LayerUtility: ImageScaleByAspectRatio V2","_meta":{"title":"图层工具：按宽高比缩放 V2"}},"226":{"inputs":{"samples":["239",0],"vae":["242",2]},"class_type":"VAEDecode","_meta":{"title":"VAE解码"}},"227":{"inputs":{"anything":["226",0]},"class_type":"easy cleanGpuUsed","_meta":{"title":"清理显存占用"}},"228":{"inputs":{"pixels":["225",0],"vae":["242",2]},"class_type":"VAEEncode","_meta":{"title":"VAE编码"}},"229":{"inputs":{"vae_name":"qwen_image_vae.safetensors"},"class_type":"VAELoader","_meta":{"title":"加载VAE"}},"231":{"inputs":{"conditioning":["237",0]},"class_type":"ConditioningZeroOut","_meta":{"title":"条件零化"}},"232":{"inputs":{"conditioning":["233",0]},"class_type":"ConditioningZeroOut","_meta":{"title":"条件零化"}},"233":{"inputs":{"text":["287",0],"clip":["242",1]},"class_type":"CLIPTextEncode","_meta":{"title":"CLIP文本编码"}},"235":{"inputs":{"shift":5,"model":["242",0]},"class_type":"ModelSamplingAuraFlow","_meta":{"title":"采样算法（AuraFlow）"}},"236":{"inputs":{"shift":3.0000000000000004,"model":["223",0]},"class_type":"ModelSamplingAuraFlow","_meta":{"title":"采样算法（AuraFlow）"}},"237":{"inputs":{"text":["287",0],"clip":["291",0]},"class_type":"CLIPTextEncode","_meta":{"title":"CLIP文本编码"}},"238":{"inputs":{"add_noise":"enable","noise_seed":432132807139056,"steps":8,"cfg":1,"sampler_name":"euler","scheduler":"simple","start_at_step":0,"end_at_step":10000,"return_with_leftover_noise":"disable","model":["236",0],"positive":["237",0],"negative":["231",0],"latent_image":["288",0]},"class_type":"KSamplerAdvanced","_meta":{"title":"K采样器（高级）"}},"239":{"inputs":{"add_noise":"enable","noise_seed":618575956236946,"steps":10,"cfg":1,"sampler_name":"euler","scheduler":"simple","start_at_step":6,"end_at_step":10000,"return_with_leftover_noise":"disable","model":["235",0],"positive":["233",0],"negative":["232",0],"latent_image":["228",0]},"class_type":"KSamplerAdvanced","_meta":{"title":"K采样器（高级）"}},"240":{"inputs":{"samples":["238",0],"vae":["229",0]},"class_type":"VAEDecode","_meta":{"title":"VAE解码"}},"242":{"inputs":{"ckpt_name":"z-image-turbo-bf16-aio.safetensors"},"class_type":"CheckpointLoaderSimple","_meta":{"title":"Checkpoint加载器（简易）"}},"268":{"inputs":{"filename_prefix":"ComfyUI","images":["226",0]},"class_type":"SaveImage","_meta":{"title":"保存图像"}},"274":{"inputs":{"filename_prefix":"ComfyUI","images":["240",0]},"class_type":"SaveImage","_meta":{"title":"保存图像"}},"287":{"inputs":{"text":"Chinese manhua style illustration, a young woman in flowing cyan hanfu with a high ponytail, standing on an ancient stone bridge over misty water at dawn, willow branches swaying gently, soft morning light, delicate linework, cinematic composition, highly detailed\nNegative: blurry, low quality, deformed hands, extra fingers, watermark"},"class_type":"LayerUtility: TextBox","_meta":{"title":"图层工具：文本框"}},"288":{"inputs":{"width":720,"height":1280,"batch_size":1},"class_type":"EmptyLatentImage","_meta":{"title":"空Latent图像"}},"291":{"inputs":{"clip_name":"qwen3vl_4b_fp8_scaled.safetensors","type":"krea2","device":"default"},"class_type":"CLIPLoader","_meta":{"title":"加载CLIP"}}};
const i2iWorkflow = {"38":{"inputs":{"clip_name":"qwen_2.5_vl_7b.safetensors","type":"qwen_image","device":"default"},"class_type":"CLIPLoader","_meta":{"title":"加载CLIP"}},"122":{"inputs":{"lora_name":"Qwen-Image-Edit-2511-Lightning-4steps-V1.0-fp32-1c18194f7240.safetensors","strength_model":1,"model":["339",0]},"class_type":"LoraLoaderModelOnly","_meta":{"title":"LoRA加载器（仅模型）"}},"302":{"inputs":{"seed":109315871065499,"steps":4,"cfg":1,"sampler_name":"euler","scheduler":"simple","denoise":1,"model":["122",0],"positive":["330",0],"negative":["331",0],"latent_image":["356",0]},"class_type":"KSampler","_meta":{"title":"K采样器"}},"303":{"inputs":{"samples":["302",0],"vae":["380",0]},"class_type":"VAEDecode","_meta":{"title":"VAE解码"}},"330":{"inputs":{"reference_latents_method":"index_timestep_zero","conditioning":["375",0]},"class_type":"FluxKontextMultiReferenceLatentMethod","_meta":{"title":"FluxKontext多参考潜在方法"}},"331":{"inputs":{"reference_latents_method":"index_timestep_zero","conditioning":["381",0]},"class_type":"FluxKontextMultiReferenceLatentMethod","_meta":{"title":"FluxKontext多参考潜在方法"}},"339":{"inputs":{"unet_name":"qwen_image_edit_2511_bf16.safetensors","weight_dtype":"default"},"class_type":"UNETLoader","_meta":{"title":"UNet加载器"}},"345":{"inputs":{"filename_prefix":"ComfyUI","images":["303",0]},"class_type":"SaveImage","_meta":{"title":"保存图像"}},"351":{"inputs":{"image":"20191228131551_h3rrK.jpeg"},"class_type":"LoadImage","_meta":{"title":"加载图像"}},"352":{"inputs":{"image":"downloaded-image.jpg"},"class_type":"LoadImage","_meta":{"title":"加载图像"}},"353":{"inputs":{"image":"ComfyUI_temp_pofoj_00006_.png"},"class_type":"LoadImage","_meta":{"title":"加载图像"}},"356":{"inputs":{"width":720,"height":1280,"batch_size":1},"class_type":"EmptyLatentImage","_meta":{"title":"空Latent图像"}},"375":{"inputs":{"prompt":["384",0],"clip":["38",0],"vae":["380",0],"image1":["351",0],"image2":["352",0],"image3":["353",0]},"class_type":"TextEncodeQwenImageEditPlus","_meta":{"title":"文本编码（QwenImageEditPlus）"}},"380":{"inputs":{"vae_name":"qwen_image_vae.safetensors"},"class_type":"VAELoader","_meta":{"title":"加载VAE"}},"381":{"inputs":{"conditioning":["375",0]},"class_type":"ConditioningZeroOut","_meta":{"title":"条件零化"}},"384":{"inputs":{"text":"图像1中的人物 拿着图像2中的产品，在图像3的背景下做产品展示"},"class_type":"LayerUtility: TextBox","_meta":{"title":"图层工具：文本框"}},"385":{"inputs":{"model":"ema_vae_fp16.safetensors","device":"cuda:0","encode_tiled":false,"encode_tile_size":1024,"encode_tile_overlap":128,"decode_tiled":false,"decode_tile_size":1024,"decode_tile_overlap":128,"tile_debug":"false","offload_device":"none","cache_model":false},"class_type":"SeedVR2LoadVAEModel","_meta":{"title":"SeedVR2 (Down)Load VAE Model"}},"387":{"inputs":{"seed":951021485,"resolution":1920,"max_resolution":0,"batch_size":5,"uniform_batch_size":false,"color_correction":"lab","temporal_overlap":0,"prepend_frames":0,"input_noise_scale":0,"latent_noise_scale":0,"offload_device":"cpu","enable_debug":false,"image":["303",0],"dit":["388",0],"vae":["385",0]},"class_type":"SeedVR2VideoUpscaler","_meta":{"title":"SeedVR2 Video Upscaler (v2.5.24)"}},"388":{"inputs":{"model":"seedvr2_ema_3b-Q8_0.gguf","device":"cuda:0","blocks_to_swap":0,"swap_io_components":false,"offload_device":"none","cache_model":false,"attention_mode":"sdpa"},"class_type":"SeedVR2LoadDiTModel","_meta":{"title":"SeedVR2 (Down)Load DiT Model"}},"389":{"inputs":{"filename_prefix":"ComfyUI","images":["387",0]},"class_type":"SaveImage","_meta":{"title":"保存图像"}},"390":{"inputs":{"purge_cache":true,"purge_models":true,"anything":["303",0]},"class_type":"LayerUtility: PurgeVRAM V2","_meta":{"title":"图层工具：清除VRAM V2"}}};

// ===== 通用工具 =====
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("ComfyUI 响应格式错误");
  return value as Record<string, unknown>;
}

function wait(signal: AbortSignal, ms: number): Promise<void> {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason instanceof Error ? signal.reason : new Error("请求已取消"));
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}

function baseOf(config: Record<string, unknown>): string {
  const raw = String(config.baseUrl ?? "").trim().replace(/\/+$/, "");
  if (!raw) throw new Error("请先在供应商配置中填写 ComfyUI 服务地址");
  if (!/^https?:\/\//i.test(raw)) throw new Error(`ComfyUI 服务地址格式无效：${raw}`);
  return raw;
}

function nodeOf(wf: Record<string, any>, nodeId: string): Record<string, any> {
  const node = wf[nodeId] as Record<string, any> | undefined;
  if (!node || typeof node !== "object") throw new Error(`工作流缺少节点 ${nodeId}`);
  if (!node.inputs || typeof node.inputs !== "object") node.inputs = {};
  return node;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

/** MediaInput → 字节 */
async function inputBytes(
  fetchFn: typeof fetch,
  input: MediaInput,
  signal: AbortSignal,
): Promise<{ bytes: Uint8Array; mime: string }> {
  if (input.type === "binary") return { bytes: input.data, mime: input.mimeType || "image/png" };
  if (input.type === "base64") {
    const raw = input.data.indexOf(",") >= 0 ? (input.data.split(",").pop() as string) : input.data;
    return { bytes: new Uint8Array(Buffer.from(raw, "base64")), mime: input.mimeType || "image/png" };
  }
  const response = await fetchFn(input.url, { signal });
  if (!response.ok) throw new Error(`参考图下载失败：HTTP ${response.status} ${input.url.slice(0, 120)}`);
  const mime = response.headers.get("content-type")?.split(";")[0].trim() || input.mimeType || "image/png";
  return { bytes: new Uint8Array(await response.arrayBuffer()), mime };
}

function extOf(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "png";
}

/** 上传图片到 ComfyUI，返回可填入 LoadImage 节点的 image 文件名 */
async function uploadImage(
  fetchFn: typeof fetch,
  base: string,
  bytes: Uint8Array,
  mime: string,
  signal: AbortSignal,
): Promise<string> {
  const boundary = `----ToonflowForm${Date.now()}${Math.floor(Math.random() * 1e9)}`;
  const filename = `toonflow_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${extOf(mime)}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const response = await fetchFn(`${base}/upload/image`, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body: Buffer.concat([head, Buffer.from(bytes), tail]),
    signal,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`图片上传到 ComfyUI 失败：HTTP ${response.status}${text ? ` ${text.slice(0, 200)}` : ""}`);
  }
  const payload = object(await response.json());
  const name = payload.name;
  if (typeof name !== "string" || !name) throw new Error("ComfyUI /upload/image 未返回文件名");
  return name;
}

/** 提交工作流，返回 prompt_id；工作流校验失败直接抛错 */
async function submitWorkflow(
  fetchFn: typeof fetch,
  base: string,
  workflow: Record<string, any>,
  signal: AbortSignal,
): Promise<string> {
  const clientId = `toonflow_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
  const response = await fetchFn(`${base}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    signal,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`ComfyUI 任务提交失败：HTTP ${response.status}${text ? ` ${text.slice(0, 300)}` : ""}`);
  }
  const payload = object(await response.json());
  const nodeErrors = payload.node_errors;
  if (nodeErrors && typeof nodeErrors === "object" && Object.keys(nodeErrors).length > 0) {
    throw new Error(`ComfyUI 工作流校验失败：${JSON.stringify(nodeErrors).slice(0, 500)}`);
  }
  const promptId = payload.prompt_id;
  if (typeof promptId !== "string" || !promptId) throw new Error("ComfyUI 未返回 prompt_id");
  return promptId;
}

/** 尽力中断远端任务（取消时调用，失败忽略） */
async function interruptQuietly(fetchFn: typeof fetch, base: string): Promise<void> {
  try {
    await fetchFn(`${base}/interrupt`, { method: "POST" });
  } catch {
    /* 忽略 */
  }
}

/** 轮询直到产出就绪，返回 history.outputs；取消时尝试中断远端任务 */
async function waitOutputs(
  fetchFn: typeof fetch,
  base: string,
  promptId: string,
  signal: AbortSignal,
  intervalMs = 5000,
): Promise<Record<string, unknown>> {
  try {
    while (true) {
      signal.throwIfAborted();
      const response = await fetchFn(`${base}/history/${encodeURIComponent(promptId)}`, { signal });
      if (!response.ok) throw new Error(`ComfyUI 查询任务失败：HTTP ${response.status}（${promptId}）`);
      const history = object(await response.json());
      const rawEntry = history[promptId];
      if (rawEntry) {
        const entry = object(rawEntry);
        const status = entry.status ? object(entry.status) : {};
        const outputs = entry.outputs ? object(entry.outputs) : {};
        if (Object.keys(outputs).length > 0) return outputs;
        if (status.completed === true) throw new Error(`ComfyUI 任务完成但未产出（${promptId}）`);
        if (String(status.status_str ?? "") === "error") {
          throw new Error(`ComfyUI 任务失败（${promptId}）：${JSON.stringify(status.messages).slice(0, 500)}`);
        }
      }
      await wait(signal, intervalMs);
    }
  } catch (err) {
    await interruptQuietly(fetchFn, base);
    throw err;
  }
}

interface ViewFile {
  filename: string;
  subfolder: string;
  type: string;
}

/** 从 history.outputs 中收集某类产出文件（images / gifs） */
function collectFiles(outputs: Record<string, unknown>, kind: "images" | "gifs"): ViewFile[] {
  const files: ViewFile[] = [];
  for (const nodeId of Object.keys(outputs)) {
    const nodeOut = object(outputs[nodeId]);
    const arr = nodeOut[kind];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const file = object(item);
      if (typeof file.filename !== "string" || !file.filename) continue;
      files.push({
        filename: file.filename,
        subfolder: typeof file.subfolder === "string" ? file.subfolder : "",
        type: typeof file.type === "string" ? file.type : "output",
      });
    }
  }
  return files;
}

/** 经 /view 下载产出文件 */
async function downloadView(
  fetchFn: typeof fetch,
  base: string,
  file: ViewFile,
  signal: AbortSignal,
): Promise<{ bytes: Uint8Array; mime: string }> {
  const url =
    `${base}/view?filename=${encodeURIComponent(file.filename)}` +
    `&subfolder=${encodeURIComponent(file.subfolder)}&type=${encodeURIComponent(file.type)}`;
  const response = await fetchFn(url, { signal });
  if (!response.ok) throw new Error(`ComfyUI 下载产出失败：HTTP ${response.status}（${file.filename}）`);
  const mime = response.headers.get("content-type")?.split(";")[0].trim() || "";
  return { bytes: new Uint8Array(await response.arrayBuffer()), mime };
}

/** 提交工作流 → 等产出 → 下载全部图片，返回 MediaAsset 数组 */
async function runImageWorkflow(
  context: ProviderContext,
  base: string,
  workflow: Record<string, any>,
  signal: AbortSignal,
): Promise<MediaAsset[]> {
  const fetchFn = context.tool.fetch;
  const promptId = await submitWorkflow(fetchFn, base, workflow, signal);
  const outputs = await waitOutputs(fetchFn, base, promptId, signal);
  const files = collectFiles(outputs, "images");
  if (!files.length) throw new Error(`ComfyUI 未返回图片（${promptId}）`);
  const assets: MediaAsset[] = [];
  for (const file of files) {
    const { bytes, mime } = await downloadView(fetchFn, base, file, signal);
    assets.push({ mediaType: "image", type: "binary", data: bytes, mimeType: mime || "image/png" });
  }
  return assets;
}

function ratioSize(ratio: string | undefined): { width: number; height: number } | null {
  const table: Record<string, [number, number]> = {
    "16:9": [1280, 720],
    "9:16": [720, 1280],
    "1:1": [1024, 1024],
    "3:4": [896, 1152],
    "4:3": [1152, 896],
  };
  const hit = ratio ? table[ratio.trim()] : undefined;
  return hit ? { width: hit[0], height: hit[1] } : null;
}

export default {
  id: "comfyuiImage",
  label: "ComfyUI 云 GPU（图像）",
  version,
  readme:
    "## ComfyUI 云 GPU（图像）\n\n把云 GPU 实例上的 ComfyUI 作为 ToonFlow 的图像算力，按工作流直调，不经过第三方模型 API。\n\n- 模型 `krea2-t2i`：文生图（Krea-2-Turbo，两段式采样）\n- 模型 `qwen-image-edit-i2i`：图生图/图像编辑（Qwen-Image-Edit 2511 + Lightning LoRA，最多 3 张参考图）\n\n使用前请确认：ComfyUI 已在云 GPU 实例上启动，且 ToonFlow 服务器能访问到上面填写的地址；工作流依赖的模型与自定义节点已在实例上就绪。",
  rules,
  models: [
    {
      id: "krea2-t2i",
      label: "Krea-2-Turbo 文生图（云 GPU）",
      type: "image",
      mode: ["text"],
      imageRatios: ["16:9", "9:16", "1:1", "3:4", "4:3"],
    },
    {
      id: "qwen-image-edit-i2i",
      label: "Qwen-Image-Edit 图生图（云 GPU）",
      type: "image",
      mode: ["singleImage", "multiReference"],
    },
  ] satisfies ProviderModel[],
  async generateImage(request: ImageRequest): Promise<MediaAsset[]> {
    const base = baseOf(this.config);
    const signal = AbortSignal.any([AbortSignal.timeout(10 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const fetchFn = this.tool.fetch;
    const model = request.model;

    if (model === "krea2-t2i") {
      const wf = JSON.parse(JSON.stringify(t2iWorkflow)) as Record<string, any>;
      nodeOf(wf, "287").inputs.text = request.prompt;
      const size = ratioSize(request.ratio);
      if (size) {
        nodeOf(wf, "288").inputs.width = size.width;
        nodeOf(wf, "288").inputs.height = size.height;
      }
      nodeOf(wf, "288").inputs.batch_size = clampInt(request.n ?? 1, 1, 4);
      return runImageWorkflow(this, base, wf, signal);
    }

    if (model === "qwen-image-edit-i2i") {
      const images = request.images ?? [];
      if (!images.length) throw new Error("图生图需要至少 1 张参考图");
      if (images.length > 3) throw new Error("Qwen-Image-Edit 最多支持 3 张参考图");
      const wf = JSON.parse(JSON.stringify(i2iWorkflow)) as Record<string, any>;
      nodeOf(wf, "384").inputs.text = request.prompt;
      const names: string[] = [];
      for (const image of images) {
        const { bytes, mime } = await inputBytes(fetchFn, image, signal);
        names.push(await uploadImage(fetchFn, base, bytes, mime, signal));
      }
      // LoadImage 351/352/353 依次填入；不足 3 张时循环复用已上传的图片
      const loadNodes = ["351", "352", "353"];
      loadNodes.forEach((nodeId, index) => {
        nodeOf(wf, nodeId).inputs.image = names[index % names.length];
      });
      return runImageWorkflow(this, base, wf, signal);
    }

    throw new Error(`未知模型：${model}`);
  },
} satisfies ProviderDefinition<typeof rules>;
