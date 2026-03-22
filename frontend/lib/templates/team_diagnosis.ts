import { loadTemplateHtml } from "./template_utils";

export type TeamDiagnosisPayload = {
  taskIssues: string[]; // 任务视角 (关于事)
  peopleIssues: string[]; // 协作视角 (关于人)
  keyLeverage: string; // 关键杠杆 Key Leverage Point
};

const buildListItems = (items: string[]) => {
    return items.map(item => `<li class="issue-item">${item}</li>`).join('\n');
};

export const buildTeamDiagnosisHtml = (payload: TeamDiagnosisPayload) => {
    const taskIssuesHtml = buildListItems(payload.taskIssues);
    const peopleIssuesHtml = buildListItems(payload.peopleIssues);
    const keyLeverage = payload.keyLeverage || "无关键诊断信息";

    const teamDiagnosisTemplate = loadTemplateHtml("TeamDiagnosis.html", "TeamDiagnosis");
    if (teamDiagnosisTemplate.startsWith("Error:")) {
        return teamDiagnosisTemplate;
    }

    return teamDiagnosisTemplate
        .replace("{{TASK_ISSUES}}", taskIssuesHtml)
        .replace("{{PEOPLE_ISSUES}}", peopleIssuesHtml)
        .replace("{{KEY_LEVERAGE}}", keyLeverage);
};
