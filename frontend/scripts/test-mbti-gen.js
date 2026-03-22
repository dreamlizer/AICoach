
const OpenAI = require("openai");
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIG
// ==========================================
const MODEL_ID = "ep-m-20260203223653-fscf5"; // The ID from stage_settings.ts
// Mock the prompt content directly to avoid import issues in JS script
const MBTI_GENERATOR_PROMPT = `
# Role: Executive Simulation Architect (高管情境模拟架构师)

# Task
你的任务是为用户构建一套量身定制的、包含 **16 道两难选择题** 的职场生存模拟战。

# 1. 关键：信息颗粒度核查 (Input Sanity Check)
首先检查用户提供的【职位/角色】信息。

## 判定逻辑：
1. **Case A: 无效/乱码 (Invalid)**
   - 输入如: "asdf", "123", "不知道", "测试".
   - **Action**: 忽略输入，强制设定 **Role = "初创公司 CEO"**。
   - **Note**: 生成通用的、适合管理者的商业场景。

2. **Case B: 角色扮演 (Roleplay)**
   - 输入如: "秦始皇", "全职妈妈", "黑帮教父".
   - **Action**: **接受设定！** 生成符合该角色世界观的决策题。

3. **Case C: 正常职位 (Valid)**
   - 输入如: "CFO", "SaaS销售总监", "HRBP".
   - **Action**: 正常生成高管模拟题。

# 2. 题目编排逻辑：螺旋穿插 (Helix Pattern)
**严禁**按维度堆叠题目。必须采用 **4x4 螺旋穿插** 顺序：
- **Round 1 (Q1-Q4)**: E/I -> S/N -> T/F -> J/P
- **Round 2 (Q5-Q8)**: E/I -> S/N -> T/F -> J/P
- **Round 3 (Q9-Q12)**: E/I -> S/N -> T/F -> J/P
- **Round 4 (Q13-Q16)**: E/I -> S/N -> T/F -> J/P

# 3. 维度定义 (Design Philosophy)
- **E/I (能量)**: E=外部互动/聚会; I=独处/深思.
- **S/N (视野)**: S=当下/细节/数据; N=未来/愿景/模式.
- **T/F (决策)**: T=逻辑/效率/合规; F=情感/士气/人际.
- **J/P (节奏)**: J=计划/掌控/关闭选项; P=灵活/适应/保留选项.

# 4. 内容生成规则 (Content Rules)
- **Scenario (场景)**: 必须是该角色真正会遇到的**高压/诱惑/两难**时刻。
- **Options (选项)**:
   - 必须是**具体的行动 (Actions)**，绝不能是心态描述。
   - 选项 A 和 B 必须互斥。

# 5. 输出格式 (Strict JSON Only)
请直接输出 JSON 数组，**不要包含** \`\`\`json 标记或任何解释性文字。

格式范例：
[
  {
    "id": 1,
    "dimension": "E_I",
    "title": "🔴 [Role] 的抉择时刻",
    "scenario": "IPO 路演连续讲了 5 天，今晚终于有 2 小时空闲。团队在楼下酒吧等你庆祝，但你脑子里还在复盘。",
    "options": [
      { "label": "A", "text": "下楼！这种时刻必须和兄弟们在一起 (E)", "value": "E" },
      { "label": "B", "text": "关门！只有独处复盘才能让我安心 (I)", "value": "I" }
    ]
  },
  ... (直到 Q16)
]
`;

// ==========================================
// SETUP
// ==========================================

// Load API Key
const envPath = path.resolve(__dirname, '../.env.local');
let apiKey = process.env.DOUBAO_API_KEY;

if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  const match = envConfig.match(/DOUBAO_API_KEY=(.*)/);
  if (match) {
    apiKey = match[1].trim();
  }
}

if (!apiKey) {
  console.error("❌ ERROR: No DOUBAO_API_KEY found in .env.local or process.env");
  process.exit(1);
}

console.log("=== MBTI Generation Test (Standalone) ===");
console.log(`API Key: ${apiKey.substring(0, 10)}...`);
console.log(`Model ID: ${MODEL_ID}`);

const openai = new OpenAI({
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
  apiKey: apiKey,
});

// ==========================================
// TEST FUNCTION
// ==========================================
async function runTest() {
  const userProfile = {
    role: "财务总监",
    gender: "男",
    background: "传统制造业"
  };

  const userContext = `
  User Profile:
  - Role/Position: ${userProfile.role}
  - Gender: ${userProfile.gender}
  - Industry/Background: ${userProfile.background}
  `;

  const messages = [
    { role: "system", content: MBTI_GENERATOR_PROMPT },
    { role: "user", content: `Please generate 16 MBTI assessment questions for this user.\n${userContext}` }
  ];

  console.log("\n🚀 Sending request to Doubao...");
  console.log(`Payload: Role=${userProfile.role}, Reasoning=minimal`);
  
  const startTime = Date.now();

  try {
    const completion = await openai.chat.completions.create({
      messages,
      model: MODEL_ID,
      stream: false,
      reasoning_effort: "minimal" // As per route.ts
    });

    const duration = Date.now() - startTime;
    console.log(`\n✅ Request completed in ${(duration / 1000).toFixed(2)}s`);
    
    if (completion.usage) {
      console.log(`📊 Usage: Input=${completion.usage.prompt_tokens}, Output=${completion.usage.completion_tokens}, Total=${completion.usage.total_tokens}`);
    }

    const content = completion.choices[0].message.content;
    console.log(`\n📝 Raw Content Preview (First 200 chars):\n${content.substring(0, 200)}...`);

    // Try Parsing
    console.log("\n🔍 Attempting to parse JSON...");
    
    // Logic from route.ts
    const startIdx = content.indexOf('[');
    const endIdx = content.lastIndexOf(']');
    
    let jsonStr = "";
    if (startIdx !== undefined && startIdx >= 0 && endIdx !== undefined && endIdx > startIdx) {
      jsonStr = content.substring(startIdx, endIdx + 1);
    } else {
      jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
    }

    try {
      const questions = JSON.parse(jsonStr);
      console.log(`✅ JSON Parsed Successfully! Found ${questions.length} questions.`);
      
      if (questions.length > 0) {
        console.log("First Question Sample:", JSON.stringify(questions[0], null, 2));
        
        // Check normalization logic
        const q1 = questions[0];
        if (q1.options && Array.isArray(q1.options)) {
           console.log("Has 'options' array: YES");
        } else if (q1.optionA && q1.optionB) {
           console.log("Has optionA/optionB directly: YES");
        } else {
           console.log("⚠️ WARNING: Unknown option structure.");
        }
      }
    } catch (e) {
      console.error("❌ JSON Parse Failed:", e.message);
      console.log("Bad JSON Content:", jsonStr.substring(0, 500));
    }

  } catch (error) {
    console.error("\n❌ FATAL ERROR: Request failed.");
    console.error("Message:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

runTest();
