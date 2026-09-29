// 用途：Toonflow-app 文本供应商「优云智算 / ModelVerse」
// 安装方式（必须修改源码重新构建，无法热上传）：
//   1. 把本文件放到 packages/providers/src/language/compshareLanguage.ts
//   2. 在 packages/providers/index.ts 中：
//        - 添加 `import compshare from "./src/language/compshareLanguage";`
//        - 在 languageProviders 数组里加 `compshare`
//   3. cd /app && bun install --frozen-lockfile && bun run build:server
//   4. 重启 Toonflow
// 协议：ModelVerse 完全兼容 OpenAI /v1/chat/completions，可由 Toonflow 自动路由
const rules = [
  {
    type: "input",
    field: "apiKey" as const,
    title: "ModelVerse API Key",
    value: "",
    props: { type: "password", showPassword: true, autocomplete: "off" },
  },
] as const;

const version = "1.0.0";

export default {
  id: "compshareLanguage" as const,
  label: "优云智算 ModelVerse（文本）",
  version,
  apiUrl: "https://api.modelverse.cn/v1",
  protocol: "openai-completions" as const,
  readme: "## 优云智算 ModelVerse 文本\n\nOpenAI 兼容的 `/v1/chat/completions` 端点，模型按 token 计费。\n\n- 性价比首选：`deepseek-v4-flash-sg`（¥1.5/MTok 输入、¥3/MTok 输出，质量高于 v3-flash）\n- 多模态补全：`qwen3-vl-flash`（¥0.15/MTok，可读图片生成提示词）\n- 中文创作：`qwen3.7-plus`（¥2/MTok 输入、¥8/MTok 输出，剧本润色佳）\n- 经济批量：`doubao-seed-2-0-mini-260215`（¥0.2/MTok 输入、¥2/MTok 输出）\n- 顶级质量：`deepseek-v4-pro-0813`（¥9/MTok 输入、¥27/MTok 输出，仅终稿润色用）",
  rules,
  models: [
    {
      id: "deepseek-v4-flash-sg",
      label: "DeepSeek V4 Flash（主力推荐 ¥1.5/¥3 /MTok）",
      type: "text",
      think: false,
    },
    {
      id: "qwen3-vl-flash",
      label: "Qwen3-VL Flash（多模态 ¥0.15/¥1.5 /MTok）",
      type: "text",
      think: false,
    },
    {
      id: "doubao-seed-2-0-mini-260215",
      label: "豆包 Seed 2.0 Mini（经济 ¥0.2/¥2 /MTok）",
      type: "text",
      think: false,
    },
    {
      id: "qwen3.7-plus",
      label: "Qwen3.7 Plus（中文创作 ¥2/¥8 /MTok）",
      type: "text",
      think: false,
    },
    {
      id: "deepseek-v4-pro-0813",
      label: "DeepSeek V4 Pro（终稿润色 ¥9/¥27 /MTok）",
      type: "text",
      think: false,
    },
  ] satisfies ProviderModel[],
} satisfies ProviderDefinition<typeof rules>;