// 用途：Toonflow-app 媒体供应商适配「ComfyUI 云 GPU（音频）」
// 安装方式：Toonflow「设置 → 媒体模型 → 添加供应商」，选择「文件导入」或「粘贴代码」，
// 保存后点「编辑」，在 API Key 一栏填入 ComfyUI 服务地址（云 GPU 实例的公网地址，如 https://8188-xxx.pod.compshare.cn）。
// 覆盖模型：
//   - qwen3-tts-narration：单人旁白解说（Qwen3-TTS 音色设计模式，用文字描述想要的音色，无需参考音频）
//   - qwen3-tts-dialogue：多角色对话（Qwen3-TTS 声音克隆模式，每个角色提供 1 段参考音频，最多 6 个角色）
// 调用协议（标准 ComfyUI HTTP API）：
//   POST {baseUrl}/prompt 提交 API 格式工作流 → 轮询 GET {baseUrl}/history/{prompt_id}
//   → 经 GET {baseUrl}/view 下载音频；参考音频经 POST {baseUrl}/upload/image 上传（旧版 ComfyUI 无 /upload/audio 路由）。
const rules = [
  {
    type: "input",
    field: "baseUrl" as const,
    title: "ComfyUI 服务地址",
    value: "http://127.0.0.1:8188",
    props: { placeholder: "http://公网IP:8188（云 GPU 实例的 ComfyUI 地址）" },
  },
] as const;

const version = "1.0.2";

// ===== 内嵌工作流（ComfyUI API 格式）=====
const narrationWorkflow = {"2":{"inputs":{"模型名称":"Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign","运行设备":"cuda","精度":"fp16"},"class_type":"Qwen3TTSModelLoader","_meta":{"title":"Qwen3 TTS 模型加载"}},"3":{"inputs":{"filename_prefix":"audio/ComfyUI","audio":["4",0]},"class_type":"SaveAudio","_meta":{"title":"保存音频"}},"4":{"inputs":{"文本":["11",0],"提示词":["10",0],"语言":"自动","自动卸载模型":false,"最大生成Token数":2048,"seed":83057147840400,"语速":1,"批量模式":false,"top_p":0.8,"top_k":50,"temperature":0.8,"repetition_penalty":1.1,"启用高级采样配置":false,"模型":["2",0]},"class_type":"Qwen3TTSVoiceDesign","_meta":{"title":"Qwen3 TTS 声音设计"}},"10":{"inputs":{"text":"年轻女声，语气具有仙侠气质。"},"class_type":"LayerUtility: TextBox","_meta":{"title":"音色描述"}},"11":{"inputs":{"text":"真正失败的人，就是那种特别害怕不能成功 怕死了，连试都不敢试的人"},"class_type":"LayerUtility: TextBox","_meta":{"title":"文本内容"}}};
const dialogueWorkflow = {"1":{"inputs":{"对白文本":["12",0],"seed":814272333498741,"语速":1,"语言":"自动","角色映射(可选)":"","启用停顿控制":true,"自动卸载模型":false,"最大生成Token数":2048,"top_p":0.8,"top_k":50,"temperature":0.8,"repetition_penalty":1.1,"启用高级采样配置":false,"模型":["2",0],"角色预设":["3",0]},"class_type":"Qwen3TTSDialogueSynthesis","_meta":{"title":"Qwen3 TTS 多角色对话合成"}},"2":{"inputs":{"模型名称":"Qwen/Qwen3-TTS-12Hz-1.7B-Base","运行设备":"cuda","精度":"fp16"},"class_type":"Qwen3TTSModelLoader","_meta":{"title":"Qwen3 TTS 模型加载"}},"3":{"inputs":{"角色预设1":["10",1],"角色预设2":["11",1]},"class_type":"Qwen3TTSRolePresetsInput","_meta":{"title":"Qwen3 TTS 角色预设输入"}},"4":{"inputs":{"文本":"","参考文本":"","语言":"自动","自动卸载模型":false,"最大生成Token数":2048,"seed":740161106432226,"语速":1,"批量模式":false,"top_p":0.8,"top_k":50,"temperature":0.8,"repetition_penalty":1.1,"启用高级采样配置":false,"模型":["2",0],"参考音频":["5",0]},"class_type":"Qwen3TTSVoiceClone","_meta":{"title":"Qwen3 TTS 声音克隆"}},"5":{"inputs":{"audio":"001-1.mp4"},"class_type":"LoadAudio","_meta":{"title":"加载音频"}},"6":{"inputs":{"文本":"","参考文本":"","语言":"自动","自动卸载模型":false,"最大生成Token数":2048,"seed":900735173986656,"语速":1,"批量模式":false,"top_p":0.8,"top_k":50,"temperature":0.8,"repetition_penalty":1.1,"启用高级采样配置":false,"模型":["2",0],"参考音频":["7",0]},"class_type":"Qwen3TTSVoiceClone","_meta":{"title":"Qwen3 TTS 声音克隆"}},"7":{"inputs":{"audio":"004-1.mp4"},"class_type":"LoadAudio","_meta":{"title":"加载音频"}},"8":{"inputs":{"filename_prefix":"audio/ComfyUI","audio":["1",0]},"class_type":"SaveAudio","_meta":{"title":"保存音频"}},"10":{"inputs":{"角色名":"华强","保存目录":"","角色预设":["4",1]},"class_type":"Qwen3TTSVoiceClonePromptSave","_meta":{"title":"Qwen3 TTS 角色预设保存"}},"11":{"inputs":{"角色名":"老板","保存目录":"","角色预设":["6",1]},"class_type":"Qwen3TTSVoiceClonePromptSave","_meta":{"title":"Qwen3 TTS 角色预设保存"}},"12":{"inputs":{"text":"老板:哥们你这瓜多少钱一斤哪\n华强:两块钱一斤\n老板:我操 你这瓜皮子是金子做的还是瓜粒子是金子做的\n华强:你瞧瞧现在这哪有瓜啊 你嫌贵 我还嫌贵呢\n\n"},"class_type":"LayerUtility: TextBox","_meta":{"title":"图层工具：文本框"}}};

const defaultVoiceDesc = "沉稳自然的女声，吐字清晰，语速平稳，适合纪录片旁白解说。";

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

function clampSpeed(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 1;
  return Math.min(2, Math.max(0.5, value));
}

/** 从「角色名: 台词」格式的对白文本中按首次出现顺序提取角色名 */
function parseRoles(script: string): string[] {
  const roles: string[] = [];
  for (const line of script.split("\n")) {
    const match = line.match(/^\s*([^:：]{1,20})\s*[:：]/);
    if (!match) continue;
    const name = match[1].trim();
    if (name && !roles.includes(name)) roles.push(name);
  }
  return roles;
}

/** MediaInput → 字节 */
async function inputBytes(
  fetchFn: typeof fetch,
  input: MediaInput,
  signal: AbortSignal,
): Promise<{ bytes: Uint8Array; mime: string }> {
  if (input.type === "binary") return { bytes: input.data, mime: input.mimeType || "audio/wav" };
  if (input.type === "base64") {
    const raw = input.data.indexOf(",") >= 0 ? (input.data.split(",").pop() as string) : input.data;
    return { bytes: new Uint8Array(Buffer.from(raw, "base64")), mime: input.mimeType || "audio/wav" };
  }
  const response = await fetchFn(input.url, { signal });
  if (!response.ok) throw new Error(`参考音频下载失败：HTTP ${response.status} ${input.url.slice(0, 120)}`);
  const mime = response.headers.get("content-type")?.split(";")[0].trim() || input.mimeType || "audio/wav";
  return { bytes: new Uint8Array(await response.arrayBuffer()), mime };
}

function extOf(mime: string): string {
  if (mime.includes("mpeg") || mime.endsWith("/mp3")) return "mp3";
  if (mime.includes("wav") || mime.includes("wave")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("flac")) return "flac";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("m4a")) return "m4a";
  if (mime.includes("webm")) return "webm";
  return "wav";
}

/** 上传音频到 ComfyUI，返回可填入 LoadAudio 节点的 audio 文件名 */
async function uploadAudio(
  fetchFn: typeof fetch,
  base: string,
  bytes: Uint8Array,
  mime: string,
  signal: AbortSignal,
): Promise<string> {
  // ACT: 部分旧版 ComfyUI 没有 /upload/audio 路由（POST 返回 405），但 /upload/image
  // 同样把文件存入 input 目录且不校验内容，LoadAudio 可直接引用；因此统一走 /upload/image。
  // 已在 2026-10-05 的 Bob同学镜像（v1.93）上实测：/upload/audio → 405，/upload/image 传 wav → 200。
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
    throw new Error(`音频上传到 ComfyUI 失败：HTTP ${response.status}${text ? ` ${text.slice(0, 200)}` : ""}`);
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

/** 从 history.outputs 中收集 SaveAudio 产出的音频文件（audio） */
function collectAudioFiles(outputs: Record<string, unknown>): ViewFile[] {
  const files: ViewFile[] = [];
  for (const nodeId of Object.keys(outputs)) {
    const nodeOut = object(outputs[nodeId]);
    const arr = nodeOut.audio;
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

/** 提交工作流 → 等产出 → 下载音频，返回 MediaAsset 数组 */
async function runAudioWorkflow(
  context: ProviderContext,
  base: string,
  workflow: Record<string, any>,
  signal: AbortSignal,
): Promise<MediaAsset[]> {
  const fetchFn = context.tool.fetch;
  const promptId = await submitWorkflow(fetchFn, base, workflow, signal);
  const outputs = await waitOutputs(fetchFn, base, promptId, signal);
  const files = collectAudioFiles(outputs);
  if (!files.length) throw new Error(`ComfyUI 未返回音频（${promptId}）`);
  const assets: MediaAsset[] = [];
  for (const file of files) {
    const { bytes, mime } = await downloadView(fetchFn, base, file, signal);
    assets.push({ mediaType: "audio", type: "binary", data: bytes, mimeType: mime || "audio/wav" });
  }
  return assets;
}

export default {
  id: "comfyuiAudio",
  label: "ComfyUI 云 GPU（音频）",
  version,
  readme:
    "## ComfyUI 云 GPU（音频）\n\n把云 GPU 实例上的 ComfyUI 作为 ToonFlow 的音频算力（Qwen3-TTS），按工作流直调，不经过第三方模型 API。\n\n- 模型 `qwen3-tts-narration`：单人旁白解说（音色设计模式：用文字描述想要的音色，无需参考音频）\n- 模型 `qwen3-tts-dialogue`：多角色对话（声音克隆模式：为每个角色提供 1 段参考音频，最多 6 个角色；对白文本用「角色名: 台词」格式，每行一句，角色按在文本中首次出现的顺序匹配参考音频）\n\n使用前请确认：ComfyUI 已在云 GPU 实例上启动，且 ToonFlow 服务器能访问到上面填写的地址；Qwen3-TTS 模型与自定义节点已在实例上就绪。",
  rules,
  models: [
    {
      id: "qwen3-tts-narration",
      label: "Qwen3-TTS 单人旁白（云 GPU）",
      type: "audio",
      voices: [
        { title: "沉稳女声·旁白", voice: "沉稳自然的女声，吐字清晰，语速平稳，适合纪录片旁白解说。" },
        { title: "年轻女声·仙侠", voice: "年轻女声，语气具有仙侠气质。" },
        { title: "浑厚男声·旁白", voice: "浑厚有力的成年男声，语气沉稳大气，适合史诗感旁白。" },
        { title: "温柔女声·情感", voice: "温柔亲切的女声，语气温暖柔和，适合情感类解说。" },
      ],
    },
    {
      id: "qwen3-tts-dialogue",
      label: "Qwen3-TTS 多角色对话（云 GPU）",
      type: "audio",
    },
  ] satisfies ProviderModel[],
  async generateAudio(request: AudioRequest): Promise<MediaAsset[]> {
    const base = baseOf(this.config);
    const signal = AbortSignal.any([AbortSignal.timeout(10 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const fetchFn = this.tool.fetch;
    const model = request.model;
    const text = (request.text ?? "").trim();
    if (!text) throw new Error("请提供要合成的文本");
    const speed = clampSpeed(request.speed);

    if (model === "qwen3-tts-narration") {
      const wf = JSON.parse(JSON.stringify(narrationWorkflow)) as Record<string, any>;
      nodeOf(wf, "11").inputs.text = text;
      nodeOf(wf, "10").inputs.text = (request.voice ?? "").trim() || defaultVoiceDesc;
      nodeOf(wf, "4").inputs["语速"] = speed;
      return runAudioWorkflow(this, base, wf, signal);
    }

    if (model === "qwen3-tts-dialogue") {
      const roles = parseRoles(text);
      if (!roles.length) throw new Error("多角色对话文本请用「角色名: 台词」格式，每行一句");
      if (roles.length > 6) throw new Error(`多角色对话最多支持 6 个角色，当前 ${roles.length} 个`);
      const audios = request.audios ?? [];
      if (audios.length < roles.length) {
        throw new Error(`多角色对话需要为每个角色提供 1 段参考音频：${roles.length} 个角色（${roles.join("、")}），只收到 ${audios.length} 段`);
      }
      const wf = JSON.parse(JSON.stringify(dialogueWorkflow)) as Record<string, any>;
      nodeOf(wf, "12").inputs.text = text;
      nodeOf(wf, "1").inputs["语速"] = speed;
      // 清掉模板自带的示例克隆链（4/5/6/7/10/11）与旧预设，按实际角色重建
      for (const id of ["4", "5", "6", "7", "10", "11"]) delete wf[id];
      const presets = nodeOf(wf, "3");
      for (const key of Object.keys(presets.inputs)) {
        if (/^角色预设\d+$/.test(key)) delete presets.inputs[key];
      }
      for (let i = 0; i < roles.length; i++) {
        const { bytes, mime } = await inputBytes(fetchFn, audios[i], signal);
        const name = await uploadAudio(fetchFn, base, bytes, mime, signal);
        const loadId = String(100 + i * 3);
        const cloneId = String(101 + i * 3);
        const saveId = String(102 + i * 3);
        const loadNode = JSON.parse(JSON.stringify(nodeOf(dialogueWorkflow, "5")));
        loadNode.inputs.audio = name;
        const cloneNode = JSON.parse(JSON.stringify(nodeOf(dialogueWorkflow, "4")));
        cloneNode.inputs["参考音频"] = [loadId, 0];
        const saveNode = JSON.parse(JSON.stringify(nodeOf(dialogueWorkflow, "10")));
        saveNode.inputs["角色名"] = roles[i];
        saveNode.inputs["角色预设"] = [cloneId, 1];
        wf[loadId] = loadNode;
        wf[cloneId] = cloneNode;
        wf[saveId] = saveNode;
        presets.inputs[`角色预设${i + 1}`] = [saveId, 1];
      }
      return runAudioWorkflow(this, base, wf, signal);
    }

    throw new Error(`未知模型：${model}`);
  },
} satisfies ProviderDefinition<typeof rules>;
