export type TeamDiagnosisPayload = {
  taskIssues: string[]; // 任务视角 (关于事)
  peopleIssues: string[]; // 协作视角 (关于人)
  keyLeverage: string; // 关键杠杆 Key Leverage Point
};

const teamDiagnosisTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Diagnosis List</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <style>
        :root {
            --bg-deep: #191b4d; 
            --accent-gold: #fccb2f;
            --text-main: #2d3748;
            --task-blue: #3b82f6;
            --people-orange: #f59e0b;
        }

        body {
            margin: 0;
            padding: 20px;
            background-color: #f3f4f6;
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }

        .main-card {
            width: 375px;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        /* 表头：最简版 */
        .card-header {
            background-color: var(--bg-deep);
            color: #fff;
            padding: 30px 24px;
        }
        .header-title {
            font-size: 32px;
            font-weight: 800;
            color: var(--accent-gold);
            margin: 0;
            line-height: 1.1;
        }
        .header-sub {
            font-size: 11px;
            opacity: 0.6;
            margin-top: 6px;
            text-transform: uppercase;
        }

        /* 内容区 */
        .card-body {
            padding: 24px;
            flex: 1;
        }

        .split-layout {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
        }

        .col {
            flex: 1;
        }

        .col-header {
            font-size: 13px;
            font-weight: 800;
            margin-bottom: 10px;
            padding-bottom: 4px;
            border-bottom: 2px solid #eee;
        }
        .task-col .col-header { color: #1e3a8a; border-bottom-color: rgba(59, 130, 246, 0.3); }
        .people-col .col-header { color: #9a3412; border-bottom-color: rgba(245, 158, 11, 0.3); }

        /* 列表样式 */
        .issue-list {
            margin: 0;
            padding: 0;
            list-style: none;
        }

        .issue-item {
            font-size: 11px;
            line-height: 1.4;
            color: var(--text-main);
            margin-bottom: 8px;
            padding-left: 12px;
            position: relative;
        }

        /* 自定义圆点 */
        .issue-item::before {
            content: "";
            position: absolute;
            left: 0;
            top: 5px;
            width: 4px;
            height: 4px;
            border-radius: 50%;
        }
        .task-col .issue-item::before { background-color: var(--task-blue); }
        .people-col .issue-item::before { background-color: var(--people-orange); }

        /* 关键杠杆 */
        .insight-box {
            background: #fffcf0;
            border: 1px dashed #cbd5e1;
            border-radius: 8px;
            padding: 14px;
            margin-top: 4px;
        }
        .insight-label {
            font-size: 10px;
            font-weight: 800;
            color: #b45309;
            text-transform: uppercase;
            margin-bottom: 4px;
            display: block;
        }
        .insight-text {
            font-size: 12px;
            font-weight: 500;
            line-height: 1.5;
            color: #2d3748;
        }

        /* 页脚 */
        .card-footer {
            padding: 16px 24px;
            border-top: 1px solid #edf2f7;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .footer-logo { font-weight: 900; color: var(--bg-deep); font-size: 12px; }
        .footer-tag { border: 1px solid #cbd5e1; color: #94a3b8; font-size: 9px; padding: 2px 6px; border-radius: 4px; }
    </style>
</head>
<body>

    <div class="main-card" id="team-card">
        <div class="card-header">
            <h1 class="header-title">GROW COACHING</h1>
            <div class="header-sub">Team Diagnosis Snapshot</div>
        </div>

        <div class="card-body">
            <div class="split-layout">
                <div class="col task-col">
                    <div class="col-header">任务视角 (关于事)</div>
                    <ul class="issue-list">
                        {{TASK_ISSUES}}
                    </ul>
                </div>

                <div class="col people-col">
                    <div class="col-header">协作视角 (关于人)</div>
                    <ul class="issue-list">
                        {{PEOPLE_ISSUES}}
                    </ul>
                </div>
            </div>

            <div class="insight-box">
                <span class="insight-label">Key Leverage Point</span>
                <div class="insight-text">
                    {{KEY_LEVERAGE}}
                </div>
            </div>
        </div>

        <div class="card-footer">
            <div class="footer-logo">Executive Insider</div>
            <div class="footer-tag">CONFIDENTIAL</div>
        </div>
    </div>

</body>
</html>`;

const buildListItems = (items: string[]) => {
    return items.map(item => `<li class="issue-item">${item}</li>`).join('\n');
};

export const buildTeamDiagnosisHtml = (payload: TeamDiagnosisPayload) => {
    const taskIssuesHtml = buildListItems(payload.taskIssues);
    const peopleIssuesHtml = buildListItems(payload.peopleIssues);
    const keyLeverage = payload.keyLeverage || "无关键诊断信息";

    return teamDiagnosisTemplate
        .replace("{{TASK_ISSUES}}", taskIssuesHtml)
        .replace("{{PEOPLE_ISSUES}}", peopleIssuesHtml)
        .replace("{{KEY_LEVERAGE}}", keyLeverage);
};
