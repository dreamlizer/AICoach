import fs from 'fs';
import path from 'path';

export function getToolKnowledgeBase(toolId: string): string {
  if (toolId !== 'team-diagnosis') return '';
  
  try {
    const templateDir = path.join(process.cwd(), 'ToolTemplate');
    const theoryPath = path.join(templateDir, '钟摆模型讲解.txt');
    const templatePath = path.join(templateDir, '团队钟摆诊断分析范本.txt');
    
    // Check if files exist before reading to avoid crashing
    if (!fs.existsSync(theoryPath) || !fs.existsSync(templatePath)) {
        console.warn(`Knowledge base files missing for tool: ${toolId}`);
        return '';
    }

    const theoryContent = fs.readFileSync(theoryPath, 'utf-8');
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    
    return `

[System Injection: Core Knowledge Base]

=== 钟摆模型讲解.txt ===
${theoryContent}

=== 团队钟摆诊断分析范本.txt ===
${templateContent}
`.trim();
  } catch (error) {
    console.error(`Failed to read tool templates for ${toolId}:`, error);
    return '';
  }
}
