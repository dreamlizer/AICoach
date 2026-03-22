import { executiveTools } from "./executive_tools";
import { assessmentTools } from "./assessment_tools";
import { ExecutiveTool } from "./types";

export const allTools: ExecutiveTool[] = [
  ...executiveTools,
  ...assessmentTools
];

export function getToolById(id: string | null | undefined): ExecutiveTool | undefined {
  if (!id) return undefined;
  return allTools.find((tool) => tool.id === id);
}

export function getToolsByCategory(category: string): ExecutiveTool[] {
  return allTools.filter((tool) => tool.category === category);
}

export { executiveTools, assessmentTools };
