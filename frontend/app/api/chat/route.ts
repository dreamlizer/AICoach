import { NextResponse } from "next/server";
import { stage1_analyze, getRecentHistory, stage3Think, stage4Reply, stage5Profile, generateTitle } from "@/lib/pipeline";
import { saveMessageToDb, updateConversationTitle, updateConversationTool, getMessagesFromDb } from "@/lib/db";
import { executiveTools } from "@/lib/executive_tools";
import { Stage1Analysis } from "@/lib/types";

const growTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GROW Model - Executive Partner</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/dom-to-image-more/3.3.0/dom-to-image-more.min.js"></script>
    <style>
        :root {
            --primary-bg: #191b4d; 
            --accent-color: #fccb2f;
            --page-bg: #fbf7ef;
            --text-main: #2d3748;
            --card-shadow: rgba(0,0,0,0.1);
            --font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            --body-font-size: 0.88rem;
            --line-height: 1.6;
            --body-font-weight: 400;
        }

        .theme-emerald {
            --primary-bg: #064e3b;
            --page-bg: #f0fdf4;
            --accent-color: #fbbf24;
        }

        .theme-slate {
            --primary-bg: #1e293b;
            --page-bg: #f8fafc;
            --accent-color: #94a3b8;
        }

        .theme-red {
            --primary-bg: #bd1e2d;
            --page-bg: #ffffff;
            --accent-color: #4a5568; 
            --text-main: #1a202c;
        }

        .font-song {
            --font-family: "SimSun", "STSong", serif;
            --body-font-weight: 500;
        }

        .font-hei {
            --font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            font-family: var(--font-family);
            font-weight: var(--body-font-weight);
            background-color: #e2e8f0;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
            padding: 0;
        }

        body.exporting .header h1::after,
        body.exporting .footer {
            background: none !important;
        }

        body.exporting * {
            background-image: none !important;
        }

        .toolbar {
            width: 100%;
            max-width: 414px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(5px);
            padding: 12px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            border-bottom: 1px solid #cbd5e0;
        }

        .tool-group {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.7rem;
            color: #4a5568;
        }

        .toolbar button, .toolbar select, .toolbar input[type="range"] {
            padding: 6px 8px;
            font-size: 0.7rem;
            cursor: pointer;
            border: 1px solid #cbd5e0;
            background: #fff;
            border-radius: 4px;
            color: #4a5568;
            outline: none;
        }

        .toolbar input[type="range"] {
            width: 80px;
            padding: 0;
            cursor: ew-resize;
        }

        .toolbar .btn-save {
            background: #2d3748;
            color: white;
            border: none;
            padding: 6px 12px;
        }

        .card-wrapper {
            padding: 15px 0 30px;
            width: 100%;
            display: flex;
            justify-content: center;
        }

        .card {
            background-color: var(--page-bg);
            width: 100%;
            max-width: 414px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 40px var(--card-shadow);
            position: relative;
            transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
        }

        .header {
            background-color: var(--primary-bg);
            padding: 25px 20px 15px;
            color: #ffffff;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            transition: background-color 0.4s;
        }

        .ep-tag {
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 0.6rem;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--accent-color);
            opacity: 0.9;
        }

        .header h1 {
            font-size: 1.3rem;
            font-weight: 700;
            letter-spacing: 1px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header h1::after {
            content: "";
            flex: 1;
            min-width: 24px;
            height: 1px;
            background: linear-gradient(to right, var(--accent-color), transparent);
            opacity: 0.4;
        }

        .container {
            padding: 20px 15px 5px;
        }

        .step-block {
            margin-bottom: 16px;
            display: flex;
            gap: 12px;
        }

        .step-aside {
            flex-shrink: 0;
            width: 36px;
            text-align: center;
        }

        .step-letter {
            font-family: "Georgia", serif;
            font-size: 1.8rem;
            font-weight: 900;
            color: var(--primary-bg);
            line-height: 1;
            transition: color 0.4s;
        }

        .step-main {
            flex-grow: 1;
        }

        .step-title {
            font-size: 0.9rem;
            font-weight: 700;
            color: var(--primary-bg);
            margin-bottom: 5px;
            text-transform: uppercase;
            transition: color 0.4s;
        }

        .step-content {
            background: white;
            padding: 12px 14px;
            border-radius: 2px;
            font-size: var(--body-font-size);
            line-height: var(--line-height);
            color: var(--text-main);
            border-left: 3px solid var(--primary-bg);
            box-shadow: 0 2px 8px rgba(0,0,0,0.03);
            outline: none;
            transition: border-color 0.4s, line-height 0.2s;
        }

        .step-content:focus {
            background: #fffdf9;
            border-left-color: var(--accent-color);
        }

        .list-item {
            margin-bottom: 4px;
            padding-left: 12px;
            position: relative;
        }

        .list-item::before {
            content: "";
            position: absolute;
            left: 0;
            top: calc(0.5em * var(--line-height));
            width: 4px;
            height: 1px;
            background-color: var(--accent-color);
        }

        .highlight-text {
            color: var(--primary-bg);
            font-weight: 600;
        }

        .footer {
            padding: 20px;
            text-align: center;
            background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.01));
        }

        .slogan-cn {
            font-size: 0.85rem;
            color: var(--primary-bg);
            font-weight: 600;
            letter-spacing: 3px;
            margin-bottom: 4px;
            outline: none;
            transition: color 0.4s;
        }

        .footer-sub {
            font-size: 0.55rem;
            color: var(--text-muted);
            letter-spacing: 1px;
            text-transform: uppercase;
            outline: none;
        }

        #export-loading {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255,255,255,0.9);
            z-index: 1000;
            justify-content: center;
            align-items: center;
            font-weight: 500;
            color: var(--primary-bg);
        }
    </style>
</head>
<body class="font-hei">

    <div id="export-loading">正在准备高清卡片...</div>

    <div class="toolbar" id="control-panel">
        <select id="font-select" onchange="changeFont(this.value)">
            <option value="hei">现代黑体</option>
            <option value="song">经典宋体</option>
        </select>
        
        <div class="tool-group">
            <span>字号</span>
            <button onclick="changeFontSize(1)">+</button>
            <button onclick="changeFontSize(-1)">-</button>
        </div>

        <div class="tool-group">
            <span>间距</span>
            <input type="range" id="lh-range" min="1.2" max="2.2" step="0.1" value="1.6" oninput="changeLineHeight(this.value)">
        </div>

        <button onclick="nextTheme()">切换配色</button>
        <button class="btn-save" onclick="saveAsImage()">存为图片</button>
    </div>

    <div class="card-wrapper" id="capture-area">
        <div class="card" id="main-card">
            <header class="header">
                <span class="ep-tag" contenteditable="true">Executive Partner</span>
                <h1 contenteditable="true">GROW COACHING</h1>
            </header>

            <main class="container">
                <section class="step-block">
                    <div class="step-aside">
                        <div class="step-letter">G</div>
                    </div>
                    <div class="step-main">
                        <h2 class="step-title" contenteditable="true">Goal / 目标确立</h2>
                        <div class="step-content" contenteditable="true">
                            {{GOAL}}
                        </div>
                    </div>
                </section>

                <section class="step-block">
                    <div class="step-aside">
                        <div class="step-letter" style="margin-left: -2px;">R</div>
                    </div>
                    <div class="step-main">
                        <h2 class="step-title" contenteditable="true">Reality / 现状分析</h2>
                        <div class="step-content" contenteditable="true">
                            {{REALITY_LIST}}
                        </div>
                    </div>
                </section>

                <section class="step-block">
                    <div class="step-aside">
                        <div class="step-letter">O</div>
                    </div>
                    <div class="step-main">
                        <h2 class="step-title" contenteditable="true">Options / 方案选择</h2>
                        <div class="step-content" contenteditable="true">
                            {{OPTIONS_LIST}}
                        </div>
                    </div>
                </section>

                <section class="step-block">
                    <div class="step-aside">
                        <div class="step-letter" style="margin-left: -2px;">W</div>
                    </div>
                    <div class="step-main">
                        <h2 class="step-title" contenteditable="true">Will / 意愿行动</h2>
                        <div class="step-content" contenteditable="true">
                            {{WILL_LIST}}
                        </div>
                    </div>
                </section>
            </main>

            <footer class="footer">
                <div class="slogan-cn" contenteditable="true">{{SLOGAN_CN}}</div>
                <div class="footer-sub" contenteditable="true">{{FOOTER_SUB}}</div>
            </footer>
        </div>
    </div>

    <script>
        function changeFont(val) {
            document.body.className = val === 'song' ? 'font-song' : 'font-hei';
        }

        let currentSize = 0.88;
        function changeFontSize(delta) {
            currentSize = Math.max(0.7, Math.min(1.2, currentSize + delta * 0.05));
            document.documentElement.style.setProperty('--body-font-size', currentSize + 'rem');
        }

        function changeLineHeight(val) {
            document.documentElement.style.setProperty('--line-height', val);
        }

        const themes = ['', 'theme-emerald', 'theme-slate', 'theme-red'];
        let currentThemeIndex = 0;
        function nextTheme() {
            const card = document.getElementById('main-card');
            card.classList.remove(...themes.filter(t => t !== ''));
            currentThemeIndex = (currentThemeIndex + 1) % themes.length;
            if (themes[currentThemeIndex]) {
                card.classList.add(themes[currentThemeIndex]);
            }
        }

            // 最终方案：使用 dom-to-image-more (基于 SVG foreignObject)
            // 彻底避开 html2canvas 的 createPattern 布局塌陷问题
            const saveAsImage = async () => {
                const loading = document.getElementById('export-loading');
                const card = document.getElementById('main-card');
                // @ts-ignore
                if (!card || !window.domtoimage) {
                    console.error("组件未加载或库缺失");
                    return;
                }

                loading.style.display = 'flex';
                
                // 1. 临时锁定尺寸以保证导出清晰度 (2x)
                const scale = 2;
                const originalWidth = card.style.width;
                const originalHeight = card.style.height;
                const originalTransform = card.style.transform;
                
                // 强制设置一个固定宽度进行渲染，防止移动端布局差异
                // 414px 是标准移动端宽度，导出时放大2倍
                card.style.width = '414px';
                card.style.height = 'auto'; // 让高度自适应
                card.style.transform = 'none';
                card.style.margin = '0'; // 移除可能的外边距影响
                
                // 移除阴影，防止导出时包含半透明阴影区域，导致用户觉得有"透明背景"
                const originalBoxShadow = card.style.boxShadow;
                card.style.boxShadow = 'none';

                try {
                    // 2. 稍微延迟等待 DOM 重排
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // @ts-ignore
                    const dataUrl = await window.domtoimage.toPng(card, {
                        width: 414 * scale,
                        height: card.offsetHeight * scale,
                        style: {
                            transform: 'scale(' + scale + ')',
                            transformOrigin: 'top left',
                            width: '414px',
                            height: 'auto',
                            'background-color': '#fbf7ef', // 强制设置背景色，防止出现透明格子
                            'box-shadow': 'none', // 确保导出图像无阴影
                            'margin': '0'
                        },
                        bgcolor: '#fbf7ef' // dom-to-image 顶层配置，兜底填充背景色
                    });

                    const link = document.createElement('a');
                    link.download = 'Executive_GROW_Card.png';
                    link.href = dataUrl;
                    link.click();
                } catch (err) {
                    console.error("dom-to-image 导出失败:", err);
                    alert("导出失败，请重试");
                } finally {
                    // 3. 恢复原始样式
                    card.style.width = originalWidth;
                    card.style.height = originalHeight;
                    card.style.transform = originalTransform;
                    card.style.margin = '';
                    card.style.boxShadow = originalBoxShadow;
                    loading.style.display = 'none';
                }
            };
    </script>

</body>
</html>`;

type GrowCardPayload = {
  goal: string;
  reality: string[];
  options: string[];
  will: string[];
  sloganCn: string;
  footerSub: string;
};

const cleanJsonBlock = (text: string) => {
  const jsonFence = text.match(/```json\s*([\s\S]*?)```/i);
  if (jsonFence) return jsonFence[1].trim();
  const genericFence = text.match(/```([\s\S]*?)```/);
  if (genericFence) return genericFence[1].trim();
  return text.trim();
};

const buildList = (items: string[]) =>
  items.map((item) => `<div class="list-item">${item}</div>`).join("\n");

const buildGrowCardHtml = (payload: GrowCardPayload) => {
  const goal = payload.goal || "在未来三个月内，明确目标并建立可执行路径。";
  const realityList = buildList(payload.reality?.slice(0, 3) || []);
  const optionsList = buildList(payload.options?.slice(0, 3) || []);
  const willList = buildList(payload.will?.slice(0, 3) || []);
  const sloganCn = payload.sloganCn || "见微知著，引领战略全局";
  const footerSub = payload.footerSub || "STRATEGIC LEADERSHIP • EXECUTIVE COACHING CARD";
  return growTemplate
    .replace("{{GOAL}}", goal)
    .replace("{{REALITY_LIST}}", realityList)
    .replace("{{OPTIONS_LIST}}", optionsList)
    .replace("{{WILL_LIST}}", willList)
    .replace("{{SLOGAN_CN}}", sloganCn)
    .replace("{{FOOTER_SUB}}", footerSub);
};

export async function POST(request: Request) {
  try {
    const { message, conversationId, toolId, toolTitle } = await request.json();

    if (!message || !conversationId) {
      return NextResponse.json(
        { error: "Message and conversationId are required" },
        { status: 400 }
      );
    }

    // 1. Save User Message to DB
    try {
      saveMessageToDb(conversationId, "user", message);
      if (toolId && toolTitle) {
        const existing = getMessagesFromDb(conversationId, 5);
        if (existing.length === 1 && existing[0].role === "user") {
          updateConversationTitle(conversationId, toolTitle);
          updateConversationTool(conversationId, toolId);
        }
      }
    } catch (dbError) {
      console.error("DB Save Error (User):", dbError);
      // Continue execution even if DB save fails, to provide reply
    }

    // 2. Stage 2: Retrieve Memory
    const memory = getRecentHistory(conversationId);

    // Parallel Execution: Stage 1 (Analysis) & Stage 5 (Profile)
    // Use Promise.allSettled to ensure one failure doesn't stop the other
    const [analysisResult, profileResult] = await Promise.allSettled([
      stage1_analyze(message),
      stage5Profile(memory)
    ]);

    // Handle Stage 1 Result
    const analysis: Stage1Analysis = analysisResult.status === "fulfilled" 
      ? analysisResult.value 
      : { 
          intent: "CHAT", 
          sentiment: "Unknown", 
          complexity: "LOW", 
          keywords: ["Error"] 
        };

    if (analysisResult.status === "rejected") {
      console.error("Stage 1 Failed:", analysisResult.reason);
    }

    // Handle Stage 5 Result
    const userProfile = profileResult.status === "fulfilled" 
      ? profileResult.value 
      : null;

    if (profileResult.status === "rejected") {
      console.error("Stage 5 Failed:", profileResult.reason);
    }

    const tool = toolId ? executiveTools.find((item) => item.id === toolId) : null;
    const shouldGenerateGrowSample =
      toolId === "grow" && /样本|示例|模板|卡片|样例|demo|看看/i.test(message);
    const shouldGenerateGrowCard =
      toolId === "grow" && /生成|输出|制作|给我|整理|卡片|总结/i.test(message);

    // 4. Stage 3: Deep Thinking (Strategy)
    const strategy = await stage3Think(message, analysis, memory);

    // 5. Stage 4: Expression (Final Reply)
    let aiReply = strategy 
      ? await stage4Reply(strategy)
      : "抱歉，我今天状态不佳，无法进行思考。";

    if ((shouldGenerateGrowSample || shouldGenerateGrowCard) && tool?.prompt) {
      const sampleCase = `
案例背景：
- 角色：某 B 端 SaaS 产品负责人
- 目标：三个月内将交付周期从 22 天缩短至 15 天
- 现状：需求变更频繁、跨部门协作慢、测试环境手动部署
- 资源：已具备基础看板与数据追踪能力
`.trim();
      const dataPrompt = `
${tool.prompt}

${shouldGenerateGrowSample ? `请基于以下具体案例生成卡片内容，不要提及“样本/模板/示例”等字样。\n${sampleCase}` : `当前用户请求：${message}`}

请只输出 JSON，不要输出其它文字或 Markdown。
JSON 格式：
{
  "goal": "一句话目标，可包含 <span class=\\"highlight-text\\">关键数字</span>",
  "reality": ["现状1", "现状2", "现状3"],
  "options": ["方案1", "方案2", "方案3"],
  "will": ["<strong>即刻：</strong> ...", "<strong>本周：</strong> ...", "<strong>机制：</strong> ..."],
  "sloganCn": "中文标语",
  "footerSub": "英文副标题"
}
`.trim();
      const jsonText = await stage4Reply(strategy || "生成卡片数据", dataPrompt);
      let payload: GrowCardPayload | null = null;
      try {
        payload = JSON.parse(cleanJsonBlock(jsonText));
      } catch (error) {
        payload = null;
      }
      const fallbackPayload: GrowCardPayload = {
        goal: "未来三个月内，将交付周期从 <span class=\"highlight-text\">22天</span> 缩短至 <span class=\"highlight-text\">15天</span>。",
        reality: ["需求变更频繁，约 30% 重复开发。", "跨部门协作平均耗时 4.5 天。", "测试环境手动部署，缺少流水线。"],
        options: ["推行看板管理，严格需求准入。", "引入 CI/CD 流水线，降低人为风险。", "下放日常决策权，简化审批路径。"],
        will: ["<strong>即刻：</strong> 启动全流程瓶颈审计。", "<strong>本周：</strong> 确定改造负责人和节点。", "<strong>机制：</strong> 建立每周效能复盘闭环。"],
        sloganCn: "见微知著，引领战略全局",
        footerSub: "STRATEGIC LEADERSHIP • EXECUTIVE COACHING CARD"
      };
      const html = buildGrowCardHtml(payload || fallbackPayload);
      aiReply = `\`\`\`html\n${html}\n\`\`\``;
    }

    // 6. Construct Response
    const debugInfo = {
        stage1: analysis,
        stage2_memory: memory || "无历史记忆",
        stage3_strategy: strategy || "策略生成失败",
        stage5_profile: userProfile || "画像更新失败或无变化"
    };

    try {
      // Save AI Reply (Text)
      saveMessageToDb(conversationId, "ai", aiReply, "text");
      
      // Save Analysis Process (Analysis)
      // We save this as a separate message with kind="analysis" so it persists in history
      saveMessageToDb(
        conversationId, 
        "ai", 
        "Full-Link Debug", 
        "analysis", 
        JSON.stringify(debugInfo)
      );

      // Async Title Generation Optimization
      // Only generate if it's the first exchange (message count <= 2)
      // We can check DB or just assume if we want to update titles periodically.
      // For efficiency, let's just do it for short conversations or explicitly when it's new.
      // Since we don't know if it's new easily without querying, let's query quickly.
      const msgs = getMessagesFromDb(conversationId, 10);
      if (msgs.length <= 2 && !toolTitle) {
         // Fire and forget - don't await
         generateTitle(message, aiReply).then(newTitle => {
            if (newTitle) {
               console.log(`Updating title for ${conversationId} to: ${newTitle}`);
               updateConversationTitle(conversationId, newTitle);
            }
         }).catch(err => console.error("Async Title Gen Error:", err));
      }

    } catch (dbError) {
      console.error("DB Save Error (AI):", dbError);
    }

    return NextResponse.json({
      reply: aiReply,
      debug_info: debugInfo
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
