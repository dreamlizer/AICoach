import { GrowCardPayload } from "./index";

export type { GrowCardPayload };

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

const growTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GROW Model - Executive Insider</title>
    <!-- 引入 html2canvas 用于保存图片 -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <style>
        :root {
            /* 预设配色方案：经典深蓝 */
            --primary-bg: #191b4d; 
            --accent-color: #fccb2f;
            --page-bg: #fbf7ef;
            --text-main: #2d3748;
            --card-shadow: rgba(0,0,0,0.1);
            --font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            --body-font-size: 0.88rem;
            --line-height: 1.6; /* 默认行间距 */
        }

        /* 主题定义 */
        .theme-emerald {
            --primary-bg: #064e3b; /* 墨绿 */
            --page-bg: #f0fdf4;
            --accent-color: #fbbf24;
        }

        .theme-slate {
            --primary-bg: #1e293b; /* 岩灰 */
            --page-bg: #f8fafc;
            --accent-color: #94a3b8;
        }

        /* 专业红主题 */
        .theme-red {
            --primary-bg: #bd1e2d; /* 专业红 */
            --page-bg: #ffffff;
            --accent-color: #4a5568; 
            --text-main: #1a202c;
        }

        .font-song {
            --font-family: "SimSun", "STSong", serif;
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
            background-color: #e2e8f0;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
            padding: 0;
        }

        /* 控制面板样式 */
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

        /* 卡片容器 */
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

        /* 紧凑头部 */
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
            height: 1px;
            background: linear-gradient(to right, var(--accent-color), transparent);
            opacity: 0.4;
        }

        /* 内容区 */
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

        /* 底部标语 */
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

        /* 导出遮罩 */
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

    <!-- 控制面板 -->
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
                <span class="ep-tag" contenteditable="true">Executive Insider</span>
                <h1 contenteditable="true">GROW 行动路线图</h1>
            </header>

            <main class="container">
                <!-- GOAL -->
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

                <!-- REALITY -->
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

                <!-- OPTIONS -->
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

                <!-- WILL -->
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
        // 1. 字体调整
        function changeFont(val) {
            document.body.className = val === 'song' ? 'font-song' : 'font-hei';
        }

        // 2. 字号调整
        let currentSize = 0.88;
        function changeFontSize(delta) {
            currentSize = Math.max(0.7, Math.min(1.2, currentSize + delta * 0.05));
            document.documentElement.style.setProperty('--body-font-size', currentSize + 'rem');
        }

        // 3. 行间距调整
        function changeLineHeight(val) {
            document.documentElement.style.setProperty('--line-height', val);
        }

        // 4. 配色方案切换
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

        // 5. 存为图片
        function saveAsImage() {
            const loading = document.getElementById('export-loading');
            const card = document.getElementById('main-card');
            
            loading.style.display = 'flex';
            
            setTimeout(() => {
                html2canvas(card, {
                    scale: 3, 
                    useCORS: true,
                    backgroundColor: null,
                    logging: false
                }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = 'Executive_GROW_Card.png';
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    loading.style.display = 'none';
                }).catch(err => {
                    console.error("导出失败:", err);
                    loading.style.display = 'none';
                });
            }, 100);
        }
    </script>

</body>
</html>`;

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

  return growTemplate
    .replace("{{GOAL}}", goal)
    .replace("{{REALITY_LIST}}", realityList)
    .replace("{{OPTIONS_LIST}}", optionsList)
    .replace("{{WILL_LIST}}", willList)
    .replace("{{SLOGAN_CN}}", sloganCn)
    .replace("{{FOOTER_SUB}}", footerSub);
};
