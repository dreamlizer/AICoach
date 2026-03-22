export const formatQuestionsForReview = (questions: any[], answers: Record<number, string>, stats: any = null, usage: any = null) => {
    const computedStats: Record<string, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  
    const questionsText = questions.map((q, i) => {
      const selectedValue = answers[q.id];
      let selectedDim = "";
      
      // Robust dimension extraction
      if (selectedValue === q.optionA.value) {
        selectedDim = q.optionA.dimension || q.optionA.value;
      } else if (selectedValue === q.optionB.value) {
        selectedDim = q.optionB.dimension || q.optionB.value;
      }
      
      // Normalize dimension key (handle lowercase or missing)
      if (selectedDim) {
        // Extract the first letter (E/I/S/N/T/F/J/P) and ensure uppercase
        const match = selectedDim.match(/([EISNTFJP])/i);
        if (match) {
          const key = match[0].toUpperCase();
          if (typeof computedStats[key] === 'number') {
            computedStats[key]++;
          }
        }
      }
  
      const selectedText = selectedValue === q.optionA.value ? "A" : (selectedValue === q.optionB.value ? "B" : "Not Answered");
      
      return `【Question ${i + 1}】 (${q.optionA.dimension}/${q.optionB.dimension})\n` +
             `Scenario: ${q.scenario}\n` +
             `[A] ${q.optionA.text} (Value: ${q.optionA.value})\n` +
             `[B] ${q.optionB.text} (Value: ${q.optionB.value})\n` +
             `>> User Selection: ${selectedText}\n`;
    }).join('\n' + '-'.repeat(40) + '\n');
  
    // Use provided stats if available (e.g. from server), otherwise use computed ones
    const finalStats = stats || computedStats;
  
    const statsText = `\n${'='.repeat(40)}\n` +
      `【Dimension Statistics】\n` +
      `Energy:   E (${finalStats.E}) vs I (${finalStats.I})\n` +
      `Info:     S (${finalStats.S}) vs N (${finalStats.N})\n` +
      `Decision: T (${finalStats.T}) vs F (${finalStats.F})\n` +
      `Life:     J (${finalStats.J}) vs P (${finalStats.P})\n` +
      `${'='.repeat(40)}\n`;
      
    let usageText = "";
    if (usage) {
        usageText = `\n${'='.repeat(40)}\n` +
        `【System Performance】\n` +
        `Model: ${usage.model}\n` +
        `Generation Phase: ${(usage.genDuration || 0) / 1000}s\n` +
        `  - Input Tokens: ${usage.genInput || 0}\n` +
        `  - Output Tokens: ${usage.genOutput || 0}\n` +
        `Analysis Phase: ${(usage.anaDuration || 0) / 1000}s\n` +
        `  - Input Tokens: ${usage.anaInput || 0}\n` +
        `  - Output Tokens: ${usage.anaOutput || 0}\n` +
        `${'='.repeat(40)}\n`;
    }
  
    return questionsText + statsText + usageText;
  };

export const format4DQuestionsForReview = (questions: any[], answers: Record<number, string>, stats: any = null, usage: any = null) => {
    const computedStats: Record<string, number> = { Green: 0, Yellow: 0, Blue: 0, Orange: 0 };
  
    const questionsText = questions.map((q: any, i: number) => {
      const selectedValue = answers[q.id];
      let selectedOption = null;
  
      if (q.options && Array.isArray(q.options)) {
        selectedOption = q.options.find((o: any) => o.label === selectedValue || o.color === selectedValue || o.text === selectedValue) || null;
        if (!selectedOption && selectedValue !== undefined && selectedValue !== null) {
          const normalized = String(selectedValue).toLowerCase();
          selectedOption = q.options.find((o: any) => 
            String(o.label).toLowerCase() === normalized || String(o.color).toLowerCase() === normalized
          ) || null;
        }
      }
  
      const selectedLabel = selectedOption?.label || (selectedValue ? String(selectedValue) : "Not Answered");
      const selectedColor = selectedOption?.color || (typeof selectedValue === "string" ? selectedValue : "");
  
      if (selectedOption?.color && typeof computedStats[selectedOption.color] === 'number') {
        computedStats[selectedOption.color]++;
      } else if (selectedValue && typeof computedStats[selectedValue] === 'number') {
        computedStats[selectedValue]++;
      }
  
      const optionsText = (q.options || []).map((o: any) => `[${o.label}] ${o.text} (${o.color})`).join('\n');
      const selectionText = selectedColor ? `${selectedLabel} (${selectedColor})` : selectedLabel;
  
      return `【Question ${i + 1}】 ${q.title || ""}\n` +
             `Scenario: ${q.scenario || ""}\n` +
             `${optionsText}\n` +
             `>> User Selection: ${selectionText}\n`;
    }).join('\n' + '-'.repeat(40) + '\n');
  
    const finalStats = stats || computedStats;
  
    const statsText = `\n${'='.repeat(40)}\n` +
      `【维度得分统计】\n` +
      `Green (关注人/抽象): ${finalStats.Green || 0}\n` +
      `Blue (关注事/抽象): ${finalStats.Blue || 0}\n` +
      `Yellow (关注人/具象): ${finalStats.Yellow || 0}\n` +
      `Orange (关注事/具象): ${finalStats.Orange || 0}\n` +
      `${'='.repeat(40)}\n`;
  
    let usageText = "";
    if (usage) {
      usageText = `\n${'='.repeat(40)}\n` +
      `【系统性能统计】\n` +
      `题目生成阶段: ${(usage.genDuration || 0) / 1000}s\n` +
      `  - 输入 Token: ${usage.genInput || 0}\n` +
      `  - 输出 Token: ${usage.genOutput || 0}\n` +
      `报告分析阶段: ${(usage.anaDuration || 0) / 1000}s\n` +
      `  - 输入 Token: ${usage.anaInput || 0}\n` +
      `  - 输出 Token: ${usage.anaOutput || 0}\n` +
      `${'='.repeat(40)}\n`;
    }
  
    return questionsText + statsText + usageText;
  };

export const formatPDPQuestionsForReview = (questions: any[], answers: Record<number, string>, stats: any = null, usage: any = null) => {
  const computedStats: Record<string, number> = { Tiger: 0, Peacock: 0, Koala: 0, Owl: 0, Chameleon: 0 };

  const questionsText = questions.map((q: any, i: number) => {
    const selectedValue = answers[q.id];
    let selectedOption = null;

    if (q.options && Array.isArray(q.options)) {
      selectedOption =
        q.options.find((o: any) => o.label === selectedValue || o.value === selectedValue || o.text === selectedValue) || null;
      if (!selectedOption && selectedValue !== undefined && selectedValue !== null) {
        const normalized = String(selectedValue).toLowerCase();
        selectedOption =
          q.options.find(
            (o: any) =>
              String(o.label).toLowerCase() === normalized ||
              String(o.value).toLowerCase() === normalized ||
              String(o.text).toLowerCase() === normalized
          ) || null;
      }
    }

    const selectedLabel = selectedOption?.label || (selectedValue ? String(selectedValue) : "Not Answered");
    const selectedAnimal = selectedOption?.value || (typeof selectedValue === "string" ? selectedValue : "");

    if (selectedAnimal && typeof computedStats[selectedAnimal] === "number") {
      computedStats[selectedAnimal]++;
    }

    const optionsText = (q.options || []).map((o: any) => `[${o.label}] ${o.text} (${o.value})`).join("\n");
    const selectionText = selectedAnimal ? `${selectedLabel} (${selectedAnimal})` : selectedLabel;

    return `【Question ${i + 1}】 ${q.title || ""}\n` +
      `Scenario: ${q.scenario || ""}\n` +
      `${optionsText}\n` +
      `>> User Selection: ${selectionText}\n`;
  }).join("\n" + "-".repeat(40) + "\n");

  const finalStats = stats || computedStats;

  const statsText = `\n${"=".repeat(40)}\n` +
    `【动物类型统计】\n` +
    `Tiger: ${finalStats.Tiger || 0}\n` +
    `Peacock: ${finalStats.Peacock || 0}\n` +
    `Koala: ${finalStats.Koala || 0}\n` +
    `Owl: ${finalStats.Owl || 0}\n` +
    `Chameleon: ${finalStats.Chameleon || 0}\n` +
    `${"=".repeat(40)}\n`;

  let usageText = "";
  if (usage) {
    usageText = `\n${"=".repeat(40)}\n` +
      `【系统性能统计】\n` +
      `题目生成阶段: ${(usage.genDuration || 0) / 1000}s\n` +
      `  - 输入 Token: ${usage.genInput || 0}\n` +
      `  - 输出 Token: ${usage.genOutput || 0}\n` +
      `报告分析阶段: ${(usage.anaDuration || 0) / 1000}s\n` +
      `  - 输入 Token: ${usage.anaInput || 0}\n` +
      `  - 输出 Token: ${usage.anaOutput || 0}\n` +
      `${"=".repeat(40)}\n`;
  }

  return questionsText + statsText + usageText;
};

export const processReportContent = (report: string) => {
  if (!report) return "";
  return report
    .replace(/致死量禁忌/g, "易燃易爆点")
    .replace(/正确喂养姿势/g, "正确激活方式")
    .replace(/正确喂养知识/g, "正确激活方式");
};

export const parseMBTIQuestionsFromStream = (content: string) => {
  const startIdx = content?.indexOf('[');
  const endIdx = content?.lastIndexOf(']');
  let jsonStr = "";

  if (startIdx !== undefined && startIdx >= 0 && endIdx !== undefined && endIdx > startIdx) {
    jsonStr = content?.substring(startIdx, endIdx + 1) || "";
  } else {
    jsonStr = content?.replace(/```json\n?|\n?```/g, "").trim() || "";
  }

  let parsedQuestions: any = [];
  const normalizeJsonText = (raw: string) => {
    const cleaned = raw
      .replace(/\u0000/g, "")
      .replace(/```json\n?|\n?```/g, "")
      .replace(/^\s*\.\.\..*$/gm, "")
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/\r\n/g, "\n")
      .replace(/^\uFEFF/, "")
      .trim();
    let result = "";
    let inString = false;
    let escaped = false;
    for (let i = 0; i < cleaned.length; i += 1) {
      const char = cleaned[i];
      if (inString) {
        if (char === "\n") {
          result += "\\n";
          escaped = false;
          continue;
        }
        result += char;
        if (char === '"' && !escaped) {
          inString = false;
        }
        if (char === "\\" && !escaped) {
          escaped = true;
        } else {
          escaped = false;
        }
      } else {
        result += char;
        if (char === '"') {
          inString = true;
          escaped = false;
        }
      }
    }
    return result;
  };

  const tryParse = (raw: string) => {
    const cleaned = normalizeJsonText(raw);
    return JSON.parse(cleaned);
  };

  const extractJsonArrays = (raw: string) => {
    const arrays: string[] = [];
    let inString = false;
    let escaped = false;
    for (let i = 0; i < raw.length; i += 1) {
      const char = raw[i];
      if (inString) {
        if (char === '"' && !escaped) {
          inString = false;
        }
        if (char === "\\" && !escaped) {
          escaped = true;
        } else {
          escaped = false;
        }
        continue;
      }
      if (char === '"') {
        inString = true;
        escaped = false;
        continue;
      }
      if (char !== "[") continue;
      let depth = 0;
      let innerInString = false;
      let innerEscaped = false;
      for (let j = i; j < raw.length; j += 1) {
        const innerChar = raw[j];
        if (innerInString) {
          if (innerChar === '"' && !innerEscaped) {
            innerInString = false;
          }
          if (innerChar === "\\" && !innerEscaped) {
            innerEscaped = true;
          } else {
            innerEscaped = false;
          }
          continue;
        }
        if (innerChar === '"') {
          innerInString = true;
          innerEscaped = false;
          continue;
        }
        if (innerChar === "[") depth += 1;
        if (innerChar === "]") {
          depth -= 1;
          if (depth === 0) {
            arrays.push(raw.slice(i, j + 1));
            i = j;
            break;
          }
        }
      }
    }
    return arrays;
  };

  const getQuestionsArray = (parsed: any) => {
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.questions)) return parsed.questions;
    return [];
  };

  const scoreQuestionsArray = (arr: any[]) => {
    let score = 0;
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      if (item.id !== undefined && item.id !== null) score += 1;
      if (item.scenario || item.question || item.content || item.title) score += 2;
      if (Array.isArray(item.options) && item.options.length >= 2) score += 2;
    }
    return score;
  };

  try {
    parsedQuestions = tryParse(jsonStr);
  } catch (e) {
    try {
      const normalizedContent = normalizeJsonText(content);
      const candidates = extractJsonArrays(normalizedContent);
      let bestCandidate: any = null;
      let bestScore = -1;
      let bestLength = -1;

      for (const candidate of candidates) {
        try {
          const parsed = tryParse(candidate);
          const arr = getQuestionsArray(parsed);
          const score = scoreQuestionsArray(arr);
          if (score > bestScore || (score === bestScore && arr.length > bestLength)) {
            bestCandidate = parsed;
            bestScore = score;
            bestLength = arr.length;
          }
        } catch {
          continue;
        }
      }

      parsedQuestions = bestCandidate ?? tryParse(normalizedContent);
    } catch (innerError) {
      console.error("JSON Parse Error", innerError);
      throw new Error("Failed to parse model response");
    }
  }

  const questionsArray = getQuestionsArray(parsedQuestions);

  const normalizedQuestions = questionsArray.map((q: any) => {
    if (q.options && Array.isArray(q.options) && q.options.length >= 2) {
      const optA = q.options.find((o: any) => o.label === "A") || q.options[0];
      const optB = q.options.find((o: any) => o.label === "B") || q.options[1];

      const cleanOption = (opt: any) => {
        const valMatch = opt.value?.match(/([EISNTFJP])/i);
        const cleanValue = valMatch ? valMatch[0].toUpperCase() : opt.value;
        const cleanText = opt.text?.replace(/\s*\([EISNTFJP]\)\s*$/i, '').trim();
        return { text: cleanText, value: cleanValue, dimension: cleanValue };
      };

      return { ...q, optionA: cleanOption(optA), optionB: cleanOption(optB) };
    }
    return q;
  });

  if (!normalizedQuestions || !Array.isArray(normalizedQuestions) || normalizedQuestions.length === 0) {
    throw new Error("Invalid questions format");
  }

  return normalizedQuestions;
};

export const parsePDPQuestionsFromStream = (content: string) => {
  const startIdx = content?.indexOf('[');
  const endIdx = content?.lastIndexOf(']');
  let jsonStr = "";

  if (startIdx !== undefined && startIdx >= 0 && endIdx !== undefined && endIdx > startIdx) {
    jsonStr = content?.substring(startIdx, endIdx + 1) || "";
  } else {
    jsonStr = content?.replace(/```json\n?|\n?```/g, "").trim() || "";
  }

  let parsedQuestions: any = [];
  const normalizeJsonText = (raw: string) => {
    const cleaned = raw
      .replace(/\u0000/g, "")
      .replace(/```json\n?|\n?```/g, "")
      .replace(/^\s*\.\.\..*$/gm, "")
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/\r\n/g, "\n")
      .replace(/^\uFEFF/, "")
      .trim();
    let result = "";
    let inString = false;
    let escaped = false;
    for (let i = 0; i < cleaned.length; i += 1) {
      const char = cleaned[i];
      if (inString) {
        if (char === "\n") {
          result += "\\n";
          escaped = false;
          continue;
        }
        result += char;
        if (char === '"' && !escaped) {
          inString = false;
        }
        if (char === "\\" && !escaped) {
          escaped = true;
        } else {
          escaped = false;
        }
      } else {
        result += char;
        if (char === '"') {
          inString = true;
          escaped = false;
        }
      }
    }
    return result;
  };

  const tryParse = (raw: string) => {
    const cleaned = normalizeJsonText(raw);
    return JSON.parse(cleaned);
  };

  const getQuestionsArray = (parsed: any) => {
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.questions)) return parsed.questions;
    return [];
  };

  const extractJsonArrays = (raw: string) => {
    const arrays: string[] = [];
    let inString = false;
    let escaped = false;
    for (let i = 0; i < raw.length; i += 1) {
      const char = raw[i];
      if (inString) {
        if (char === '"' && !escaped) {
          inString = false;
        }
        if (char === "\\" && !escaped) {
          escaped = true;
        } else {
          escaped = false;
        }
        continue;
      }
      if (char === '"') {
        inString = true;
        escaped = false;
        continue;
      }
      if (char !== "[") continue;
      let depth = 0;
      let innerInString = false;
      let innerEscaped = false;
      for (let j = i; j < raw.length; j += 1) {
        const innerChar = raw[j];
        if (innerInString) {
          if (innerChar === '"' && !innerEscaped) {
            innerInString = false;
          }
          if (innerChar === "\\" && !innerEscaped) {
            innerEscaped = true;
          } else {
            innerEscaped = false;
          }
          continue;
        }
        if (innerChar === '"') {
          innerInString = true;
          innerEscaped = false;
          continue;
        }
        if (innerChar === "[") depth += 1;
        if (innerChar === "]") {
          depth -= 1;
          if (depth === 0) {
            arrays.push(raw.slice(i, j + 1));
            i = j;
            break;
          }
        }
      }
    }
    return arrays;
  };

  const normalizeQuestions = (questionsArray: any[]) => {
    const normalized = questionsArray.map((q: any, idx: number) => {
      const options = Array.isArray(q.options) ? q.options : [];
      const normalizedOptions = options.map((opt: any, index: number) => {
        const label = String(opt.label || String.fromCharCode(65 + index)).toUpperCase();
        const text = String(opt.text ?? "").trim();
        const value = String(opt.value ?? opt.animal ?? "").trim();
        return { label, text, value };
      });
      const scenario = q.scenario ?? q.question ?? q.content ?? q.title ?? "";
      return {
        id: Number(q.id ?? idx + 1),
        title: q.title ? String(q.title) : "",
        scenario: String(scenario).trim(),
        options: normalizedOptions
      };
    });
    return normalized;
  };

  const extractQuestionObjects = (raw: string) => {
    const objects: string[] = [];
    let inString = false;
    let escaped = false;
    let depth = 0;
    let start = -1;
    for (let i = 0; i < raw.length; i += 1) {
      const char = raw[i];
      if (inString) {
        if (char === '"' && !escaped) inString = false;
        if (char === "\\" && !escaped) escaped = true;
        else escaped = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        escaped = false;
        continue;
      }
      if (char === "{") {
        if (depth === 0) start = i;
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          objects.push(raw.slice(start, i + 1));
          start = -1;
        }
      }
    }
    return objects;
  };

  const parseLooseQuestions = (raw: string) => {
    const normalized = raw.replace(/\r\n/g, "\n");
    const blocks: string[] = [];
    const questionRegex = /Q\s*\d+\s*[:：][\s\S]*?(?=\nQ\s*\d+\s*[:：]|$)/gi;
    let match: RegExpExecArray | null = null;
    while ((match = questionRegex.exec(normalized)) !== null) {
      blocks.push(match[0]);
    }
    const animalMap: Record<string, string> = {
      A: "Tiger",
      B: "Peacock",
      C: "Owl",
      D: "Koala",
      E: "Chameleon"
    };
    const questions = blocks.map((block, idx) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const scenarioLines: string[] = [];
      const preOptionLines: string[] = [];
      const options: { label: string; text: string; value: string }[] = [];
      let title = "";

      for (const line of lines) {
        const qLineMatch = line.match(/^Q\s*\d+\s*[:：]\s*(.*)$/i);
        if (qLineMatch) {
          const remainder = qLineMatch[1]?.trim();
          if (remainder) title = remainder;
          continue;
        }
        const optionMatch = line.match(/^([A-E])[\.\)：:：)\]]\s*(.*)$/i);
        if (optionMatch) {
          const label = optionMatch[1].toUpperCase();
          const rawText = optionMatch[2]?.trim() || "";
          const animalMatch = rawText.match(/\((Tiger|Peacock|Koala|Owl|Chameleon)\)|\[(Tiger|Peacock|Koala|Owl|Chameleon)\]|【(Tiger|Peacock|Koala|Owl|Chameleon)】/i);
          const animal = (animalMatch?.[1] || animalMatch?.[2] || animalMatch?.[3] || animalMap[label]) as string;
          let cleanText = rawText
            .replace(/\s*[\(\[【]?(Tiger|Peacock|Koala|Owl|Chameleon)[\)\]】]?/i, "")
            .replace(/\(\s*\)|（\s*）|\[\s*\]|【\s*】/g, "")
            .trim();
          if (!cleanText) {
            cleanText = rawText
              .replace(/\s*[\(\[【]?(Tiger|Peacock|Koala|Owl|Chameleon)[\)\]】]?/gi, "")
              .replace(/\(\s*\)|（\s*）|\[\s*\]|【\s*】/g, "")
              .trim();
          }
          options.push({ label, text: cleanText, value: animal });
          continue;
        }
        if (line.startsWith("场景")) {
          const scenarioText = line.replace(/^场景[:：]?\s*/i, "").trim();
          if (scenarioText) scenarioLines.push(scenarioText);
          continue;
        }
        if (options.length === 0) {
          scenarioLines.push(line);
          preOptionLines.push(line);
        }
      }

      const fallbackScenario = scenarioLines.join(" ").trim() || preOptionLines.join(" ").trim() || title;
      return {
        id: idx + 1,
        title,
        scenario: fallbackScenario,
        options
      };
    });
    return questions;
  };

  let normalizedQuestions = parseLooseQuestions(content);

  if (normalizedQuestions.length < 15) {
    try {
      parsedQuestions = tryParse(jsonStr);
    } catch (e) {
      try {
        const normalizedContent = normalizeJsonText(content);
        const candidates = extractJsonArrays(normalizedContent).sort((a, b) => b.length - a.length);
        let parsed = null;
        for (const candidate of candidates) {
          try {
            parsed = tryParse(candidate);
            break;
          } catch {
            parsed = null;
          }
        }
        parsedQuestions = parsed ?? tryParse(normalizedContent);
      } catch (innerError) {
        console.error("JSON Parse Error", innerError);
        parsedQuestions = [];
      }
    }

    const questionsArray = getQuestionsArray(parsedQuestions);
    normalizedQuestions = normalizeQuestions(questionsArray);

    if (normalizedQuestions.length < 15) {
      const objectCandidates = extractQuestionObjects(normalizeJsonText(content));
      const questionObjects: any[] = [];
      for (const candidate of objectCandidates) {
        try {
          const parsed = tryParse(candidate);
          if (parsed && Array.isArray(parsed.options) && (parsed.scenario || parsed.question || parsed.content || parsed.title)) {
            questionObjects.push(parsed);
          }
        } catch {
          continue;
        }
      }
      if (questionObjects.length > 0) {
        const map = new Map<string, any>();
        questionObjects.forEach((item: any, idx: number) => {
          const key = String(item.id ?? idx);
          if (!map.has(key)) map.set(key, item);
        });
        normalizedQuestions = normalizeQuestions(Array.from(map.values()));
      }
    }
  }

  if (!normalizedQuestions || !Array.isArray(normalizedQuestions) || normalizedQuestions.length === 0) {
    throw new Error("Invalid questions format");
  }

  return normalizedQuestions;
};

// Helper to extract the main title and description (Niche Section) from the 4D report
export const extract4DReportSections = (content: string) => {
    // 1. Find the first H3 (Team Ecology Niche)
    // Use regex that handles both start of string and newline, and capture the title
    const nicheMatch = content.match(/(?:^|\n)###\s+(.+?)(?:\n|$)/);
    
    if (!nicheMatch) {
        return { nicheTitle: "", nicheBody: "", remainingBody: content };
    }

    const nicheTitle = nicheMatch[1].trim();
    const matchIndex = nicheMatch.index || 0;
    const matchLength = nicheMatch[0].length;
    
    // The content after the first H3 title
    let fullBody = content.slice(matchIndex + matchLength);
    
    // 2. Anti-Duplication: Check for recurrence of the H3 Title marker
    // If the LLM repeats "### 你的团队生态位" (even inline), we cut it off.
    // NOTE: This check is dangerous for legacy data where "### 你的团队生态位" IS the title of the section.
    // We should only cut if the marker appears AFTER some content, implying a duplication.
    // For safety, we'll skip this aggressive cut for now as it's causing data loss in legacy records.
    /*
    const duplicateMarker = "### 你的团队生态位";
    const duplicateIndex = fullBody.indexOf(duplicateMarker);
    
    if (duplicateIndex !== -1) {
        fullBody = fullBody.slice(0, duplicateIndex);
    }
    */
    
    // 3. Find the start of the next section
    // Strategy: Look for EITHER #### (New Format) OR ### (Old Format)
    // We prioritize ####, but if not found, we fallback to the next ### as the split point.
    
    let nextSectionIndex = -1;
    let isOldFormat = false;

    const newFormatMatch = fullBody.match(/(?:^|\n)####\s+/);
    if (newFormatMatch && newFormatMatch.index !== undefined) {
        nextSectionIndex = newFormatMatch.index;
    } else {
        // Fallback: Look for the next ### (Old Format)
        const oldFormatMatch = fullBody.match(/(?:^|\n)###\s+/);
        if (oldFormatMatch && oldFormatMatch.index !== undefined) {
            nextSectionIndex = oldFormatMatch.index;
            isOldFormat = true;
        }
    }
    
    let nicheBody = "";
    let remainingBody = "";

    if (nextSectionIndex !== -1) {
        nicheBody = fullBody.slice(0, nextSectionIndex).trim();
        remainingBody = fullBody.slice(nextSectionIndex).trim();
        
        // Data Normalization: If Old Format detected, upgrade H3 headers to H4
        // so the UI components (which expect H4 for sections) can render them correctly.
        if (isOldFormat) {
            remainingBody = remainingBody.replace(/(^|\n)###\s+/g, '$1#### ');
        }
    } else {
        nicheBody = fullBody.trim();
        remainingBody = "";
    }

    return { nicheTitle, nicheBody, remainingBody };
};
