
const fs = require('fs');
const path = require('path');
const OpenAI = require("openai");

// Load .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
let apiKey = process.env.DOUBAO_API_KEY;
let modelId = process.env.DOUBAO_MODEL_ID || process.env.DOUBAO_MODEL_ID_LITE || process.env.DOUBAO_MODEL_ID_PRO;

if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  const keyMatch = envConfig.match(/DOUBAO_API_KEY=(.*)/);
  if (keyMatch) {
    apiKey = keyMatch[1].trim();
  }
  const modelMatch = envConfig.match(/DOUBAO_MODEL_ID(?:_LITE|_PRO)?=(.*)/);
  if (modelMatch) {
    modelId = modelMatch[1].trim();
  }
}

const MODEL_ID = modelId || "ep-m-20260203223653-fscf5"; 

console.log("=== Doubao API Connection Test (with .env.local) ===");
console.log(`API Key loaded: ${apiKey ? "YES (Length: " + apiKey.length + ")" : "NO"}`);
console.log(`Model ID: ${MODEL_ID}`);

if (!apiKey) {
  console.error("ERROR: No DOUBAO_API_KEY found.");
  process.exit(1);
}

const openai = new OpenAI({
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
  apiKey: apiKey,
});

async function testConnection() {
  console.log("\nAttempting to send a simple request...");
  const startTime = Date.now();

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say 'Hello World' and nothing else." },
      ],
      model: MODEL_ID,
    });

    const duration = Date.now() - startTime;
    console.log(`\nSUCCESS! Request completed in ${duration}ms`);
    console.log("Response content:", completion.choices[0].message.content);
    console.log("Usage:", completion.usage);

  } catch (error) {
    console.error("\nFAILED! Request failed.");
    console.error("Error details:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
  }
}

testConnection();
