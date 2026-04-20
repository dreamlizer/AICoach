"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, Download, Search, Sparkles, X } from "lucide-react";

type SkillSource = "lijigang" | "khazix" | "goeasyway";
type ReadingMode = "guide" | "source" | "files";
type RelatedFileKind = "markdown" | "html" | "code" | "image";

type SkillRelatedFile = {
  id: string;
  label: string;
  path: string;
  kind: RelatedFileKind;
  description: string;
};

type SkillEntry = {
  id: string;
  originName: string;
  source: SkillSource;
  displayTitle: string;
  summary: string;
  abstract: string;
  readerHint: string;
  tags: string[];
  whenToUse: string;
  howToUse: string[];
  whatToLearn: string[];
  readFocus: string;
  sourcePath?: string;
  sourceMarkdown?: string;
  relatedFiles?: SkillRelatedFile[];
};

type DownloadFile = {
  name: string;
  content: string;
};

type SkillHubWorkbenchProps = {
  onClose: () => void;
};

const ljgRaw = (id: string) => `https://raw.githubusercontent.com/lijigang/ljg-skills/master/skills/${id}/SKILL.md`;
const ljgWorkflowRaw = (id: string) => `https://raw.githubusercontent.com/lijigang/ljg-skills/master/workflows/${id}/SKILL.md`;
const ljgSkillFile = (id: string, path: string) => `https://raw.githubusercontent.com/lijigang/ljg-skills/master/skills/${id}/${path}`;
const khazixRaw = (id: string) => `https://raw.githubusercontent.com/KKKKhazix/khazix-skills/main/${id}/SKILL.md`;
const khazixFile = (id: string, path: string) => `https://raw.githubusercontent.com/KKKKhazix/khazix-skills/main/${id}/${path}`;
const goeasywayRaw = (path: string) => `https://raw.githubusercontent.com/goeasyway/my_notebooklm_with_ppteditable/main/${path}`;

const sourceLabel: Record<SkillSource, string> = {
  lijigang: "李继刚",
  khazix: "Khazix",
  goeasyway: "goeasyway",
};

function guideMarkdown(entry: SkillEntry) {
  return `# ${entry.displayTitle}

## 这是什么
${entry.summary}

## 什么时候最适合用
${entry.whenToUse}

## 你可以怎么读它
${entry.howToUse.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## 学它真正能带走什么
${entry.whatToLearn.map((item) => `- ${item}`).join("\n")}

## 读原文时重点看哪里
${entry.readFocus}
`;
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[-_]/g, " ");
}

const skillEntries: SkillEntry[] = [
  {
    id: "ljg-card",
    originName: "ljg-card",
    source: "lijigang",
    displayTitle: "把观点做成知识卡片",
    summary: "把一段内容整理成适合分享、适合一眼看懂的视觉卡片。",
    abstract: "适合把一篇文章、一个概念或一句洞察压缩成一张有传播力的卡片。",
    readerHint: "重点不是排版炫技，而是学它怎么做信息取舍。",
    tags: ["视觉卡片", "信息设计", "传播"],
    whenToUse: "当你手里已经有材料，但它太散、太长、太不适合传播时，用它把内容压缩成一个核心画面。",
    howToUse: ["先看它如何给内容找主标题。", "再看它怎样删掉不必要的解释。", "最后看不同展示模式怎么服务同一个观点。"],
    whatToLearn: ["信息减法怎么做。", "一张卡片里什么该大、什么该小。", "内容如何从可读变成可分享。"],
    readFocus: "读原文时重点看它对版式、密度、视觉层级和不同卡片模式的要求。",
    sourcePath: ljgRaw("ljg-card"),
    relatedFiles: [
      { id: "mode-poster", label: "海报模式说明", path: ljgSkillFile("ljg-card", "references/mode-poster.md"), kind: "markdown", description: "海报模式更强调强标题和大面积视觉冲击。" },
      { id: "mode-sketchnote", label: "视觉笔记模式说明", path: ljgSkillFile("ljg-card", "references/mode-sketchnote.md"), kind: "markdown", description: "视觉笔记模式强调理解过程和关系结构。" },
      { id: "mode-comic", label: "漫画模式说明", path: ljgSkillFile("ljg-card", "references/mode-comic.md"), kind: "markdown", description: "漫画模式更适合把抽象内容做成有情境的叙述。" },
      { id: "mode-whiteboard", label: "白板模式说明", path: ljgSkillFile("ljg-card", "references/mode-whiteboard.md"), kind: "markdown", description: "白板模式更适合讲过程、讲推导、讲拆解。" },
      { id: "poster-template", label: "海报 HTML 模板", path: ljgSkillFile("ljg-card", "assets/poster_template.html"), kind: "html", description: "直接展示海报模式的 HTML 结构。" },
      { id: "sketchnote-template", label: "视觉笔记 HTML 模板", path: ljgSkillFile("ljg-card", "assets/sketchnote_template.html"), kind: "html", description: "可以直观看到视觉笔记怎么搭版。" },
      { id: "comic-template", label: "漫画 HTML 模板", path: ljgSkillFile("ljg-card", "assets/comic_template.html"), kind: "html", description: "展示漫画模式怎么把内容做成分镜。" },
      { id: "whiteboard-template", label: "白板 HTML 模板", path: ljgSkillFile("ljg-card", "assets/whiteboard_template.html"), kind: "html", description: "展示白板模式怎么呈现步骤和推导。" },
    ],
  },
  {
    id: "ljg-learn",
    originName: "ljg-learn",
    source: "lijigang",
    displayTitle: "把一个概念真正学明白",
    summary: "不是只给定义，而是把一个概念的边界、误区和使用场景讲清楚。",
    abstract: "适合学习一个陌生概念，或者重学一个你以为自己已经懂了的词。",
    readerHint: "读它时要关注概念是如何被层层展开的。",
    tags: ["概念", "学习", "理解"],
    whenToUse: "当你只会说一个词的表面意思，却讲不出它真正怎么用时，用这个 skill 很合适。",
    howToUse: ["先看它如何定义概念。", "再看它怎样处理误区和边界。", "最后看它如何把概念落回现实场景。"],
    whatToLearn: ["如何真正理解一个词，而不是背词条。", "如何辨认概念的误用。", "如何把抽象知识落回经验世界。"],
    readFocus: "原文最值得看的是它如何安排多层次解释，而不是只给一个百科式定义。",
    sourcePath: ljgRaw("ljg-learn"),
  },
  {
    id: "ljg-paper",
    originName: "ljg-paper",
    source: "lijigang",
    displayTitle: "把论文读成普通人也能懂的说明",
    summary: "把论文里的问题、方法、结果和局限翻译成可理解的人话。",
    abstract: "适合在读论文前后快速抓住核心问题、方法、发现和限制。",
    readerHint: "它的价值在于防止我们被术语压住。",
    tags: ["论文", "研究解读", "知识迁移"],
    whenToUse: "当你手里有论文，但不想一开始就陷进术语和细节里时，用它先抓主干。",
    howToUse: ["先看论文解决的是什么问题。", "再看方法是不是被翻译清楚了。", "最后看它怎么处理限制和边界。"],
    whatToLearn: ["读论文先抓什么。", "学术语言如何翻成可交流语言。", "研究价值和研究限制怎么分开看。"],
    readFocus: "原文重点看它如何要求模型忠于论文内容，不乱补、不乱编。",
    sourcePath: ljgRaw("ljg-paper"),
  },
  {
    id: "ljg-paper-river",
    originName: "ljg-paper-river",
    source: "lijigang",
    displayTitle: "追踪一篇论文的思想源流",
    summary: "不是只看一篇论文写了什么，而是追它从哪里来、影响了谁。",
    abstract: "适合沿着引用关系追溯一篇论文的思想来路和后续影响。",
    readerHint: "这更像读研究脉络，而不是只读单篇论文。",
    tags: ["论文脉络", "引用追踪", "研究地图"],
    whenToUse: "当你想知道一篇论文是不是孤立观点，而是放在一个长期学术对话里去看时，用它。",
    howToUse: ["先看这篇论文承接了谁。", "再看它反过来影响了谁。", "最后看思想线路是怎么演化的。"],
    whatToLearn: ["论文不是孤立存在的。", "引用关系可以帮助理解研究位置。", "思想演化比单点结论更重要。"],
    readFocus: "读原文时重点看它如何组织时间线、引用线和问题线。",
    sourcePath: ljgRaw("ljg-paper-river"),
  },
  {
    id: "ljg-plain",
    originName: "ljg-plain",
    source: "lijigang",
    displayTitle: "把复杂内容讲成大白话",
    summary: "把复杂内容改写成更容易被普通读者理解的表达。",
    abstract: "适合给陌生概念、专业内容或艰深表达做降门槛改写。",
    readerHint: "重点不是幼稚化，而是让理解门槛下降。",
    tags: ["白话化", "科普", "改写"],
    whenToUse: "当一句话专业上没错，但普通人读不进去、听不进去时，用它特别合适。",
    howToUse: ["先看它如何保留原意。", "再看它怎么换表达方式。", "最后看它如何避免解释过浅。"],
    whatToLearn: ["复杂内容如何不失真地降门槛。", "什么叫真正的解释清楚。", "好理解不等于没深度。"],
    readFocus: "原文最值得看的是它对文风自由度和信息准确度的平衡。",
    sourcePath: ljgRaw("ljg-plain"),
  },
  {
    id: "ljg-rank",
    originName: "ljg-rank",
    source: "lijigang",
    displayTitle: "找出一个领域最关键的几根骨架",
    summary: "从很多信息里压缩出少数真正决定结构的核心维度。",
    abstract: "适合做知识压缩，分清哪些内容是枝叶，哪些内容是骨架。",
    readerHint: "它不是随便排序，而是逼你找结构。",
    tags: ["降秩", "结构提炼", "框架"],
    whenToUse: "当一个领域信息太多、太杂、太难抓重点时，用它帮你找到最值得优先理解的骨架。",
    howToUse: ["先看它如何定义关键维度。", "再看它怎样删掉次要细节。", "最后看它如何防止压缩过头。"],
    whatToLearn: ["复杂知识如何被压缩。", "什么是关键结构，什么只是补充。", "框架提炼为什么重要。"],
    readFocus: "读原文时重点看它怎么避免把内容粗暴概括成空话。",
    sourcePath: ljgRaw("ljg-rank"),
  },
  {
    id: "ljg-relationship",
    originName: "ljg-relationship",
    source: "lijigang",
    displayTitle: "看清一段关系是怎么卡住的",
    summary: "用分层诊断和对话方式分析关系问题。",
    abstract: "适合讨论亲密关系、合作关系或任何反复卡住的互动。",
    readerHint: "这不是算命，而是关系结构分析。",
    tags: ["关系", "对话", "分析"],
    whenToUse: "当一段关系总在重复同样的冲突，但你又说不清根源时，可以用它帮助拆层。",
    howToUse: ["先看它如何定义关系里的问题。", "再看它怎样区分表层冲突和深层结构。", "最后看它如何推进对话。"],
    whatToLearn: ["关系问题为什么常常不是单点爆炸。", "如何区分事实、感受和需求。", "结构化对话有什么帮助。"],
    readFocus: "原文重点看它对不同层次问题的辨认方式。",
    sourcePath: ljgRaw("ljg-relationship"),
  },
  {
    id: "ljg-roundtable",
    originName: "ljg-roundtable",
    source: "lijigang",
    displayTitle: "让复杂问题在多方圆桌里展开",
    summary: "把一个复杂议题放进多角色对谈里，让不同角度彼此碰撞。",
    abstract: "适合推动复杂问题讨论，而不是只听单一视角。",
    readerHint: "它训练的是视角调度，不是热闹感。",
    tags: ["圆桌", "多视角", "讨论"],
    whenToUse: "当一个问题没有标准答案，需要多种角色共同补足盲区时，用这个 skill 很自然。",
    howToUse: ["先看有哪些角色被请上桌。", "再看每个角色承担的视角功能。", "最后看冲突如何被收束成洞见。"],
    whatToLearn: ["多视角讨论怎么搭。", "不同立场如何互补。", "复杂问题如何避免被单一叙事绑架。"],
    readFocus: "原文里值得学的是角色分配和发言顺序设计。",
    sourcePath: ljgRaw("ljg-roundtable"),
  },
  {
    id: "ljg-skill-map",
    originName: "ljg-skill-map",
    source: "lijigang",
    displayTitle: "给一个能力画出学习地图",
    summary: "把一个技能拆成模块、路径和练习方向。",
    abstract: "适合在学新能力之前先看到全景，而不是一头扎进细节。",
    readerHint: "这更像路线图，不是速成秘籍。",
    tags: ["技能地图", "学习路径", "拆解"],
    whenToUse: "当你想学一个能力，但不知道先学什么、后学什么时，它能先给你一张地图。",
    howToUse: ["先看能力被拆成哪些模块。", "再看模块之间的顺序和依赖。", "最后看哪些部分需要刻意练习。"],
    whatToLearn: ["学习不能只靠碎片积累。", "路径感会比素材堆积更重要。", "技能地图能帮你判断投入优先级。"],
    readFocus: "原文重点看它如何把技能拆成层次而不是列清单。",
    sourcePath: ljgRaw("ljg-skill-map"),
  },
  {
    id: "ljg-travel",
    originName: "ljg-travel",
    source: "lijigang",
    displayTitle: "把旅行信息整理成可执行计划",
    summary: "把零散出行信息收拢成真正能拿来走的旅行方案。",
    abstract: "适合做路线、节奏、优先级和备选方案的安排。",
    readerHint: "它不是旅游种草文，更像行动计划。",
    tags: ["旅行", "计划", "路线"],
    whenToUse: "当你已经有一堆景点、餐厅、路线想法，却不知道怎么排时，用它最合适。",
    howToUse: ["先看它怎么整理目标。", "再看它如何安排时间和移动。", "最后看它怎么处理取舍和备选。"],
    whatToLearn: ["计划不是堆信息，而是做选择。", "节奏感会决定体验。", "行程设计要留出弹性。"],
    readFocus: "原文里值得看的是它如何把愿望清单变成可执行路径。",
    sourcePath: ljgRaw("ljg-travel"),
  },
  {
    id: "ljg-word",
    originName: "ljg-word",
    source: "lijigang",
    displayTitle: "把一个英文词学到会用",
    summary: "从词源、语义和语境里真正学会一个词，而不是只背中文释义。",
    abstract: "适合把一个词学到能判断什么时候该用、什么时候不该用。",
    readerHint: "它训练的是词感，不只是词义。",
    tags: ["单词", "英语", "语义"],
    whenToUse: "当你不满足于词典释义，希望真正把一个英文词用顺、用准时，这个 skill 很有帮助。",
    howToUse: ["先看词源和核心意象。", "再看不同语境里的差异。", "最后看使用边界和误用提醒。"],
    whatToLearn: ["单词为什么不能只背中文。", "语义层次怎么展开。", "词的使用边界比记住意思更重要。"],
    readFocus: "读原文时重点看它如何处理词源、语义延伸和例句场景。",
    sourcePath: ljgRaw("ljg-word"),
  },
  {
    id: "ljg-writes",
    originName: "ljg-writes",
    source: "lijigang",
    displayTitle: "带着一个观点写出完整文章",
    summary: "从一个观点出发，把文章的推进路径和论证节奏写出来。",
    abstract: "适合学习从观点、结构到成文的写作推进方式。",
    readerHint: "重点不是模仿语气，而是理解它如何搭结构。",
    tags: ["写作", "观点", "结构"],
    whenToUse: "当你脑子里有一个判断，但还不会把它铺成一篇能读下去的文章时，用它。",
    howToUse: ["先看观点如何被立住。", "再看中段怎么推进。", "最后看结尾怎么收束。"],
    whatToLearn: ["写作如何从观点起步。", "结构为什么比金句更重要。", "论证过程怎样保持节奏。"],
    readFocus: "原文最值得看的是它如何安排段落推进和情绪起伏。",
    sourcePath: ljgRaw("ljg-writes"),
  },
  {
    id: "ljg-x-download",
    originName: "ljg-x-download",
    source: "lijigang",
    displayTitle: "把 X 内容整理成研究素材",
    summary: "把公开社媒内容收集下来，变成后续可分析、可归档的文本材料。",
    abstract: "适合研究一个账号、一个议题或一段长期内容脉络。",
    readerHint: "它更像素材采集与整理工具。",
    tags: ["X", "素材收集", "归档"],
    whenToUse: "当你想长期追一个创作者或一个议题，但平台本身不方便系统阅读时，用它很顺手。",
    howToUse: ["先看它如何定义采集范围。", "再看它怎样整理成后续可读材料。", "最后看它如何为研究和分析服务。"],
    whatToLearn: ["社媒内容如何变成研究材料。", "收集和整理是两回事。", "素材的后续可用性很重要。"],
    readFocus: "原文重点看它如何处理抓取对象、整理结构和后续阅读。",
    sourcePath: ljgRaw("ljg-x-download"),
  },
  {
    id: "ljg-paper-flow",
    originName: "ljg-paper-flow",
    source: "lijigang",
    displayTitle: "把论文阅读串成一条工作流",
    summary: "把论文解读、信息提炼和后续输出连成一条连续动作。",
    abstract: "适合读完论文后快速转成可复习、可分享的材料。",
    readerHint: "它更值得学的是流程思维。",
    tags: ["工作流", "论文", "转化"],
    whenToUse: "当你不想论文读完就散掉，而是希望顺手转成卡片或资料时，用它特别自然。",
    howToUse: ["先看论文如何被读懂。", "再看内容怎样被提炼。", "最后看输出环节如何接上。"],
    whatToLearn: ["学习动作如何前后衔接。", "输入与输出怎样连成闭环。", "工作流比单个 prompt 更有复用价值。"],
    readFocus: "原文重点看各阶段之间是怎么交棒的。",
    sourcePath: ljgWorkflowRaw("ljg-paper-flow"),
  },
  {
    id: "ljg-word-flow",
    originName: "ljg-word-flow",
    source: "lijigang",
    displayTitle: "把单词学习串成一条工作流",
    summary: "把单词分析、理解和可视化输出连在一起。",
    abstract: "适合把词汇学习变成可复习、可展示的材料。",
    readerHint: "它不是背词模板，而是词汇学习流程设计。",
    tags: ["工作流", "单词", "可视化"],
    whenToUse: "当你想把一个词学得更立体，而不是停在词典释义上时，这条 workflow 很有启发。",
    howToUse: ["先看词义如何拆解。", "再看理解如何转成可视化输出。", "最后看整条链路怎么形成复习材料。"],
    whatToLearn: ["词汇学习也能做成流程。", "理解比记忆更重要。", "输出会反过来强化学习。"],
    readFocus: "原文重点看 workflow 如何把分析和展示接起来。",
    sourcePath: ljgWorkflowRaw("ljg-word-flow"),
  },
  {
    id: "ljg-think",
    originName: "ljg-think",
    source: "lijigang",
    displayTitle: "把模糊问题慢慢想清楚",
    summary: "先把问题拆开、想透，再决定答案，不急着抢结论。",
    abstract: "适合卡壳、犹豫、判断困难的时候使用。",
    readerHint: "它强调的是思路展开，而不是秒答。",
    tags: ["思考", "判断", "拆解"],
    whenToUse: "当你不是没答案，而是答案太快、太乱、太不稳的时候，用它先把问题想清楚。",
    howToUse: ["先看问题被怎么拆。", "再看不同路径怎么展开。", "最后看如何收束成判断。"],
    whatToLearn: ["慢想的价值。", "判断前先拆问题。", "复杂问题为什么不能一口吞。"],
    readFocus: "原文重点看它怎么压住过快结论，逼自己把路径走出来。",
    sourcePath: ljgRaw("ljg-think"),
  },
  {
    id: "ljg-invest",
    originName: "ljg-invest",
    source: "lijigang",
    displayTitle: "把投资判断拆成变量与风险",
    summary: "把投资观点从直觉判断，拆成结构、变量和风险假设。",
    abstract: "适合学习一个投资判断到底依赖哪些前提。",
    readerHint: "重点不是荐股，而是判断结构。",
    tags: ["投资", "判断", "风险"],
    whenToUse: "当你听到一个投资结论，想知道它背后的逻辑链条是否站得住时，可以用它。",
    howToUse: ["先看核心假设。", "再看影响结论的变量。", "最后看风险和反例如何处理。"],
    whatToLearn: ["投资判断如何拆结构。", "风险为什么不能放到最后才想。", "结论和前提要一起看。"],
    readFocus: "原文里最值得学的是它如何逼模型把假设说清楚。",
    sourcePath: ljgRaw("ljg-invest"),
  },
  {
    id: "ljg-read",
    originName: "ljg-read",
    source: "lijigang",
    displayTitle: "读长文前先抓主线结构",
    summary: "把一本书或一篇长文先读成结构地图，再决定细读顺序。",
    abstract: "适合先抓主线，再决定哪些部分值得慢读。",
    readerHint: "它教你先看地图，再走路。",
    tags: ["阅读", "长文", "结构图"],
    whenToUse: "当你面对一本书或长材料，担心一头扎进去抓不住重点时，这个 skill 会非常好用。",
    howToUse: ["先看整体框架。", "再看章节或模块之间的关系。", "最后决定深入阅读顺序。"],
    whatToLearn: ["长文阅读先抓骨架。", "结构感比顺序通读更重要。", "阅读效率来自判断力。"],
    readFocus: "原文重点看它如何把长内容压成结构地图。",
    sourcePath: ljgRaw("ljg-read"),
  },
  {
    id: "khazix-writer",
    originName: "khazix-writer",
    source: "khazix",
    displayTitle: "公众号长文主编",
    summary: "更像一位主编型 skill，强调选题、结构、节奏和成稿推进。",
    abstract: "适合公众号长文写作，尤其是提纲、初稿和结构推进阶段。",
    readerHint: "不是一键出稿，而是帮你把文章写顺。",
    tags: ["公众号", "长文", "写作"],
    whenToUse: "当你准备写公众号长文，脑子里有主题但结构还没站稳时，用它特别合适。",
    howToUse: ["先看选题与角度。", "再看结构怎么搭。", "最后看语气、节奏和篇幅如何控制。"],
    whatToLearn: ["长文不是短内容的拉长版。", "主编视角比纯文采更重要。", "写作推进要有节奏设计。"],
    readFocus: "原文重点看它如何约束文章结构、语气和推进顺序。",
    sourcePath: khazixRaw("khazix-writer"),
    relatedFiles: [
      { id: "writer-methodology", label: "内容方法论", path: khazixFile("khazix-writer", "references/content_methodology.md"), kind: "markdown", description: "补充理解写作方法背后的底层原则。" },
      { id: "writer-style-examples", label: "风格样例", path: khazixFile("khazix-writer", "references/style_examples.md"), kind: "markdown", description: "帮助理解它追求的语气和表达质感。" },
    ],
  },
  {
    id: "hv-analysis",
    originName: "hv-analysis",
    source: "khazix",
    displayTitle: "爆款内容拆解器",
    summary: "把热点和爆款内容拆成可复用的传播分析框架。",
    abstract: "适合研究一条内容为什么会被广泛传播。",
    readerHint: "重点不是抄爆款，而是理解传播结构。",
    tags: ["热点", "传播", "分析"],
    whenToUse: "当你想知道一篇内容为什么跑出来、什么机制在推动传播时，用它最有价值。",
    howToUse: ["先看内容被从哪些角度分析。", "再看分析结果如何结构化沉淀。", "最后看它如何支持后续归档输出。"],
    whatToLearn: ["爆款不是神秘运气。", "传播分析要结构化。", "分析结果如何沉淀成模板。"],
    readFocus: "原文重点看它如何定义分析维度和输出结构。",
    sourcePath: khazixRaw("hv-analysis"),
    relatedFiles: [
      { id: "hv-schema", label: "分析结构 Schema", path: khazixFile("hv-analysis", "references/schema.json"), kind: "code", description: "展示这套分析想采集哪些信息。" },
      { id: "hv-md-to-pdf", label: "Markdown 转 PDF 脚本", path: khazixFile("hv-analysis", "scripts/md_to_pdf.py"), kind: "code", description: "展示分析完成后如何被进一步输出和归档。" },
    ],
  },
  {
    id: "notebooklm-ppteditable",
    originName: "my_notebooklm_with_ppteditable",
    source: "goeasyway",
    displayTitle: "把笔记整理成可编辑 PPT",
    summary: "围绕资料整理、NotebookLM 思路和可编辑 PPT 输出的一条学习线索。",
    abstract: "这个条目先作为观察位保留，便于后续继续补充。",
    readerHint: "目前更适合先看方向，再补更多细节。",
    tags: ["PPT", "知识整理", "待补充"],
    whenToUse: "当你关心资料整理如何进一步走到可编辑幻灯片输出时，这个条目值得先关注。",
    howToUse: ["先理解它想解决的链路。", "再观察它和 NotebookLM、PPT 编辑之间的连接。", "后续材料补齐后再深入读。"],
    whatToLearn: ["知识整理和演示输出之间的连接。", "可编辑 PPT 为什么重要。", "一个工具链如何围绕最终产物设计。"],
    readFocus: "当前先看项目方向和 README 信息，后续再补更多原文材料。",
    sourcePath: goeasywayRaw("README.md"),
    sourceMarkdown: "# my_notebooklm_with_ppteditable\n\n当前先保留为学习位，后续继续补充更完整的原文材料。\n",
  },
];

function createZipBlob(files: DownloadFile[]): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  let centralSize = 0;

  const writeU16 = (view: DataView, at: number, value: number) => view.setUint16(at, value, true);
  const writeU32 = (view: DataView, at: number, value: number) => view.setUint32(at, value, true);

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);

    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);
    writeU32(localView, 0, 0x04034b50);
    writeU16(localView, 4, 20);
    writeU16(localView, 6, 0);
    writeU16(localView, 8, 0);
    writeU16(localView, 10, 0);
    writeU16(localView, 12, 0);
    writeU32(localView, 14, 0);
    writeU32(localView, 18, dataBytes.length);
    writeU32(localView, 22, dataBytes.length);
    writeU16(localView, 26, nameBytes.length);
    writeU16(localView, 28, 0);
    localParts.push(localHeader, nameBytes, dataBytes);

    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    writeU32(centralView, 0, 0x02014b50);
    writeU16(centralView, 4, 20);
    writeU16(centralView, 6, 20);
    writeU16(centralView, 8, 0);
    writeU16(centralView, 10, 0);
    writeU16(centralView, 12, 0);
    writeU16(centralView, 14, 0);
    writeU32(centralView, 16, 0);
    writeU32(centralView, 20, dataBytes.length);
    writeU32(centralView, 24, dataBytes.length);
    writeU16(centralView, 28, nameBytes.length);
    writeU16(centralView, 30, 0);
    writeU16(centralView, 32, 0);
    writeU16(centralView, 34, 0);
    writeU16(centralView, 36, 0);
    writeU32(centralView, 38, 0);
    writeU32(centralView, 42, offset);
    centralParts.push(centralHeader, nameBytes);

    offset += localHeader.length + nameBytes.length + dataBytes.length;
    centralSize += centralHeader.length + nameBytes.length;
  });

  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  writeU32(endView, 0, 0x06054b50);
  writeU16(endView, 4, 0);
  writeU16(endView, 6, 0);
  writeU16(endView, 8, files.length);
  writeU16(endView, 10, files.length);
  writeU32(endView, 12, centralSize);
  writeU32(endView, 16, offset);
  writeU16(endView, 20, 0);

  return new Blob([...localParts, ...centralParts, endRecord] as BlobPart[], { type: "application/zip" });
}

async function loadEntrySource(entry: SkillEntry) {
  const path = entry.sourcePath;
  if (!path) return entry.sourceMarkdown || "";
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${entry.id}`);
  return response.text();
}

async function loadRelatedFile(file: SkillRelatedFile) {
  const response = await fetch(file.path);
  if (!response.ok) throw new Error(`Failed to load ${file.id}`);
  return response.text();
}

function renderRelatedFile(file: SkillRelatedFile, content: string) {
  if (file.kind === "html") {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-[var(--site-border)] bg-white">
          <iframe title={file.label} srcDoc={content} className="h-[520px] w-full bg-white" sandbox="" />
        </div>
        <details className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-panel)] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--site-text)]">查看 HTML 源码</summary>
          <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs leading-6 text-[var(--site-text)]">
            <code>{content}</code>
          </pre>
        </details>
      </div>
    );
  }

  if (file.kind === "markdown") {
    return (
      <div className="prose prose-sm max-w-none text-[var(--site-text)] prose-headings:text-[var(--site-text)] prose-p:text-[var(--site-text)] prose-strong:text-[var(--site-text)] prose-li:text-[var(--site-text)]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ children }) => <span className="font-semibold text-[var(--site-accent-strong)]">{children}</span> }}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  if (file.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={file.path} alt={file.label} className="max-h-[640px] w-full rounded-2xl object-contain" />
    );
  }

  return (
    <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs leading-6 text-[var(--site-text)]">
      <code>{content}</code>
    </pre>
  );
}

export function SkillHubWorkbench({ onClose }: SkillHubWorkbenchProps) {
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SkillSource | "all">("all");
  const [selectedId, setSelectedId] = useState(skillEntries[0]?.id ?? "");
  const [readingMode, setReadingMode] = useState<ReadingMode>("guide");
  const [sourceContentMap, setSourceContentMap] = useState<Record<string, string>>({});
  const [sourceErrorMap, setSourceErrorMap] = useState<Record<string, boolean>>({});
  const [relatedFileId, setRelatedFileId] = useState("");
  const [relatedContentMap, setRelatedContentMap] = useState<Record<string, string>>({});
  const [relatedErrorMap, setRelatedErrorMap] = useState<Record<string, boolean>>({});
  const [isDownloading, setIsDownloading] = useState(false);

  const filtered = useMemo(() => {
    const q = normalizeText(query.trim());
    return skillEntries.filter((entry) => {
      const sourceOk = sourceFilter === "all" || entry.source === sourceFilter;
      if (!sourceOk) return false;
      if (!q) return true;

      const corpus = normalizeText(
        [entry.id, entry.originName, entry.displayTitle, entry.summary, entry.abstract, entry.readerHint, entry.tags.join(" ")].join(" ")
      );
      return corpus.includes(q);
    });
  }, [query, sourceFilter]);

  const sourceCounts = useMemo(
    () => ({
      all: skillEntries.length,
      lijigang: skillEntries.filter((entry) => entry.source === "lijigang").length,
      khazix: skillEntries.filter((entry) => entry.source === "khazix").length,
      goeasyway: skillEntries.filter((entry) => entry.source === "goeasyway").length,
    }),
    []
  );

  const selected = filtered.find((entry) => entry.id === selectedId) ?? filtered[0] ?? null;
  const relatedFiles = useMemo(() => selected?.relatedFiles ?? [], [selected]);
  const selectedRelatedFile = relatedFiles.find((file) => file.id === relatedFileId) ?? relatedFiles[0] ?? null;

  useEffect(() => {
    if (!filtered.length) return;
    if (!selected) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selected]);

  useEffect(() => {
    if (!selected || !selected.sourcePath || sourceContentMap[selected.id]) return;
    let cancelled = false;

    loadEntrySource(selected)
      .then((text) => {
        if (cancelled) return;
        setSourceContentMap((prev) => ({ ...prev, [selected.id]: text }));
        setSourceErrorMap((prev) => ({ ...prev, [selected.id]: false }));
      })
      .catch(() => {
        if (cancelled) return;
        setSourceErrorMap((prev) => ({ ...prev, [selected.id]: true }));
      });

    return () => {
      cancelled = true;
    };
  }, [selected, sourceContentMap]);

  useEffect(() => {
    if (!relatedFiles.length) {
      if (readingMode === "files") setReadingMode("guide");
      if (relatedFileId) setRelatedFileId("");
      return;
    }

    if (!selectedRelatedFile || selectedRelatedFile.id !== relatedFileId) {
      setRelatedFileId(relatedFiles[0].id);
    }
  }, [readingMode, relatedFiles, relatedFileId, selectedRelatedFile]);

  useEffect(() => {
    if (readingMode !== "files" || !selectedRelatedFile || relatedContentMap[selectedRelatedFile.path]) return;
    let cancelled = false;

    loadRelatedFile(selectedRelatedFile)
      .then((text) => {
        if (cancelled) return;
        setRelatedContentMap((prev) => ({ ...prev, [selectedRelatedFile.path]: text }));
        setRelatedErrorMap((prev) => ({ ...prev, [selectedRelatedFile.path]: false }));
      })
      .catch(() => {
        if (cancelled) return;
        setRelatedErrorMap((prev) => ({ ...prev, [selectedRelatedFile.path]: true }));
      });

    return () => {
      cancelled = true;
    };
  }, [readingMode, selectedRelatedFile, relatedContentMap]);

  const readingMarkdown = selected
    ? readingMode === "guide"
      ? guideMarkdown(selected)
      : sourceErrorMap[selected.id]
        ? "完整原文暂时加载失败，请稍后再试。"
        : sourceContentMap[selected.id] || selected.sourceMarkdown || "完整原文加载中..."
    : "";

  const selectedRelatedContent = selectedRelatedFile
    ? relatedErrorMap[selectedRelatedFile.path]
      ? "关联文件暂时加载失败，请稍后再试。"
      : relatedContentMap[selectedRelatedFile.path] || "关联文件加载中..."
    : "";

  const handleDownloadPack = async () => {
    try {
      setIsDownloading(true);
      const files: DownloadFile[] = [];

      for (const entry of skillEntries) {
        files.push({ name: `${entry.id}/导读.md`, content: guideMarkdown(entry) });

        let sourceText = entry.sourceMarkdown ?? "";
        if (entry.sourcePath) {
          sourceText = sourceContentMap[entry.id] ?? sourceText;
          if (!sourceText) {
            try {
              sourceText = await loadEntrySource(entry);
            } catch {
              sourceText = "原文暂时获取失败。";
            }
          }
        }

        if (sourceText) {
          files.push({ name: `${entry.id}/SKILL.md`, content: sourceText });
        }

        for (const file of entry.relatedFiles ?? []) {
          let relatedText = relatedContentMap[file.path] ?? "";
          if (!relatedText) {
            try {
              relatedText = await loadRelatedFile(file);
            } catch {
              relatedText = "关联文件暂时获取失败。";
            }
          }
          files.push({ name: `${entry.id}/${file.path.split("/").pop() || file.id}`, content: relatedText });
        }
      }

      const blob = createZipBlob(files);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `skill-reading-room-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  const filters = ["all", "lijigang", "khazix", "goeasyway"] as const;
  const modeTabs: Array<{ key: ReadingMode; label: string; disabled?: boolean }> = [
    { key: "guide", label: "导读" },
    { key: "source", label: "原文" },
    { key: "files", label: "关联文件", disabled: !relatedFiles.length },
  ];

  return (
    <section className="flex h-[calc(100vh-96px)] min-h-[720px] flex-col gap-4 overflow-hidden rounded-[24px] bg-[var(--site-panel)] p-4 md:p-5">
      <header className="relative shrink-0 rounded-[24px] border border-[var(--site-border)] bg-[#fffdf8] px-5 py-4 shadow-[0_18px_42px_rgba(35,23,28,0.08)] md:px-7 md:py-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭 Skill 学习仓库"
          className="absolute right-4 top-4 z-20 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--site-border)] bg-white text-[var(--site-text)] shadow-[0_14px_30px_rgba(35,23,28,0.14)] transition hover:-translate-y-0.5 hover:bg-[#fff8ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent-soft)]"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="pr-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--site-border)] bg-white/80 px-3 py-1 text-[10px] font-semibold tracking-[0.12em] text-[var(--site-accent-strong)]">
            <Sparkles className="h-3.5 w-3.5" />
            SKILL READING ROOM
          </div>
          <div className="mt-2 flex items-end justify-between gap-4">
            <h1 className="text-[26px] font-semibold leading-none text-[var(--site-text)] md:text-[42px]">Skill 学习仓库</h1>
            <button
              type="button"
              onClick={handleDownloadPack}
              disabled={isDownloading}
              className="site-hover-chip inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-text)] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? "正在整理资料包" : "下载资料包"}
            </button>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-[var(--site-border)] bg-[var(--site-panel-strong)] p-4 shadow-[0_12px_30px_rgba(35,23,28,0.06)]">
          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--site-text-soft)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索 skill 主题"
              className="h-14 w-full rounded-2xl border border-[var(--site-border)] bg-white pl-11 pr-4 text-base text-[var(--site-text)] outline-none transition placeholder:text-[var(--site-text-soft)] focus:border-[var(--site-border-strong)]"
            />
          </div>

          <div className="mt-3 flex shrink-0 flex-wrap gap-2">
            {filters.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSourceFilter(key)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  sourceFilter === key
                    ? "border-[var(--site-border-strong)] bg-[var(--site-accent-soft)] text-[var(--site-accent-strong)]"
                    : "border-[var(--site-border)] bg-white text-[var(--site-text-soft)] hover:text-[var(--site-text)]"
                }`}
              >
                {`${key === "all" ? "全部" : sourceLabel[key]} ${sourceCounts[key]}`}
              </button>
            ))}
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {filtered.length ? (
              filtered.map((entry) => {
                const isSelected = selected?.id === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(entry.id);
                      setReadingMode("guide");
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-[var(--site-border-strong)] bg-white shadow-[0_12px_28px_rgba(35,23,28,0.1)]"
                        : "border-[var(--site-border)] bg-[var(--site-panel)] hover:bg-white"
                    }`}
                  >
                    <div className="text-[11px] font-semibold tracking-[0.08em] text-[var(--site-text-soft)]">{sourceLabel[entry.source]}</div>
                    <div className="mt-2 text-[17px] font-semibold leading-7 text-[var(--site-text)]">{entry.displayTitle}</div>
                    <div className="mt-1 text-sm text-[var(--site-text-soft)]">{entry.originName}</div>
                    <p className="mt-3 text-sm leading-7 text-[var(--site-text-soft)]">{entry.abstract}</p>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--site-border)] bg-white/70 p-5 text-sm leading-7 text-[var(--site-text-soft)]">
                暂时没有找到匹配的 skill。可以试试换个关键词，或者切回“全部”。
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-[var(--site-border)] bg-[#fffdf8] shadow-[0_12px_30px_rgba(35,23,28,0.06)]">
          {selected ? (
            <>
              <div className="shrink-0 border-b border-[var(--site-border)] px-6 py-5 md:px-8 md:py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[var(--site-accent-strong)]">{sourceLabel[selected.source]}</div>
                    <h2 className="mt-2 text-[30px] font-semibold leading-tight text-[var(--site-text)] md:text-[42px]">{selected.displayTitle}</h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-[var(--site-border)] bg-white p-1">
                    {modeTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        disabled={tab.disabled}
                        onClick={() => setReadingMode(tab.key)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                          readingMode === tab.key ? "bg-[var(--site-text)] text-white" : "text-[var(--site-text-soft)]"
                        } ${tab.disabled ? "cursor-not-allowed opacity-40" : "hover:text-[var(--site-text)]"}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 md:px-8 md:py-6">
                {readingMode === "files" && selectedRelatedFile ? (
                  <div className="space-y-5">
                    <div className="flex flex-wrap gap-2">
                      {relatedFiles.map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => setRelatedFileId(file.id)}
                          className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                            selectedRelatedFile.id === file.id
                              ? "border-[var(--site-border-strong)] bg-[var(--site-accent-soft)] text-[var(--site-accent-strong)]"
                              : "border-[var(--site-border)] bg-white text-[var(--site-text-soft)] hover:text-[var(--site-text)]"
                          }`}
                        >
                          {file.label}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-panel)] p-4">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--site-accent-strong)]">
                        <BookOpen className="h-4 w-4" />
                        {selectedRelatedFile.label}
                      </div>
                      <p className="mb-4 text-sm leading-7 text-[var(--site-text-soft)]">{selectedRelatedFile.description}</p>
                      {renderRelatedFile(selectedRelatedFile, selectedRelatedContent)}
                    </div>
                  </div>
                ) : (
                  <article className="prose prose-sm max-w-none text-[var(--site-text)] prose-headings:font-semibold prose-headings:text-[var(--site-text)] prose-p:text-[var(--site-text)] prose-p:leading-8 prose-strong:text-[var(--site-text)] prose-li:text-[var(--site-text)] prose-li:leading-8 prose-ul:pl-6 prose-ol:pl-6 prose-blockquote:border-[var(--site-border-strong)] prose-blockquote:text-[var(--site-text-soft)] prose-code:text-[var(--site-accent-strong)]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ children }) => <span className="font-semibold text-[var(--site-accent-strong)]">{children}</span>,
                        h1: ({ children }) => <h1 className="mb-5 text-3xl font-semibold text-[var(--site-text)]">{children}</h1>,
                        h2: ({ children }) => <h2 className="mb-4 mt-10 text-2xl font-semibold text-[var(--site-text)]">{children}</h2>,
                        h3: ({ children }) => <h3 className="mb-3 mt-8 text-xl font-semibold text-[var(--site-text)]">{children}</h3>,
                        p: ({ children }) => <p className="my-4 text-[17px] leading-8 text-[var(--site-text)]">{children}</p>,
                        li: ({ children }) => <li className="my-2 text-[17px] leading-8 text-[var(--site-text)]">{children}</li>,
                        code: ({ children }) => <code className="rounded bg-[var(--site-accent-soft)] px-1.5 py-0.5 text-[0.95em] text-[var(--site-accent-strong)]">{children}</code>,
                        pre: ({ children }) => <pre className="overflow-x-auto rounded-2xl border border-[var(--site-border)] bg-white p-4 text-sm leading-7 text-[var(--site-text)]">{children}</pre>,
                      }}
                    >
                      {readingMarkdown}
                    </ReactMarkdown>
                  </article>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-[var(--site-text-soft)]">先从左边选一个 skill，我们再一起读它。</div>
          )}
        </section>
      </div>
    </section>
  );
}
