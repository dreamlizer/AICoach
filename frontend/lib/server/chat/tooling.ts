import { getToolById } from "@/lib/tools_registry";
import { getToolKnowledgeBase } from "@/lib/knowledge_base";

export function buildEffectiveToolPrompt(toolId?: string | null) {
  const tool = getToolById(toolId || undefined) || null;
  let effectiveToolPrompt = tool?.prompt;

  if (tool && tool.id === "team-diagnosis") {
    const knowledgeBase = getToolKnowledgeBase(tool.id);
    if (knowledgeBase && effectiveToolPrompt) {
      effectiveToolPrompt += knowledgeBase;
    }
  }

  return { tool, effectiveToolPrompt };
}
