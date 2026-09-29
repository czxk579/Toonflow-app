import { InMemoryCredentialStore } from "@earendil-works/pi-ai";
import { ModelRuntime } from "@earendil-works/pi-coding-agent";
import { getConfiguredModel } from "@/utils/ai";

export async function createAgentModel(providerId: string, modelId: string, thinkingLevel = "off") {
  const configured = getConfiguredModel(providerId, modelId);
  const { provider, model, baseUrl } = configured;
  const runtime = await ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, refreshOnCreate: false });
  runtime.registerProvider(providerId, {
    api: provider.protocol,
    baseUrl,
    models: [{
      id: model.id, name: model.label, reasoning: thinkingLevel !== "off",
      // ACT: 保留图片输入，由实际供应方判断该模型是否支持。
      input: ["text", "image"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: model.contextWindow, maxTokens: model.maxOutputTokens,
      // ACT: 强制使用 system role，避免对千问 / deepseek / 豆包等 OpenAI 兼容
      // API 发送不被接受的 "developer" role 而报 400（messages.[0].role）。
      compat: { supportsDeveloperRole: false },
    }],
  });
  await runtime.setRuntimeApiKey(providerId, provider.apiKey);
  return { ...configured, runtime };
}
