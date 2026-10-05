// 用途：Toonflow-app 媒体供应商适配「ComfyUI 云 GPU（视频）」
// 安装方式：Toonflow「设置 → 媒体模型 → 添加供应商」，选择「文件导入」或「粘贴代码」，
// 保存后点「编辑」，在 API Key 一栏填入 ComfyUI 服务地址（云 GPU 实例的公网地址，如 https://8188-xxx.pod.compshare.cn）。
// 覆盖模型：
//   - minimax-h3-t2v：文生视频（MiniMax-H3）
//   - minimax-h3-i2v：图生视频（MiniMax-H3 参考图模式，1～3 张参考图，比例可选 9:16 / 16:9）
//   - minimax-h3-r2v：参考生视频（MiniMax-H3 多参考图模式，最多 5 张，比例可选 9:16 / 16:9）
// 调用协议（标准 ComfyUI HTTP API）：
//   POST {baseUrl}/prompt 提交 API 格式工作流 → 轮询 GET {baseUrl}/history/{promptId}
//   → 经 GET {baseUrl}/view 下载 mp4；参考图经 POST {baseUrl}/upload/image 上传。
const rules = [
  {
    type: "input",
    field: "baseUrl" as const,
    title: "ComfyUI 服务地址",
    value: "http://127.0.0.1:8188",
    props: { placeholder: "http://公网IP:8188（云 GPU 实例的 ComfyUI 地址）" },
  },
] as const;

const version = "1.1.4";

// ===== 内嵌工作流（ComfyUI API 格式）=====
const t2vWorkflow = {"4":{"inputs":{"clip_name":"qwen3vl_32b_minimax_h3_int8_convrot.safetensors","type":"minimax","device":"default"},"class_type":"CLIPLoader","_meta":{"title":"加载CLIP"}},"5":{"inputs":{"vae_name":"minimax_h3_video_vae_fp16.safetensors"},"class_type":"VAELoader","_meta":{"title":"加载VAE"}},"6":{"inputs":{"vae_name":"minimax_h3_audio_vae_fp32.safetensors"},"class_type":"VAELoader","_meta":{"title":"加载VAE"}},"8":{"inputs":{"unet_name":"minimax_h3_fl2va_pruned_int8_convrot.safetensors","weight_dtype":"default"},"class_type":"UNETLoader","_meta":{"title":"UNet加载器"}},"22":{"inputs":{"expression":"max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17","values.a":["27",0]},"class_type":"ComfyMathExpression","_meta":{"title":"数学表达式"}},"23":{"inputs":{"aspect_ratio":"16:9 (Widescreen)","megapixels":0.7,"multiple":32},"class_type":"ResolutionSelector","_meta":{"title":"分辨率选择器"}},"24":{"inputs":{"prompt":["335",0],"width":["23",0],"height":["23",1],"length":["22",1],"clip":["4",0],"vae":["5",0]},"class_type":"MiniMaxH3ImageToVideo","_meta":{"title":"MiniMax H3 Image to Video"}},"26":{"inputs":{"frame_rate":24,"loop_count":0,"filename_prefix":"H3_T2V","format":"video/h264-mp4","pix_fmt":"yuv420p10le","crf":19,"save_metadata":false,"trim_to_audio":false,"pingpong":false,"save_output":true,"images":["334",0],"audio":["332",0]},"class_type":"VHS_VideoCombine","_meta":{"title":"Video Combine 🎥🅥🅗🅢"}},"27":{"inputs":{"value":12},"class_type":"PrimitiveFloat","_meta":{"title":"视频时长（秒）"}},"186":{"inputs":{"lora_name":"minimax_h3_turbo_v4_step600_ema.safetensors","strength_model":1.0000000000000002,"model":["8",0]},"class_type":"LoraLoaderModelOnly","_meta":{"title":"LoRA加载器（仅模型）"}},"227":{"inputs":{"noise":["228",0],"guider":["230",0],"sampler":["231",0],"sigmas":["232",0],"latent_image":["24",1]},"class_type":"SamplerCustomAdvanced","_meta":{"title":"自定义采样器（高级）"}},"228":{"inputs":{"noise_seed":932733980357873},"class_type":"RandomNoise","_meta":{"title":"随机噪波"}},"230":{"inputs":{"model":["186",0],"conditioning":["24",0]},"class_type":"BasicGuider","_meta":{"title":"基本引导器"}},"231":{"inputs":{"sampler_name":"euler"},"class_type":"KSamplerSelect","_meta":{"title":"K采样器选择"}},"232":{"inputs":{"scheduler":"beta","steps":6,"denoise":1,"model":["186",0]},"class_type":"BasicScheduler","_meta":{"title":"基本调度器"}},"332":{"inputs":{"samples":["227",0],"vae":["6",0]},"class_type":"VAEDecodeAudio","_meta":{"title":"VAE解码（音频）"}},"333":{"inputs":{"samples":["227",0],"vae":["5",0]},"class_type":"VAEDecode","_meta":{"title":"VAE解码"}},"334":{"inputs":{"anything":["333",0]},"class_type":"easy cleanGpuUsed","_meta":{"title":"清理显存占用"}},"335":{"inputs":{"text":"A young woman in flowing cyan hanfu walks slowly across an ancient stone bridge at dawn, willow branches swaying in the breeze, mist drifting over the water, her sleeves fluttering gently, soft morning light, smooth natural motion, cinematic"},"class_type":"LayerUtility: TextBox","_meta":{"title":"图层工具：文本框"}}};
const i2vWorkflow = {"4":{"inputs":{"clip_name":"qwen3vl_32b_minimax_h3_int8_convrot.safetensors","type":"minimax","device":"default"},"class_type":"CLIPLoader","_meta":{"title":"加载CLIP"}},"5":{"inputs":{"vae_name":"minimax_h3_video_vae_fp16.safetensors"},"class_type":"VAELoader","_meta":{"title":"加载VAE"}},"6":{"inputs":{"vae_name":"minimax_h3_audio_vae_fp32.safetensors"},"class_type":"VAELoader","_meta":{"title":"加载VAE"}},"8":{"inputs":{"unet_name":"minimax_h3_fl2va_pruned_int8_convrot.safetensors","weight_dtype":"default"},"class_type":"UNETLoader","_meta":{"title":"UNet加载器"}},"56":{"inputs":{"expression":"max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17","values.a":["58",0]},"class_type":"ComfyMathExpression","_meta":{"title":"数学表达式"}},"58":{"inputs":{"value":12},"class_type":"PrimitiveFloat","_meta":{"title":"视频时长（秒）"}},"59":{"inputs":{"aspect_ratio":"9:16 (Portrait Widescreen)","megapixels":0.7,"multiple":32},"class_type":"ResolutionSelector","_meta":{"title":"分辨率选择器"}},"61":{"inputs":{"image":"微信图片_20261004173011_105_49.png"},"class_type":"LoadImage","_meta":{"title":"加载图像"}},"62":{"inputs":{"images":["63",0]},"class_type":"PreviewImage","_meta":{"title":"预览图像"}},"63":{"inputs":{"aspect_ratio":"original","proportional_width":1,"proportional_height":1,"fit":"crop","method":"lanczos","round_to_multiple":"32","scale_to_side":"total_pixel(kilo pixel)","scale_to_length":1536,"background_color":"#000000","image":["61",0]},"class_type":"LayerUtility: ImageScaleByAspectRatio V2","_meta":{"title":"图层工具：按宽高比缩放 V2"}},"67":{"inputs":{"frame_rate":24,"loop_count":0,"filename_prefix":"H3_I2V","format":"video/h264-mp4","pix_fmt":"yuv420p10le","crf":19,"save_metadata":false,"trim_to_audio":false,"pingpong":false,"save_output":true,"images":["332",0],"audio":["331",0]},"class_type":"VHS_VideoCombine","_meta":{"title":"Video Combine 🎥🅥🅗🅢"}},"186":{"inputs":{"lora_name":"minimax_h3_turbo_v4_step600_ema.safetensors","strength_model":1.0000000000000002,"model":["8",0]},"class_type":"LoraLoaderModelOnly","_meta":{"title":"LoRA加载器（仅模型）"}},"235":{"inputs":{"noise_seed":367268280917119},"class_type":"RandomNoise","_meta":{"title":"随机噪波"}},"238":{"inputs":{"model":["186",0],"conditioning":["329",0]},"class_type":"BasicGuider","_meta":{"title":"基本引导器"}},"239":{"inputs":{"noise":["235",0],"guider":["238",0],"sampler":["241",0],"sigmas":["240",0],"latent_image":["329",1]},"class_type":"SamplerCustomAdvanced","_meta":{"title":"自定义采样器（高级）"}},"240":{"inputs":{"scheduler":"beta","steps":6,"denoise":1,"model":["186",0]},"class_type":"BasicScheduler","_meta":{"title":"基本调度器"}},"241":{"inputs":{"sampler_name":"euler"},"class_type":"KSamplerSelect","_meta":{"title":"K采样器选择"}},"329":{"inputs":{"prompt":["333",0],"width":["59",0],"height":["59",1],"length":["56",1],"ref_image_size":"match","clip":["4",0],"vae":["5",0],"audio_vae":["6",0],"ref_images.ref_image_0":["63",0]},"class_type":"MiniMaxH3ReferenceToVideo","_meta":{"title":"MiniMax H3 Reference to Video"}},"330":{"inputs":{"samples":["239",0],"vae":["5",0]},"class_type":"VAEDecode","_meta":{"title":"VAE解码"}},"331":{"inputs":{"samples":["239",0],"vae":["6",0]},"class_type":"VAEDecodeAudio","_meta":{"title":"VAE解码（音频）"}},"332":{"inputs":{"anything":["330",0]},"class_type":"easy cleanGpuUsed","_meta":{"title":"清理显存占用"}},"333":{"inputs":{"text":"The woman slowly turns her head toward the camera, her ponytail and sleeves fluttering in the breeze, mist flowing across the water behind her, willow branches swaying, subtle and graceful motion"},"class_type":"LayerUtility: TextBox","_meta":{"title":"图层工具：文本框"}}};
const r2vWorkflow = {"4":{"inputs":{"clip_name":"qwen3vl_32b_minimax_h3_int8_convrot.safetensors","type":"minimax","device":"default"},"class_type":"CLIPLoader","_meta":{"title":"加载CLIP"}},"5":{"inputs":{"vae_name":"minimax_h3_video_vae_fp16.safetensors"},"class_type":"VAELoader","_meta":{"title":"加载VAE"}},"6":{"inputs":{"vae_name":"minimax_h3_audio_vae_fp32.safetensors"},"class_type":"VAELoader","_meta":{"title":"加载VAE"}},"9":{"inputs":{"unet_name":"minimax_h3_ref2va_pruned_int8_convrot.safetensors","weight_dtype":"default"},"class_type":"UNETLoader","_meta":{"title":"UNet加载器"}},"84":{"inputs":{"value":12},"class_type":"PrimitiveFloat","_meta":{"title":"视频时长（秒）"}},"91":{"inputs":{"frame_rate":24,"loop_count":0,"filename_prefix":"H3_Ref2VA","format":"video/h264-mp4","pix_fmt":"yuv420p10le","crf":19,"save_metadata":false,"trim_to_audio":false,"pingpong":false,"save_output":true,"images":["330",0],"audio":["331",0]},"class_type":"VHS_VideoCombine","_meta":{"title":"Video Combine 🎥🅥🅗🅢"}},"92":{"inputs":{"expression":"max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17","values.a":["84",0]},"class_type":"ComfyMathExpression","_meta":{"title":"数学表达式"}},"97":{"inputs":{"image":"canvas-image-358931501452118720-56f24889-0-28d9a78231c9 (1).jpg"},"class_type":"LoadImage","_meta":{"title":"加载图像"}},"99":{"inputs":{"aspect_ratio":"original","proportional_width":1,"proportional_height":1,"fit":"crop","method":"lanczos","round_to_multiple":"32","scale_to_side":"total_pixel(kilo pixel)","scale_to_length":1536,"background_color":"#000000","image":["97",0]},"class_type":"LayerUtility: ImageScaleByAspectRatio V2","_meta":{"title":"图层工具：按宽高比缩放 V2"}},"100":{"inputs":{"images":["99",0]},"class_type":"PreviewImage","_meta":{"title":"预览图像"}},"101":{"inputs":{"image":"canvas-image-358930869506856192-58ea160d-0-0715b2d27992 (1).jpg"},"class_type":"LoadImage","_meta":{"title":"加载图像"}},"102":{"inputs":{"aspect_ratio":"original","proportional_width":1,"proportional_height":1,"fit":"crop","method":"lanczos","round_to_multiple":"32","scale_to_side":"total_pixel(kilo pixel)","scale_to_length":1536,"background_color":"#000000","image":["101",0]},"class_type":"LayerUtility: ImageScaleByAspectRatio V2","_meta":{"title":"图层工具：按宽高比缩放 V2"}},"103":{"inputs":{"images":["102",0]},"class_type":"PreviewImage","_meta":{"title":"预览图像"}},"105":{"inputs":{"aspect_ratio":"16:9 (Widescreen)","megapixels":0.7,"multiple":32},"class_type":"ResolutionSelector","_meta":{"title":"分辨率选择器"}},"108":{"inputs":{"prompt":["333",0],"width":["105",0],"height":["105",1],"length":["92",1],"ref_image_size":"max","clip":["4",0],"vae":["5",0],"audio_vae":["6",0],"ref_images.ref_image_0":["99",0],"ref_images.ref_image_1":["102",0],"ref_images.ref_image_2":["129",0],"ref_images.ref_image_3":["168",0],"ref_images.ref_image_4":["172",0]},"class_type":"MiniMaxH3ReferenceToVideo","_meta":{"title":"MiniMax H3 Reference to Video"}},"129":{"inputs":{"aspect_ratio":"original","proportional_width":1,"proportional_height":1,"fit":"crop","method":"lanczos","round_to_multiple":"32","scale_to_side":"total_pixel(kilo pixel)","scale_to_length":1536,"background_color":"#000000","image":["132",0]},"class_type":"LayerUtility: ImageScaleByAspectRatio V2","_meta":{"title":"图层工具：按宽高比缩放 V2"}},"130":{"inputs":{"images":["129",0]},"class_type":"PreviewImage","_meta":{"title":"预览图像"}},"132":{"inputs":{"image":"canvas-image-358930857095858048-02028a58-0-218f9bd9a0e1 (1).jpg"},"class_type":"LoadImage","_meta":{"title":"加载图像"}},"168":{"inputs":{"aspect_ratio":"original","proportional_width":1,"proportional_height":1,"fit":"crop","method":"lanczos","round_to_multiple":"32","scale_to_side":"total_pixel(kilo pixel)","scale_to_length":1536,"background_color":"#000000","image":["170",0]},"class_type":"LayerUtility: ImageScaleByAspectRatio V2","_meta":{"title":"图层工具：按宽高比缩放 V2"}},"169":{"inputs":{"images":["168",0]},"class_type":"PreviewImage","_meta":{"title":"预览图像"}},"170":{"inputs":{"image":"canvas-image-358930847874697664-a0d71976-0-14756fe1abdb (1).jpg"},"class_type":"LoadImage","_meta":{"title":"加载图像"}},"172":{"inputs":{"aspect_ratio":"original","proportional_width":1,"proportional_height":1,"fit":"crop","method":"lanczos","round_to_multiple":"32","scale_to_side":"total_pixel(kilo pixel)","scale_to_length":1536,"background_color":"#000000","image":["174",0]},"class_type":"LayerUtility: ImageScaleByAspectRatio V2","_meta":{"title":"图层工具：按宽高比缩放 V2"}},"173":{"inputs":{"images":["172",0]},"class_type":"PreviewImage","_meta":{"title":"预览图像"}},"174":{"inputs":{"image":"canvas-image-358930442147090368-987933ee-0-502958413ec7 (1).jpg"},"class_type":"LoadImage","_meta":{"title":"加载图像"}},"187":{"inputs":{"lora_name":"minimax_h3_turbo_v4_step600_ema.safetensors","strength_model":1.0000000000000002,"model":["9",0]},"class_type":"LoraLoaderModelOnly","_meta":{"title":"LoRA加载器（仅模型）"}},"243":{"inputs":{"noise_seed":132520014162854},"class_type":"RandomNoise","_meta":{"title":"随机噪波"}},"246":{"inputs":{"model":["187",0],"conditioning":["108",0]},"class_type":"BasicGuider","_meta":{"title":"基本引导器"}},"247":{"inputs":{"noise":["243",0],"guider":["246",0],"sampler":["249",0],"sigmas":["248",0],"latent_image":["108",1]},"class_type":"SamplerCustomAdvanced","_meta":{"title":"自定义采样器（高级）"}},"248":{"inputs":{"scheduler":"beta","steps":6,"denoise":1,"model":["187",0]},"class_type":"BasicScheduler","_meta":{"title":"基本调度器"}},"249":{"inputs":{"sampler_name":"euler"},"class_type":"KSamplerSelect","_meta":{"title":"K采样器选择"}},"330":{"inputs":{"anything":["332",0]},"class_type":"easy cleanGpuUsed","_meta":{"title":"清理显存占用"}},"331":{"inputs":{"samples":["247",0],"vae":["6",0]},"class_type":"VAEDecodeAudio","_meta":{"title":"VAE解码（音频）"}},"332":{"inputs":{"samples":["247",0],"vae":["5",0]},"class_type":"VAEDecode","_meta":{"title":"VAE解码"}},"333":{"inputs":{"text":"以上图片的视觉语言——复古中式动画片头、硬边剪影、漫画拼贴、非对称分屏、强烈几何色块、中文片头署名、古代犯罪气质。\n复古日系动画片头风，动态图形拼贴感，硬边剪影、漫画拼贴、非对称分屏、强烈几何色块、中文片头署名。\n15秒16:9横版古装悬疑电影片头。氛围神秘、酷、灵动、有古代犯罪感，不恐怖、不沉重，也不变成欢乐爵士MV。整体是片头包装感，不是写实剧情动画。\n全片规则：中文署名要清晰可读，允许动效（细线框先画出、名字从框内滑入、文字逐个出现、被色块遮罩揭示、最后短暂停住）；不新增英文、不乱码、不让中文写错；所有中文署名和职位只出现一次，不重复职位、不重复人名、同一人不得担任多个职位；转场只做干脆利落的硬转场，不要柔和溶解、不要流体转场。\n0-2秒 | 白底线框先出现，分屏边界快速划出，色块和画格逐块贴入。\n2-4秒 | 中式竹简转场，人物剪影随鼓点滑入。\n4-6秒 | 车门竖切转场，道具特写弹出。\n6-8秒 | 人物长影擦屏，遮挡换场。\n8-10秒 | 金线切割，中文署名遮罩揭示。\n10-12秒 | 巨大中文汉字遮罩转场。\nBGM：原创15秒片头音乐，60%悬疑、40%中式，以低音持续音、紧张弦乐拨奏、冷感合成器脉冲、低音鼓、中式"},"class_type":"LayerUtility: TextBox","_meta":{"title":"图层工具：文本框"}}};

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
  // ACT: 当前 ToonFlow 的供应商编辑框只暴露一个 "API Key" 输入（存为 config.apiKey），
  // 自定义 rules 字段在该版本 UI 上不渲染；因此优先读取用户实际能填到的 apiKey。
  const raw = String(config.apiKey || config.baseUrl || "").trim().replace(/\/+$/, "");
  if (!raw) throw new Error("请先在供应商编辑页的 API Key 中填写 ComfyUI 服务地址");
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

/** 宽高比 → ResolutionSelector 节点的 aspect_ratio 取值；不在表中的比例保持工作流默认 */
const resolutionAspectOf: Record<string, string> = {
  "16:9": "16:9 (Widescreen)",
  "9:16": "9:16 (Portrait Widescreen)",
};

function applyAspectRatio(wf: Record<string, any>, nodeId: string, ratio: string | undefined): void {
  const mapped = ratio ? resolutionAspectOf[String(ratio).trim()] : undefined;
  if (mapped) nodeOf(wf, nodeId).inputs.aspect_ratio = mapped;
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
/** 轮询直到产出就绪，返回 history.outputs。
 *  - 502/503/504 视为网关抖动，在 5 分钟预算内重试等待恢复，绝不因此中断远端任务。
 *  - 只有用户主动取消时才调用 /interrupt（它是全局中断，会杀掉服务端正在跑的任务）。
 *    2026-10-05 实测教训：网关抖动导致轮询 502，旧逻辑的无条件 /interrupt
 *    把三个正在采样中的视频任务全杀掉了（服务端记录为 execution_interrupted）。 */
async function waitOutputs(
  fetchFn: typeof fetch,
  base: string,
  promptId: string,
  signal: AbortSignal,
  intervalMs = 5000,
): Promise<Record<string, unknown>> {
  const transientStatus = new Set([502, 503, 504]);
  const maxUnstableMs = 5 * 60_000;
  let unstableSince = 0;
  const noteUnstable = () => {
    const now = Date.now();
    if (!unstableSince) unstableSince = now;
    if (now - unstableSince > maxUnstableMs) {
      throw new Error(
        `ComfyUI 服务端持续无响应（${promptId}）：网关多次返回 502/503/504，` +
          "可能是实例重启或链路抖动；任务状态未知，请在 ComfyUI 页面确认后再决定是否重提",
      );
    }
  };
  try {
    while (true) {
      signal.throwIfAborted();
      let response: Response;
      try {
        response = await fetchFn(`${base}/history/${encodeURIComponent(promptId)}`, { signal });
      } catch (err) {
        if (signal.aborted) throw err;
        noteUnstable();
        await wait(signal, intervalMs);
        continue;
      }
      if (!response.ok) {
        if (transientStatus.has(response.status)) {
          noteUnstable();
          await wait(signal, intervalMs);
          continue;
        }
        throw new Error(`ComfyUI 查询任务失败：HTTP ${response.status}（${promptId}）`);
      }
      unstableSince = 0;
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
    // ACT: /interrupt 是全局中断；只有用户明确取消才调用，传输抖动绝不中断，避免误杀正常任务。
    const aborted = signal.aborted || (err instanceof Error && err.name === "AbortError");
    if (aborted) await interruptQuietly(fetchFn, base);
    throw err;
  }
}

interface ViewFile {
  filename: string;
  subfolder: string;
  type: string;
}

/** 从 history.outputs 中收集 VHS 产出的视频文件（gifs） */
function collectFiles(outputs: Record<string, unknown>): ViewFile[] {
  const files: ViewFile[] = [];
  for (const nodeId of Object.keys(outputs)) {
    const nodeOut = object(outputs[nodeId]);
    const arr = nodeOut.gifs;
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

/** 提交工作流 → 等产出 → 下载 mp4，返回 MediaAsset 数组 */
async function runVideoWorkflow(
  context: ProviderContext,
  base: string,
  workflow: Record<string, any>,
  signal: AbortSignal,
): Promise<MediaAsset[]> {
  const fetchFn = context.tool.fetch;
  const promptId = await submitWorkflow(fetchFn, base, workflow, signal);
  const outputs = await waitOutputs(fetchFn, base, promptId, signal);
  const files = collectFiles(outputs);
  if (!files.length) throw new Error(`ComfyUI 未返回视频（${promptId}）`);
  const assets: MediaAsset[] = [];
  for (const file of files) {
    const { bytes, mime } = await downloadView(fetchFn, base, file, signal);
    assets.push({ mediaType: "video", type: "binary", data: bytes, mimeType: mime || "video/mp4" });
  }
  return assets;
}

export default {
  id: "comfyuiVideo",
  label: "ComfyUI 云 GPU（视频）",
  version,
  readme:
    "## ComfyUI 云 GPU（视频）\n\n把云 GPU 实例上的 ComfyUI 作为 ToonFlow 的视频算力，按工作流直调，不经过第三方模型 API。\n\n- 模型 `minimax-h3-t2v`：文生视频（MiniMax-H3，默认 12 秒）\n- 模型 `minimax-h3-i2v`：图生视频（MiniMax-H3 参考图模式，支持 1～3 张参考图，比例可在 9:16 / 16:9 之间选择）\n- 模型 `minimax-h3-r2v`：参考生视频（MiniMax-H3 多参考图模式，最多 5 张，比例可在 9:16 / 16:9 之间选择）\n\n使用前请确认：ComfyUI 已在云 GPU 实例上启动，且 ToonFlow 服务器能访问到上面填写的地址；工作流依赖的模型与自定义节点已在实例上就绪。视频任务约需数分钟，供应商内部会轮询等待。",
  rules,
  models: [
    {
      id: "minimax-h3-t2v",
      label: "MiniMax-H3 文生视频（云 GPU）",
      type: "video",
      mode: ["text"],
      durationResolutionMap: [{ duration: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["768P"] }],
    },
    {
      id: "minimax-h3-i2v",
      label: "MiniMax-H3 图生视频（云 GPU）",
      type: "video",
      mode: [["imageReference:3"]],
      durationResolutionMap: [{ duration: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["768P"] }],
    },
    {
      id: "minimax-h3-r2v",
      label: "MiniMax-H3 参考生视频（云 GPU）",
      type: "video",
      mode: [["imageReference:5"]],
      durationResolutionMap: [{ duration: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["768P"] }],
    },
  ] satisfies ProviderModel[],
  async generateVideo(request: VideoRequest): Promise<MediaAsset[]> {
    const base = baseOf(this.config);
    const signal = AbortSignal.any([AbortSignal.timeout(20 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const fetchFn = this.tool.fetch;
    const model = request.model;

    if (model === "minimax-h3-t2v") {
      const wf = JSON.parse(JSON.stringify(t2vWorkflow)) as Record<string, any>;
      nodeOf(wf, "335").inputs.text = request.prompt;
      if (request.duration !== undefined) nodeOf(wf, "27").inputs.value = clampInt(request.duration, 5, 15);
      return runVideoWorkflow(this, base, wf, signal);
    }

    if (model === "minimax-h3-i2v") {
      const images = [...(request.images ?? [])];
      if (!images.length && request.firstFrame) images.push(request.firstFrame);
      if (!images.length) throw new Error("图生视频需要 1～3 张参考图");
      if (images.length > 3) throw new Error("图生视频最多支持 3 张参考图");
      const wf = JSON.parse(JSON.stringify(i2vWorkflow)) as Record<string, any>;
      nodeOf(wf, "333").inputs.text = request.prompt;
      applyAspectRatio(wf, "59", request.ratio);
      const refNode = nodeOf(wf, "329");
      for (let index = 0; index < images.length; index++) {
        const { bytes, mime } = await inputBytes(fetchFn, images[index], signal);
        const name = await uploadImage(fetchFn, base, bytes, mime, signal);
        if (index === 0) {
          nodeOf(wf, "61").inputs.image = name;
          continue;
        }
        // 第 2、3 张参考图：复制 LoadImage（61）+ 按宽高比缩放（63）节点链并接入
        const loadId = String(900 + index * 2);
        const scaleId = String(901 + index * 2);
        const loadNode = JSON.parse(JSON.stringify(nodeOf(wf, "61")));
        loadNode.inputs.image = name;
        const scaleNode = JSON.parse(JSON.stringify(nodeOf(wf, "63")));
        scaleNode.inputs.image = [loadId, 0];
        wf[loadId] = loadNode;
        wf[scaleId] = scaleNode;
        refNode.inputs[`ref_images.ref_image_${index}`] = [scaleId, 0];
      }
      if (request.duration !== undefined) nodeOf(wf, "58").inputs.value = clampInt(request.duration, 5, 15);
      return runVideoWorkflow(this, base, wf, signal);
    }

    if (model === "minimax-h3-r2v") {
      const images = request.images ?? [];
      if (!images.length) throw new Error("参考生视频需要至少 1 张参考图（最多 5 张）");
      if (images.length > 5) throw new Error("参考生视频最多支持 5 张参考图");
      const wf = JSON.parse(JSON.stringify(r2vWorkflow)) as Record<string, any>;
      nodeOf(wf, "333").inputs.text = request.prompt;
      applyAspectRatio(wf, "105", request.ratio);
      const names: string[] = [];
      for (const image of images) {
        const { bytes, mime } = await inputBytes(fetchFn, image, signal);
        names.push(await uploadImage(fetchFn, base, bytes, mime, signal));
      }
      // LoadImage 97/101/132/170/174 依次填入；不足 5 张时循环复用已上传的图片
      const loadNodes = ["97", "101", "132", "170", "174"];
      loadNodes.forEach((nodeId, index) => {
        nodeOf(wf, nodeId).inputs.image = names[index % names.length];
      });
      if (request.duration !== undefined) nodeOf(wf, "84").inputs.value = clampInt(request.duration, 5, 15);
      return runVideoWorkflow(this, base, wf, signal);
    }

    throw new Error(`未知模型：${model}`);
  },
} satisfies ProviderDefinition<typeof rules>;
