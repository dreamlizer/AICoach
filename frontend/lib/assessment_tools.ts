import { ExecutiveTool } from "./types";

export const assessmentTools: ExecutiveTool[] = [
  {
    id: "mbti",
    name: "MBTI online",
    nameEn: "Myers-Briggs Type Indicator",
    tagPrefix: "MBTI",
    category: "assessment",
    description: "通过 E/I、S/N 等四个维度揭示心理偏好，深度解析你的能量来源、决策方式与生活态度。",
    icon: "brain",
    slogan: ["探索真实自我，", "理解性格密码"],
    prompt: "You are an expert in MBTI (Myers-Briggs Type Indicator). Help the user understand their type, energy source, information gathering, decision making, and lifestyle. Use the 4 dimensions E/I, S/N, T/F, J/P.",
    details: {
      title: "MBTI online",
      introduction: "这不是四个字母的排列组合，而是基于荣格心理学的**“大脑原生操作系统”**说明书。它揭示你作为决策者最底层的**“出厂设置”**：能量来源是独处还是社交，做重大决策时偏向逻辑推演还是人心共振。这是理解你为何会感到“心累”的**底层代码**。",
      usage: "当你感到**“决策疲劳”或“沟通屏障”**时启用。比如：你觉得显而易见的逻辑，却被下属认为冷酷；你厌倦无休止的头脑风暴，而合伙人却乐在其中；你感觉团队“沟通不在一个频道”，往往是**“认知端口”不兼容**，需要系统级排障。",
      outcome: "你将获得一份**“自我使用说明书（高管版）”**。我们不贴简单标签，而是帮助你识别**“决策盲区”和“天赋陷阱”**。你会理解如何用**“反本能”的方式**补齐短板，并配置与你**“认知互补”的团队**，在关键决策中形成更强的合力。"
    }
  },
  {
    id: "4d-leadership",
    name: "4D 高管坐标",
    nameEn: "4-D System of Leadership",
    tagPrefix: "4D",
    category: "assessment",
    description: "基于荣格心理学，精准定位绿色（培养）、黄色（包容）、蓝色（展望）、橙色（指导）四种领导力维度。",
    icon: "users",
    slogan: ["识人用人，", "打造全能团队"],
    prompt: "You are an expert in the 4-D System of Leadership (Green, Yellow, Blue, Orange). Help the user understand their leadership style based on Jungian psychology.",
    details: {
      title: "4D 高管坐标",
      introduction: "源自 NASA 的系统模型，由查理·佩勒林博士为修复哈勃望远镜团队而研发。它超越单一性格维度，构建**“关注人 vs 关注事”**与**“直觉未来 vs 具象当下”**的坐标体系。它衡量的不是好坏，而是你在团队生态中占据的**“生态位”**。",
      usage: "当团队陷入**“内耗循环”或“执行断层”**时启用。比如：执行力很强但创新项目频频失败；团队关系和气却业绩停滞；你与副手总因**“虚与实”**的侧重点发生冲突。当靠激励无法驱动团队时，需要用这套坐标扫描能量结构。",
      outcome: "你将获得一张**“团队作战地图”**。通过可视化的能量雷达图，你能看清自己的**关键对位**，并获得具体的**“补色方案”**，帮助你从单一维度的管理者，进化为能驾驭复杂能量场的**全天候领导者**。"
    }
  },
  {
    id: "pdp",
    name: "PDP 职场生态解码",
    nameEn: "Professional Dynametric Programs",
    tagPrefix: "PDP",
    category: "assessment",
    description: "俗称“五种动物性格测试”（老虎/孔雀/考拉/猫头鹰/变色龙），精准量化你的行为风格与天赋优势。",
    icon: "activity",
    slogan: ["发现天赋优势，", "激活内在潜能"],
    prompt: "You are an expert in PDP (Professional Dynametric Programs) behavioral analysis (Tiger, Peacock, Koala, Owl, Chameleon). Analyze the user's behavioral style.",
    details: {
      title: "PDP 职场生态解码",
      introduction: "这不是简单的“五种动物性格测试”，而是 500 强通用的**“高管原生动力盘点系统”**。它不仅量化你的行为特质（老虎的决断或猫头鹰的严谨），更深层剖析你的**“能量电池”**容量，以及你为了适应当前职位戴上了多重的**“职场面具”**。",
      usage: "当你感到**“心力交瘁”或“向下管理极度内耗”**时启用。比如：明明业绩不错，但你每天上班都觉得在强行“演戏”；你急得跳脚，下属却慢条斯理；你觉得副手是杠精，他却觉得你是画饼。当**“本我”与工作要求发生撕裂**时，需要用它做一次能量体检。",
      outcome: "你将获得一份**“管理健康度体检报告”**。我们不仅定位你的动物生态位，更会精准测算你的**“面具撕裂指数”与“电量消耗情况”**。你将清晰识别团队中谁是你的**“宿命克星”**，从而学会卸下伪装，用最省力的方式排兵布阵，拒绝无效内耗。"
    }
  },
  {
    id: "hogan",
    name: "霍根评测",
    nameEn: "Hogan Assessment",
    tagPrefix: "HOGAN",
    category: "assessment",
    description: "专注于预测职场绩效，深度揭示常态下的优势（光明面）及压力下的潜在风险（阴暗面）。",
    icon: "eye",
    slogan: ["预测职场表现，", "规避潜在风险"],
    prompt: "You are an expert in Hogan Assessment. Analyze the user's bright side (strengths) and dark side (risks under pressure) for workplace performance.",
    details: {
      title: "霍根评测",
      introduction: "专注于预测职场绩效，揭示你在常态下的优势（光明面）以及压力下的潜在风险（阴暗面）。",
      usage: "",
      outcome: ""
    }
  },
  {
    id: "enneagram",
    name: "九型人格",
    nameEn: "The Enneagram",
    tagPrefix: "ENNEA",
    category: "assessment",
    description: "深度解析九种核心人格型号，挖掘潜意识里的深层动机、恐惧与渴望，实现自我超越。",
    icon: "zap",
    slogan: ["洞察深层动机，", "实现自我超越"],
    prompt: "You are an expert in Enneagram. Help the user explore their core type, deep motivations, fears, and desires.",
    details: {
      title: "九型人格",
      introduction: "将人分为九种核心型号（如完美主义者、给予者、实干者等），深入探索深层动机、恐惧与渴望。",
      usage: "",
      outcome: ""
    }
  }
];
