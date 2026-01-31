import { Message } from "./types";

export const MOCK_CHATS: Record<string, Message[]> = {
  "Q3 季度战略复盘": [
    {
      id: "m1",
      role: "user",
      content: "帮我复盘一下Q3的战略执行情况",
    },
    {
      id: "m2",
      role: "ai",
      content: "根据数据分析，Q3的核心指标达成率为85%，其中用户增长略低于预期...",
      kind: "text",
    },
    {
      id: "m3",
      role: "ai",
      content: "建议重点优化获客渠道的转化效率",
      kind: "card",
    },
  ],
  "关于裁员的决策咨询": [
    {
      id: "m1",
      role: "user",
      content: "目前团队效能偏低，是否应该进行人员优化？",
    },
    {
      id: "m2",
      role: "ai",
      content: "裁员并非提升效能的唯一手段。建议先进行组织诊断，识别是流程问题还是人员能力问题。",
      kind: "text",
    },
  ],
  "供应链成本优化": [
    {
      id: "m1",
      role: "user",
      content: "原材料成本上涨了15%，如何优化？",
    },
    {
      id: "m2",
      role: "ai",
      content: "1. 寻找替代供应商 \n2. 优化库存周转 \n3. 重新谈判长期采购协议",
      kind: "text",
    },
  ],
};
