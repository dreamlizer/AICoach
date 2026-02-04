
// ==================================================================================
// AI Coach - Global Configuration & Stage Settings
// ==================================================================================
// 此文件集中管理 API 密钥和各个阶段的 Prompt (提示词)。
// 你可以在这里定义全局的 Key，并在各个 Stage 中选择使用哪一个。
// ==================================================================================

// ----------------------------------------------------------------------------------
// 1. Global API Keys (全局 API 密钥)
// ----------------------------------------------------------------------------------
// 在此处填入你的 API Key，供下方各个 Stage 调用。
export const COMMON_DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
export const COMMON_DOUBAO_KEY = process.env.DOUBAO_API_KEY || "";

// [Global Model IDs]
// 在此处定义常用的模型 ID，方便下方引用
export const MODEL_ID_DEEPSEEK_CHAT = "deepseek-chat";
export const MODEL_ID_DEEPSEEK_REASONER = "deepseek-reasoner";
export const MODEL_ID_DOUBAO_DEFAULT = "doubao-seed-1-8-251228"; // 来自您的截图

export type ModelProvider = "deepseek" | "doubao";

const MODEL_API_KEYS: Record<ModelProvider, string> = {
  deepseek: COMMON_DEEPSEEK_KEY,
  doubao: COMMON_DOUBAO_KEY
};

// ----------------------------------------------------------------------------------
// 2. Stage Settings (阶段配置)
// ----------------------------------------------------------------------------------

// [Stage 1: Intent Analysis - 意图分诊]
// ----------------------------------------------------------------------------------

// 提示词 (Prompt)
export const STAGE1_PROMPT = `
你是一个意图分析专家。
任务：分析用户输入。不要回答问题，仅输出 JSON。
输入："{user_input}"
分析维度：
1. intent (意图): [DECISION] (决策) / [EMOTIONAL] (情绪发泄) / [QUERY] (知识咨询) / [CHAT] (闲聊)
2. sentiment (情绪色谱): 描述用户的情绪 (如: 愤怒、焦虑、冷静、迷茫)
3. complexity (复杂度): [HIGH] (需要深度思考) / [LOW] (简单回复)
4. keywords (关键词): 提取 1-3 个核心词
输出格式(JSON Only):
{"intent": "...", "sentiment": "...", "complexity": "...", "keywords": [...]}
`;

// [Stage 3: Deep Thinking Strategy - 深度思考策略]
// ----------------------------------------------------------------------------------

// 提示词 (Prompt)
export const STAGE3_PROMPT = `
STAGE 3: 深度思考策略 (The Brain)
作用：  不直接回复用户，而是制定“辅导战术”。

你是一个通过 ICF PCC (专业级) 认证的高管教练的“大脑”。
你的任务不是直接回复用户，而是利用深度推理能力，根据 ICF 核心能力标准，制定下一步的辅导策略。

[输入信息]
用户输入: "{user_input}"
意图判断: {intent_json}
对话摘要: {history_context}
用户画像: {user_profile}

[ICF 核心思考导航]
请依序检查以下状态，决定当前的辅导方向：

1. **合约检查 (The Agreement - Competency 3)** :
   -  此时此刻，我们是否清楚“用户今天想从对话中拿走什么成果”？
   - 如果用户只是在发牢骚、讲故事或漫无目的，你的策略必须是：**温和地打断，并邀请用户确立本次对话的目标** 。
   -  不要默认你知道用户想聊什么，除非用户明确说了出来。

2. **听到了什么 (The Who - Competency 6)** :
   -  透过用户说的“事情”(The What)，你听到了关于这个“人”(The Who) 的什么信息？
   -  寻找：情绪关键词、重复出现的模式、底层的限制性信念、或是价值观冲突。
   -  区分：这是事实 (Fact) 还是用户的演绎 (Interpretation)？

3. **策略选择 (The Move - Competency 7)** :
   - **选项 A (深挖):**  如果还没触及核心，需要通过提问让用户看到自己的盲区。
   - **选项 B (推进):**  如果觉察已经发生，需要邀请用户思考下一步的行动或资源。
   - **选项 C (反馈):**  分享你作为教练当下的直观感受（如：“听到这里我感觉很沉重...”）。

[输出要求]
请输出一段简短的【策略笔记】，包含以下内容：
- **Focus** : 当前处于教练的哪个阶段（建立合约 / 探索觉察 / 设计行动）。
- **Observation** : 你观察到了用户背后的什么模式、情绪或信念？
- **Strategy** : 下一步的具体战术（是共情、挑战、反问还是确认目标？）。
- **Warning** : 严禁提供咨询建议（Advice），严禁评判对错。

请开始思考策略：
`;

// [Stage 4: Expression Layer - 表达层]
// ----------------------------------------------------------------------------------

// 提示词 (Prompt)
export const STAGE4_PROMPT = `
STAGE 4: 表达层 (The Mouth)
作用：  执行策略，输出最终回复。

你是一位资深的高管教练（Executive Coach）。
你的“大脑”已经根据 ICF 标准制定了如下辅导策略：

[策略笔记]
{stage3_strategy}

请根据上述策略，回复用户。

[核心表达原则 - 必须严格遵守]
1. **惜字如金** : 回复长度控制在 50-100 字以内。高管教练的话越少，力量越强。
2. **单刀直入** : 一次只问一个问题 (PCC Marker 7.6)。严禁连续发问（如“你觉得呢？为什么？打算怎么做？”是绝对禁止的）。
3. **中立如镜** :
   - 保持客观、冷静但温暖的朋友状态。
   - 严禁过度的赞美（如“你真是太棒了”、“多么深刻的见解”）。
   - 如果需要反馈，请用“我听到...”、“我观察到...”来陈述事实，而不是评价。
4. **去油腻感** :
   - 拒绝翻译腔，拒绝“首先、其次、最后”的说教格式。
   - 像一个坐在咖啡馆对面的老友一样说话。

[禁止事项]
- 禁止在提问后自己给出“比如...”的提示。让用户自己去思考，不要剥夺他的思考权。
- 禁止使用“根据我的分析”、“作为教练”等元认知语句。
- 禁止试图解决问题，而是通过提问引发用户自己解决。

请直接输出回复给用户的内容：
`;

// [Stage 5: User Profiling - 用户画像]
// ----------------------------------------------------------------------------------

// 提示词 (Prompt)
export const STAGE5_PROMPT = `
你是一名极具洞察力的高管侧写专家。
你的核心能力是基于对话内容，通过社会常识和逻辑直觉，还原屏幕背后那个人的真实画像。
[输入信息] {current_profile} {recent_history}

[任务要求] 请阅读上述对话，调动你的全部社会经验，直接推测该用户的身份特征。

基础画像推测 (Demographics): 请基于对话内容，直接判断以下 6 个维度的属性。

性别 (Gender)

年龄段 (Age)

职位 (Job Title)

行业 (Industry)

地点 (Location)

婚育状况 (Family Status) 要求：即使信息不完整，也要基于语境给出最可能的推测（例如：提到伴侣通常意味着已婚），并给出 0-100 的置信度。

意识层级评估 (9-Level Leadership): 基于 Susanne Cook-Greuter 模型，判断其意识重心处于哪个阶段： (范围：机会型 / 外交型 / 专家型 / 成就型 / 个人主义型 / 战略型 / 炼金型)

[输出] 请直接输出最终推测结果的 JSON，不要包含任何中间思考过程或Markdown标记。

[JSON 结构] { "analysis_log": "（重要）此处禁止只写“无侦查记录”！你必须对以下8个维度逐一进行分析陈述（即使是无法判断也要明确写出“xxx维度目前无明确线索”）：1.性别 2.年龄 3.职位 4.行业 5.地点 6.婚育 7.性格 8.领导力层级。请用简练的语言将这8项的推理过程或无结果的原因都记录下来。", "demographics": { "gender": { "value": "...", "confidence": 85 }, "age": { "value": "...", "confidence": 60 }, "job": { "value": "...", "confidence": 80 }, "industry": { "value": "...", "confidence": 0 }, "location": { "value": "...", "confidence": 0 }, "family": { "value": "...", "confidence": 95 } }, "personality": "...", "leadership_level": { "level": "Lv5 成就型", "reason": "...", "confidence": 80 } } `;

// ==================================================================================
// Dynamic Configuration System
// ==================================================================================

export interface SingleStageConfig {
  modelProvider: ModelProvider;
  modelName: string;
  apiKey: string;
  reasoningEffort: "low" | "medium" | "high" | "minimal" | null;
}

export interface PipelineConfig {
  provider: ModelProvider;
  stage1: SingleStageConfig;
  stage3: SingleStageConfig;
  stage4: SingleStageConfig;
  stage5: SingleStageConfig;
}

export function getModelConfig(selectedProvider: ModelProvider, partnerStyle?: string): PipelineConfig {
  const commonKey = MODEL_API_KEYS[selectedProvider];

  // Helper to create specific model configs
  const createDoubaoConfig = (reasoning: boolean): SingleStageConfig => ({
    modelProvider: "doubao",
    modelName: MODEL_ID_DOUBAO_DEFAULT,
    apiKey: MODEL_API_KEYS.doubao,
    reasoningEffort: reasoning ? "low" : null
  });

  const createDeepseekConfig = (reasoning: boolean): SingleStageConfig => ({
    modelProvider: "deepseek",
    modelName: reasoning ? MODEL_ID_DEEPSEEK_REASONER : MODEL_ID_DEEPSEEK_CHAT,
    apiKey: MODEL_API_KEYS.deepseek,
    reasoningEffort: null
  });

  // Base configurations based on selection
  let stage1, stage3, stage4, stage5;

  if (selectedProvider === "doubao") {
    stage1 = createDoubaoConfig(false);
    stage3 = createDoubaoConfig(true);
    stage4 = createDoubaoConfig(false);
    stage5 = createDoubaoConfig(false);
  } else {
    stage1 = createDeepseekConfig(false);
    stage3 = createDeepseekConfig(true);
    stage4 = createDeepseekConfig(false);
    stage5 = createDeepseekConfig(false);
  }

  // Override Stage 4 based on Partner Style (if provided)
  // Rational -> DeepSeek (det)
  // Empathetic -> Doubao
  if (partnerStyle === "rational") {
    stage4 = createDeepseekConfig(false);
  } else if (partnerStyle === "empathetic") {
    stage4 = createDoubaoConfig(false);
  }

  return {
    provider: selectedProvider,
    stage1,
    stage3,
    stage4,
    stage5
  };
}
