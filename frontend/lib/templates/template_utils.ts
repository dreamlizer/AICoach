import fs from "fs";
import path from "path";

export const loadTemplateHtml = (templateFile: string, templateLabel: string) => {
  const candidates = [
    path.join(process.cwd(), "ToolTemplate", templateFile),
    path.join(process.cwd(), "..", "ToolTemplate", templateFile)
  ];
  try {
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return fs.readFileSync(candidate, "utf-8");
      }
    }
    console.error(`${templateLabel} template file not found:`, candidates.join(" | "));
    return `Error: ${templateLabel} template not found.`;
  } catch (error) {
    console.error(`Error reading ${templateLabel} template:`, error);
    return `Error: Failed to load ${templateLabel} template.`;
  }
};
