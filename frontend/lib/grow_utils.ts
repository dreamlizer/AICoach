import { stage4Reply } from "@/lib/pipeline";
import { buildGrowCardHtml, GrowCardPayload, SAMPLE_CASE, FALLBACK_PAYLOAD } from "@/lib/templates/index";
import { parseJsonResult } from "@/lib/utils";
import { PipelineConfig } from "@/lib/stage_settings";

export const checkGrowTrigger = (toolId: string | null, message: string) => {
  if (toolId !== "grow") return { isSample: false, isCard: false };
  
  // Strict triggers to avoid false positives
  const isSample = /样本|示例|样例|demo|例子/i.test(message);
  
  // Require "卡片" combined with action verbs, OR explicit confirmation like "好/需要" AFTER a proposal (though we can't check context easily here, so we stick to explicit intent)
  // Removed loose words: "给我", "看看", "输出", "制作", "整理", "总结" (unless combined)
  const isCard = /(生成|制作|整理|输出|要|来).{0,6}(卡片|总结)|(卡片|总结).{0,6}(生成|制作|整理|输出|要|来)/i.test(message);
  
  return { isSample, isCard };
};

export const generateGrowCard = async (
  toolId: string | null,
  message: string,
  effectiveToolPrompt: string,
  config: PipelineConfig,
  strategy?: string
): Promise<{ html: string | null, usage?: any }> => {
  const { isSample, isCard } = checkGrowTrigger(toolId, message);

  if (!((isSample || isCard) && effectiveToolPrompt)) {
    return { html: null };
  }

  const dataPrompt = `
${effectiveToolPrompt}

${isSample ? `请基于以下具体案例生成卡片内容，不要提及“样本/模板/示例”等字样。\n${SAMPLE_CASE}` : `当前用户请求：${message}`}

请只输出 JSON，不要输出其它文字或 Markdown。
JSON 格式：
{
  "goal": "一句话目标，可包含 <span class=\"highlight-text\">关键数字</span>",
  "reality": ["现状1", "现状2", "现状3"],
  "options": ["方案1", "方案2", "方案3"],
  "will": ["即刻：...", "本周：...", "机制：..."],
  "sloganCn": "中文标语",
  "footerSub": "英文副标题"
}
`.trim();

  // Updated stage4Reply call with config
  const replyResult = await stage4Reply(strategy || "生成卡片数据", config, dataPrompt);
  const jsonText = replyResult.reply;
  
  let payload: GrowCardPayload | null = null;
  try {
    const { cleanJsonBlock } = await import("@/lib/utils");
    payload = JSON.parse(cleanJsonBlock(jsonText));
  } catch (error) {
    console.error("JSON Parse Error:", error);
    payload = null;
  }

  const finalPayload = payload || FALLBACK_PAYLOAD;
  const html = buildGrowCardHtml(finalPayload);
  return { html: `\`\`\`html\n${html}\n\`\`\``, usage: replyResult.usage };
};
