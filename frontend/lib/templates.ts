export type GrowCardPayload = {
  goal: string;
  reality: string[];
  options: string[];
  will: string[];
  sloganCn: string;
  footerSub: string;
};

const growTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GROW Model - Executive Partner</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/dom-to-image-more/3.3.0/dom-to-image-more.min.js" 
            crossorigin="anonymous"
            onerror="alert('导出组件加载失败，请检查网络连接或刷新页面重试。'); console.error('Failed to load dom-to-image-more');"></script>
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
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .step-letter {
            font-size: 0.9rem;
            font-weight: 800;
            color: var(--primary-bg);
            background: rgba(0,0,0,0.05);
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 6px;
        }

        .step-line {
            width: 1px;
            flex: 1;
            background: #cbd5e0;
            min-height: 10px;
        }

        .step-block:last-child .step-line {
            display: none;
        }

        .step-main {
            flex: 1;
            padding-bottom: 10px;
        }

        .step-title {
            font-size: 0.75rem;
            color: #718096;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }

        .step-content {
            font-size: var(--body-font-size);
            line-height: var(--line-height);
            color: var(--text-main);
        }

        .highlight-text {
            font-weight: 600;
            color: var(--primary-bg);
        }

        .list-item {
            position: relative;
            padding-left: 12px;
            margin-bottom: 4px;
        }

        .list-item::before {
            content: "•";
            position: absolute;
            left: 0;
            color: var(--accent-color);
        }

        .footer {
            background-color: var(--primary-bg);
            padding: 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .footer::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: repeating-linear-gradient(
                90deg,
                var(--accent-color),
                var(--accent-color) 4px,
                transparent 4px,
                transparent 8px
            );
            opacity: 0.5;
        }

        .slogan-cn {
            color: #ffffff;
            font-size: 1rem;
            font-weight: 600;
            letter-spacing: 2px;
            margin-bottom: 8px;
        }

        .footer-sub {
            color: rgba(255,255,255,0.6);
            font-size: 0.55rem;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .logo-mark {
            margin-top: 15px;
            opacity: 0.3;
        }

        @media (min-width: 480px) {
            .card {
                border-radius: 2px;
            }
        }
    </style>
</head>
<body>

    <div id="export-loading" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.8); z-index: 9999; justify-content: center; align-items: center; flex-direction: column; gap: 10px;">
        <div style="width: 30px; height: 30px; border: 3px solid #cbd5e0; border-top-color: #2d3748; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <div style="font-size: 0.8rem; color: #4a5568;">正在生成高清图片...</div>
    </div>

    <div class="toolbar" id="toolbar">
        <div class="tool-group">
            <span>字号</span>
            <input type="range" min="0.7" max="1.1" step="0.02" value="0.88" oninput="changeFontSize(this.value)">
        </div>
        <div class="tool-group">
            <span>行距</span>
            <input type="range" min="1.4" max="2.0" step="0.1" value="1.6" oninput="changeLineHeight(this.value)">
        </div>
        <div class="tool-group">
            <button onclick="nextTheme()">切换配色</button>
            <button onclick="toggleFont()">切换字体</button>
        </div>
        <button class="btn-save" onclick="saveAsImage()">保存图片</button>
    </div>

    <div class="card-wrapper">
        <div class="card" id="main-card">
            <div class="header">
                <div class="ep-tag">Executive Partner</div>
                <h1>GROW <span>Strategy</span></h1>
            </div>

            <div class="container">
                <!-- G -->
                <div class="step-block">
                    <div class="step-aside">
                        <div class="step-letter">G</div>
                        <div class="step-line"></div>
                    </div>
                    <div class="step-main">
                        <div class="step-title">Goal / 目标锚定</div>
                        <div class="step-content highlight-text">
                            {{GOAL}}
                        </div>
                    </div>
                </div>

                <!-- R -->
                <div class="step-block">
                    <div class="step-aside">
                        <div class="step-letter">R</div>
                        <div class="step-line"></div>
                    </div>
                    <div class="step-main">
                        <div class="step-title">Reality / 现状透视</div>
                        <div class="step-content">
                            {{REALITY_LIST}}
                        </div>
                    </div>
                </div>

                <!-- O -->
                <div class="step-block">
                    <div class="step-aside">
                        <div class="step-letter">O</div>
                        <div class="step-line"></div>
                    </div>
                    <div class="step-main">
                        <div class="step-title">Options / 路径探索</div>
                        <div class="step-content">
                            {{OPTIONS_LIST}}
                        </div>
                    </div>
                </div>

                <!-- W -->
                <div class="step-block">
                    <div class="step-aside">
                        <div class="step-letter">W</div>
                    </div>
                    <div class="step-main">
                        <div class="step-title">Will / 关键行动</div>
                        <div class="step-content">
                            {{WILL_LIST}}
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer">
                <div class="slogan-cn">{{SLOGAN_CN}}</div>
                <div class="footer-sub">{{FOOTER_SUB}}</div>
            </div>
        </div>
    </div>

    <script>
        const fonts = ['', 'font-song'];
        let currentFontIndex = 0;
        function toggleFont() {
            const body = document.body;
            body.classList.remove(...fonts.filter(f => f !== ''));
            currentFontIndex = (currentFontIndex + 1) % fonts.length;
            if (fonts[currentFontIndex]) {
                body.classList.add(fonts[currentFontIndex]);
            }
        }

        function changeFontSize(val) {
            const currentSize = parseFloat(val);
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

export const SAMPLE_CASE = `
案例背景：
- 角色：某 B 端 SaaS 产品负责人
- 目标：三个月内将交付周期从 22 天缩短至 15 天
- 现状：需求变更频繁、跨部门协作慢、测试环境手动部署
- 资源：已具备基础看板与数据追踪能力
`.trim();

export const FALLBACK_PAYLOAD: GrowCardPayload = {
  goal: "未来三个月内，将交付周期从 <span class=\"highlight-text\">22天</span> 缩短至 <span class=\"highlight-text\">15天</span>。",
  reality: ["需求变更频繁，约 30% 重复开发。", "跨部门协作平均耗时 4.5 天。", "测试环境手动部署，缺少流水线。"],
  options: ["推行看板管理，严格需求准入。", "引入 CI/CD 流水线，降低人为风险。", "下放日常决策权，简化审批路径。"],
  will: ["即刻：启动全流程瓶颈审计。", "本周：确定改造负责人和节点。", "机制：建立每周效能复盘闭环。"],
  sloganCn: "见微知著，引领战略全局",
  footerSub: "STRATEGIC LEADERSHIP • EXECUTIVE COACHING CARD"
};

export const buildList = (items: string[]) =>
  items.map((item) => {
    // Auto-bold known prefixes if they aren't already bolded
    let content = item;
    const prefixes = ["即刻", "本周", "机制", "Immediate", "This Week", "Mechanism"];
    for (const prefix of prefixes) {
        // Regex looks for prefix at start, possibly followed by colon/space, ensuring not already inside a tag
        const regex = new RegExp(`^(${prefix}[:：]?)\\s*(.*)`, "i");
        const match = content.match(regex);
        if (match && !content.startsWith("<strong>")) {
            content = `<strong>${match[1]}</strong> ${match[2]}`;
            break; 
        }
    }
    return `<div class="list-item">${content}</div>`;
  }).join("\n");

export const buildGrowCardHtml = (payload: GrowCardPayload) => {
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
