import { loadTemplateHtml } from "./template_utils";

export interface GrowCardPayload {
  goal: string;
  reality: string[];
  options: string[];
  will: string[];
  sloganCn?: string;
  footerSub?: string;
}

export const SAMPLE_CASE = `
案例背景：
- 角色：华东区销售总监
- 目标：年底前业绩达成 1.2亿，市占率重返前三
- 现状：团队动力不足、竞对价格战、CRM流程低效
- 资源：可申请特批价，有直销试点权限
`.trim();

export const FALLBACK_PAYLOAD: GrowCardPayload = {
  goal: "年底前华东区业绩达成 <span class=\"highlight-text\">1.2亿</span> ，市占率重返前三，守住大区总监职位。",
  reality: [
    "团队动力不足：人均月拜访仅15家，远低于战斗状态。",
    "竞对价格战：“宏远科技”报价低于我方底价10%。",
    "内部流程低效：报价审批长达3天，错失商机。"
  ],
  options: [
    "组织动刀：合并冗余办事处，集中资源重奖高绩效者。",
    "申请特价：准备商业案例，向总部申请阶段性特批价。",
    "渠道博弈：评估风险，在重点区域试点直销。"
  ],
  will: [
    "今晚：准备商业案例，与财务总监沟通500万促销预算。",
    "下周一：飞抵上海，亲自带队攻坚“天成集团”等TOP3客户。",
    "本周五前：完成华东区销售半年复盘，进行严肃绩效面谈。"
  ],
  sloganCn: "拒绝模糊，用行动定义结果",
  footerSub: "EXECUTIVE INSIDER, POWER YOUR DECISION"
};

export const buildList = (items: string[]) =>
  items.map((item) => {
    let content = item;
    // Generic pattern: "Key: Value" or "Key：Value"
    // Capture content before the first colon as the key
    const regex = /^([^：:]+?)[:：]\s*(.*)$/i;
    const match = content.match(regex);
    if (match && !content.startsWith("<strong>")) {
        // Only if key length is reasonable (e.g. < 15 chars) to avoid false positives on long sentences
        if (match[1].length < 15) {
             content = `<strong>${match[1]}</strong> : ${match[2]}`;
        }
    }
    return `<div class="list-item">${content}</div>`;
  }).join("\n");

export const buildGrowCardHtml = (payload: GrowCardPayload) => {
  const goal = payload.goal || "在未来三个月内，明确目标并建立可执行路径。";
  const realityList = buildList(payload.reality?.slice(0, 3) || []);
  const optionsList = buildList(payload.options?.slice(0, 3) || []);
  const willList = buildList(payload.will?.slice(0, 3) || []);

  const slogans = [
    "拒绝模糊，用行动定义结果",
    "复杂留给思考，简单留给行动",
    "想清楚，说明白，做得到"
  ];
  const sloganCn = slogans[Math.floor(Math.random() * slogans.length)];
  const footerSub = "EXECUTIVE INSIDER, POWER YOUR DECISION";

  const growTemplate = loadTemplateHtml("GROW.html", "GROW");
  if (growTemplate.startsWith("Error:")) {
    return growTemplate;
  }

  return growTemplate
    .replace("{{GOAL}}", goal)
    .replace("{{REALITY_LIST}}", realityList)
    .replace("{{OPTIONS_LIST}}", optionsList)
    .replace("{{WILL_LIST}}", willList)
    .replace("{{SLOGAN_CN}}", sloganCn)
    .replace("{{FOOTER_SUB}}", footerSub);
};
