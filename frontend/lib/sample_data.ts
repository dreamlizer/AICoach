import { HistoryItem, Message } from "./types";

export const SAMPLE_CONVERSATIONS: HistoryItem[] = [
  {
    id: "sample-1",
    title: "【示例】Q3 业绩缺口大，团队士气低落",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tool_id: "grow_model" // Assuming GROW model is relevant
  },
  {
    id: "sample-2",
    title: "【示例】刚空降高管如何快速破局",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tool_id: "onboarding_compass"
  },
  {
    id: "sample-3",
    title: "【示例】团队看似忙碌但产出低效",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tool_id: "team_diagnosis"
  }
];

export const SAMPLE_MESSAGES: Record<string, Message[]> = {
  "sample-1": [
    {
      id: "s1-m1",
      role: "user",
      content: "我们 Q3 的业绩缺口还有 30%，但是团队现在士气非常低落，觉得目标根本完不成。作为销售VP，我该怎么做？",
      kind: "text"
    },
    {
      id: "s1-m2",
      role: "ai",
      content: "听起来，你正扛着巨大的压力，前面是硬性的业绩目标，后面是疲软的团队状态，卡在中间的感觉一定很不容易。\n\n如果暂时把“具体怎么做”放一边，作为VP，此刻让你感到最无力或最困扰的一点是什么？",
      kind: "text"
    },
    {
      id: "s1-m3",
      role: "user",
      content: "我觉得最困扰的就是现在员工打不起精神来，不像以前那样精神满满的样子。我也向老板申请了更高的奖金支出，但好像团队也没什么积极的反应。",
      kind: "text"
    },
    {
      id: "s1-m4",
      role: "ai",
      content: "听起来，我们正在探讨如何破解“激励失灵”这个难题。今天我们的对话，是希望找到理解这个困境的新角度，还是探索一些不同的行动可能？",
      kind: "text"
    }
  ],
  "sample-2": [
    {
      id: "s2-m1",
      role: "user",
      content: "我刚空降到这家公司担任 CTO，发现技术债很重，业务部门又不停催需求。团队里还有几个老员工对我持观望态度。我该如何快速破局？",
      kind: "text"
    },
    {
      id: "s2-m2",
      role: "ai",
      content: "听起来，你希望建立一个稳固的起点，赢得信任并推动改变。如果“破局”成功，3个月后，你的团队、业务伙伴和你自己，分别会看到或感受到哪些不一样的东西？",
      kind: "text"
    },
    {
      id: "s2-m3",
      role: "user",
      content: "如果能真的破局成功，那还真的挺厉害的。因为这家公司的技术债在行业内都是有点“名气”的，真要是能三个月内解决了这个技术债，那我的江湖地位就会提升很多。",
      kind: "text"
    },
    {
      id: "s2-m4",
      role: "ai",
      content: "我听到你对证明自己充满期待。如果把“提升江湖地位”看作是这场战役的勋章，那么为了在三个月内真正赢得它，除了技术方案，你认为最需要争取到谁的全力支持？",
      kind: "text"
    }
  ],
  "sample-3": [
    {
      id: "s3-m1",
      role: "user",
      content: "我的团队每天都在加班，看起来非常忙，但是原本计划的项目总是延期，产出质量也不高。这是什么原因？",
      kind: "text"
    },
    {
      id: "s3-m2",
      role: "ai",
      content: "听起来你对团队的现状感到担忧。在我们深入之前，我想确认：今天对话结束，你最希望达成的一个具体成果是什么？",
      kind: "text"
    },
    {
      id: "s3-m3",
      role: "user",
      content: "我期待能找到解决团队拖延的办法，能够让我们的项目按时交付",
      kind: "text"
    },
    {
      id: "s3-m4",
      role: "ai",
      content: "为了让“找到办法”这个目标更具体，如果今天我们对话结束时，您能对“团队拖延”这件事获得一个新的、关键的理解或视角，您希望那会是什么？",
      kind: "text"
    }
  ]
};
