import { Message } from "./types";

export const extractHtmlFromText = (text: string): string | null => {
  const htmlFence = text.match(/```html\s*([\s\S]*?)```/i);
  if (htmlFence) return htmlFence[1].trim();
  const genericFence = text.match(/```([\s\S]*?)```/);
  if (genericFence && /<\/?[a-z][\s\S]*>/i.test(genericFence[1])) {
    return genericFence[1].trim();
  }
  const inlineHtml = text.match(/(<html[\s\S]*<\/html>)/i);
  if (inlineHtml) return inlineHtml[1].trim();
  return null;
};

export const stripHtmlFromText = (text: string): string => {
  let result = text;
  result = result.replace(/```html\s*[\s\S]*?```/gi, "");
  result = result.replace(/```[\s\S]*?```/g, (block) =>
    /<\/?[a-z][\s\S]*>/i.test(block) ? "" : block
  );
  result = result.replace(/<html[\s\S]*<\/html>/gi, "");
  return result.trim();
};

export const cleanJsonBlock = (text: string): string => {
  const jsonFence = text.match(/```json\s*([\s\S]*?)```/i);
  if (jsonFence) return jsonFence[1].trim();
  
  const genericFence = text.match(/```([\s\S]*?)```/);
  if (genericFence) return genericFence[1].trim();
  
  // Fallback: Try to find the first '{' and last '}' to extract potential JSON
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return text.substring(firstBrace, lastBrace + 1);
  }

  return text.trim();
};

export const generateToolSuffix = () => {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  return `${month}${day}-${hour}${minute}`;
};

export const formatDateTime = (date: string | Date, language: string = 'zh') => {
  return new Date(date).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  }).replace(/\//g, '-');
};

export function parseJsonResult(text: string): any {
  try {
    const cleaned = cleanJsonBlock(text);
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    // Fallback attempt: if strict parsing fails, try to find object-like structure
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
             return JSON.parse(jsonMatch[0]);
        }
    } catch (e2) {}
    
    return { analysis_log: "JSON Parsing Failed." };
  }
}

export function processHistoryMessage(msg: any): Message[] {
  const baseMsg: Message = {
    id: msg.id.toString(),
    role: msg.role,
    content: msg.content,
    kind: msg.kind || "text"
  };

  if (msg.kind === "analysis" && msg.metadata) {
    try {
      baseMsg.debugInfo = JSON.parse(msg.metadata);
    } catch (e) {
      console.error("Failed to parse analysis metadata", e);
    }
  }

  const uiMessages: Message[] = [];

  if (msg.kind === "text") {
    const extracted = extractHtmlFromText(baseMsg.content);
    const cleaned = stripHtmlFromText(baseMsg.content);
    
    if (extracted) {
      uiMessages.push({
        ...baseMsg,
        content: cleaned,
        kind: "text"
      });
      uiMessages.push({
        id: (parseInt(baseMsg.id) + 1).toString(), // temporary fake id
        role: "ai",
        content: extracted,
        kind: "canvas",
        canvasHtml: extracted,
        status: "done"
      });
    } else {
      uiMessages.push(baseMsg);
    }
  } else {
    uiMessages.push(baseMsg);
  }

  return uiMessages;
}

export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

