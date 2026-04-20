export type OcrStylePresetId =
  | "modern_business"
  | "editorial_serif"
  | "classic_book"
  | "minimal_clean"
  | "scholarly_blue";

export type OcrStylePreset = {
  id: OcrStylePresetId;
  label: string;
  description: string;
  previewClassName: string;
  aiInstruction: string;
};

export const ocrStylePresets: OcrStylePreset[] = [
  {
    id: "modern_business",
    label: "现代商务",
    description: "标题利落，正文克制，适合汇报和培训文稿。",
    previewClassName: "preview-modern-business",
    aiInstruction: "整理成偏商务汇报的版式，尽量形成明确标题、小节和条目，语言稳重，适合继续编辑成正式材料。",
  },
  {
    id: "editorial_serif",
    label: "杂志文章",
    description: "标题更醒目，正文更有阅读感，适合课程和长文。",
    previewClassName: "preview-editorial-serif",
    aiInstruction: "整理成偏杂志文章的版式，增强标题和段落层次，让正文更顺滑、更适合连续阅读。",
  },
  {
    id: "classic_book",
    label: "古典书稿",
    description: "更沉稳的书稿风格，适合资料整理和阅读稿。",
    previewClassName: "preview-classic-book",
    aiInstruction: "整理成偏书稿和资料稿的版式，风格克制沉稳，段落清楚，适合做长期资料沉淀。",
  },
  {
    id: "minimal_clean",
    label: "极简清爽",
    description: "留白更多，信息干净，适合快速整理后的继续编辑。",
    previewClassName: "preview-minimal-clean",
    aiInstruction: "整理成偏极简清爽的版式，减少冗余表达，层级轻一些，适合后续继续人工编辑。",
  },
  {
    id: "scholarly_blue",
    label: "学术蓝灰",
    description: "更理性规整，适合讲义、研究材料和知识库沉淀。",
    previewClassName: "preview-scholarly-blue",
    aiInstruction: "整理成偏讲义和研究材料的版式，结构规整，逻辑清晰，适合知识库和资料型内容。",
  },
];

export const defaultOcrStylePresetId: OcrStylePresetId = "editorial_serif";

export function getOcrStylePreset(stylePresetId?: OcrStylePresetId) {
  return ocrStylePresets.find((preset) => preset.id === stylePresetId) ?? ocrStylePresets[0];
}
