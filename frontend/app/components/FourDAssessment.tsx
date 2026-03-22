"use client";

import { useState, useRef, useEffect } from "react";
import { X, ArrowRight, Loader2, User, RefreshCw, Send, CheckCircle2, AlertTriangle, Play, HelpCircle, Briefcase, ImageIcon, FileText, ChevronRight, Hash, Copy, Target, Activity, Zap, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/auth-context";
import { usePreferences } from "@/context/preferences-context";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import html2canvas from 'html2canvas';
import { FourDRadarChart } from "./FourDRadarChart";
import { useMagicWord } from '@/hooks/useMagicWord';
import { extract4DReportSections, format4DQuestionsForReview } from "@/lib/mbti-utils";
import { AssessmentModalTemplate, ReportCardTemplate, AssessmentProfileForm, SharedReportMarkdownComponents, ReportStreamingStatus, useStreamingReportText, prepareReportCardExport, REPORT_VIEW_DEFAULTS, ReportCardFrame } from "./shared/AssessmentTemplates";

interface FourDAssessmentProps {
  onClose: () => void;
}

type Step = "profile" | "generating" | "questions" | "analyzing" | "report";

interface QuestionOption {
  label: string; // A, B, C, D
  text: string;
  color: string; // green, yellow, blue, orange
}

interface Question {
  id: number;
  title: string;
  scenario: string;
  options: QuestionOption[];
}

export function FourDAssessment({ onClose }: FourDAssessmentProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("profile");
  
  // Profile State
  const [name, setName] = useState(user?.name || "");
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("");
  const [gender, setGender] = useState("");
  const [background, setBackground] = useState(""); // Sync with MBTI's background field (industry/background)
  
  // Questions State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({}); // questionId -> optionLabel (A/B/C/D)
  const [generationProgress, setGenerationProgress] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Report State
  const [report, setReport] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [reportStreamKey, setReportStreamKey] = useState(0);
  
  // Report View Options
  const [showRoleInImage, setShowRoleInImage] = useState(REPORT_VIEW_DEFAULTS.showRoleInImage); // Controls Level
  const [showRoleTag, setShowRoleTag] = useState(REPORT_VIEW_DEFAULTS.showRoleTag); // Controls Role/Post
  const [infoFontSize, setInfoFontSize] = useState(REPORT_VIEW_DEFAULTS.infoFontSize);
  const [reportScale, setReportScale] = useState(REPORT_VIEW_DEFAULTS.reportScale);
  const { modelProvider } = usePreferences();
  
  // Magic Word & Stats
  const isReviewUnlocked = useMagicWord("showreview");
  const [genStats, setGenStats] = useState<{ duration: number; usage?: any } | null>(null);
  const [anaStats, setAnaStats] = useState<{ duration: number; usage?: any } | null>(null);
  const thinkingSteps = [
    "正在解构你的领导力坐标...",
    "正在匹配高管领导力谱系模型...",
    "正在校验团队生态位适配度...",
    "正在提取你的优势与盲点...",
    "正在定位你在组织中的能量分布...",
    "正在计算四色领导风格的重心值...",
    "正在生成团队协作的风险提示...",
    "分析完成，正在生成4D专属报告..."
  ];
  const reportStreamingText = useStreamingReportText({
    sourceText: report,
    initialText: "正在解析你的领导力坐标与团队生态位...",
    intervalMs: 7800,
    initialDelayMs: 7800,
    resetKey: reportStreamKey,
    fallbackSegments: thinkingSteps,
    fallbackUntilLength: 240
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll for streaming content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [generationProgress, report]);

  // Generate Questions
  const handleStart = async () => {
    if (!role.trim() || !background.trim() || !level || !gender || !name) return;
    
    setStep("generating");
    setGenerationProgress("");
    setIsStreaming(true);
    const startTime = Date.now();
    
    try {
      const response = await fetch("/api/assessment/4d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_questions",
          payload: { 
            userProfile: {
              role, 
              industry: background,
              level,
              gender
            },
            modelProvider: modelProvider
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedJson = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Check for JSON block in the stream (simple heuristic)
        // In a real stream, we might get partial JSON, so we just accumulate text for the user to see
        // but we look for the final JSON block to parse questions.
        
        // For the UI, we just show the raw text as "thinking" process
        setGenerationProgress(prev => prev + chunk);
      }

      // After stream ends, try to extract the JSON block from the full text
      // The prompt asks to output JSON at the end. 
      // We need to parse the buffer to find the JSON array.
      // Heuristic: Find the first '[' and last ']'
      const start = buffer.indexOf("[");
      const end = buffer.lastIndexOf("]");
      
      if (start !== -1 && end !== -1) {
        const jsonStr = buffer.substring(start, end + 1);
        try {
          const parsedQuestions = JSON.parse(jsonStr);
          if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
            // Shuffle options for each question
            const shuffledQuestions = parsedQuestions.map((q: Question) => {
               const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
               // Re-assign labels A, B, C, D to match new order
               const reLabeledOptions = shuffledOptions.map((opt, idx) => ({
                 ...opt,
                 label: String.fromCharCode(65 + idx) // A, B, C, D...
               }));
               return { ...q, options: reLabeledOptions };
            });

            setQuestions(shuffledQuestions);
            setTimeout(() => setStep("questions"), 1000); // Small delay to show completion
          } else {
            throw new Error("Invalid question format");
          }
        } catch (e) {
          console.error("Failed to parse questions JSON", e);
          alert("题目解析失败，请重试。");
          setStep("profile");
        }
      } else {
        // Fallback: If no JSON found, maybe the model output raw text? 
        // Or maybe wait for more chunks? (Though this is after stream end)
        console.error("No JSON found in response buffer:", buffer);
        alert("生成内容格式错误，请重试。");
        setStep("profile");
      }

      // Record Stats
      const duration = Date.now() - startTime;
      const inputTokens = 1000; // Rough estimate
      const outputTokens = Math.round(buffer.length / 3);
      setGenStats({ duration, usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens } });

    } catch (error) {
      console.error("Generation error:", error);
      alert(`启动失败: ${error instanceof Error ? error.message : "未知错误"}`);
      setStep("profile");
    } finally {
      setIsStreaming(false);
    }
  };

  // Handle Answer Selection
  const handleAnswer = (optionLabel: string) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    setAnswers(prev => ({
      ...prev,
      [questions[currentQuestionIndex].id]: optionLabel
    }));

    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
        setIsTransitioning(false);
      }, 300);
    } else {
      // Finished
      submitAnswers({
        ...answers,
        [questions[currentQuestionIndex].id]: optionLabel
      });
      // No need to set isTransitioning false as we change step
    }
  };

  // Submit Answers and Generate Report
  const submitAnswers = async (finalAnswers: Record<number, string>) => {
    setStep("analyzing");
    setReport("");
    setIsStreaming(true);
    setReportStreamKey(prev => prev + 1);
    const startTime = Date.now();

    // Map answers (Label) to Colors for the backend
    const answerColorMap: Record<number, string> = {};
    questions.forEach(q => {
      const selectedLabel = finalAnswers[q.id];
      const selectedOption = q.options.find(o => o.label === selectedLabel);
      if (selectedOption) {
        answerColorMap[q.id] = selectedOption.color;
      }
    });

    try {
      const response = await fetch("/api/assessment/4d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_report",
          payload: { 
            userProfile: {
              role, 
              industry: background,
              level,
              gender
            },
            questions,
            answers: answerColorMap,
            modelProvider: modelProvider
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullReportContent = "";
      let receivedFirstByte = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        if (!receivedFirstByte) {
          receivedFirstByte = true;
          setStep("report");
        }

        const chunk = decoder.decode(value, { stream: true });
        fullReportContent += chunk;
        setReport(prev => prev + chunk);
      }

      // Record Stats
      const duration = Date.now() - startTime;
      const inputTokens = 1500; // Rough estimate
      const outputTokens = Math.round(fullReportContent.length / 2);
      setAnaStats({ duration, usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens } });

      // Save History
      try {
        const historyRes = await fetch('/api/assessment/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: '4D-Leadership',
                title: `4D Leadership: ${role} (${background})`,
                result: fullReportContent,
                metadata: JSON.stringify({ 
                    userProfile: { nickname: name, role, level, gender, background, industry: background },
                    questions: questions,
                    answers: answerColorMap
                })
            })
        });
        
        if (historyRes.ok) {
           console.log("History saved successfully");
        } else {
           console.error("History save failed with status:", historyRes.status);
        }
      } catch (err) {
         console.error("Failed to save history", err);
      }

    } catch (error) {
      console.error("Report generation error:", error);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSaveImage = async () => {
    console.log("[SaveImage] Starting save process...");
    const element = document.getElementById('report-card');
    if (!element) {
        console.error("[SaveImage] Element #report-card not found!");
        return;
    }

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      const exportContext = prepareReportCardExport(element, 1);
      await exportContext.ready;
      let canvas;
      try {
        canvas = await html2canvas(exportContext.node, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#FDFBF7',
          logging: false,
          width: exportContext.node.scrollWidth,
          height: exportContext.node.scrollHeight,
          scrollX: 0,
          scrollY: 0,
        });
      } finally {
        exportContext.cleanup();
      }
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      
      const now = new Date();
      const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0');
        
      link.download = `4D-Leadership-${name}(${timestamp}).png`;
      link.click();
    } catch (err) {
      console.error("[SaveImage] Error:", err);
      alert("保存图片失败: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const calculateScores = () => {
    const scores = { Green: 0, Yellow: 0, Blue: 0, Orange: 0 };
    questions.forEach(q => {
      const selectedLabel = answers[q.id];
      const selectedOption = q.options.find(o => o.label === selectedLabel);
      if (selectedOption) {
        // Capitalize color if needed, but assuming backend returns "Green", "Blue", etc.
        // Backend prompt says: "color": "Green"
        const color = selectedOption.color; 
        if (scores[color as keyof typeof scores] !== undefined) {
          scores[color as keyof typeof scores]++;
        }
      }
    });
    return scores;
  };

  const copyToClipboard = () => {
    const text = format4DQuestionsForReview(questions, answers, calculateScores(), {
      genDuration: genStats?.duration,
      genInput: genStats?.usage?.prompt_tokens,
      genOutput: genStats?.usage?.completion_tokens,
      anaDuration: anaStats?.duration,
      anaInput: anaStats?.usage?.prompt_tokens,
      anaOutput: anaStats?.usage?.completion_tokens
    });
    navigator.clipboard.writeText(text).then(() => {
      alert("评测数据已复制到剪贴板！");
    }).catch(err => {
      console.error('Failed to copy: ', err);
      alert("复制失败，请手动复制");
    });
  };

  const { nicheTitle, nicheBody, remainingBody } = extract4DReportSections(report);

  return (
    <AssessmentModalTemplate
      title="4D 领导力雷达"
      icon={<RefreshCw className="w-5 h-5 text-white" />}
      iconBgClass="bg-indigo-600"
      headerColorClass="text-indigo-600"
      onClose={onClose}
      maxWidthClass="max-w-3xl"
    >
          <AnimatePresence mode="wait">
            
            {/* Step 1: Profile Input */}
            {step === "profile" && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full w-full"
              >
                <AssessmentProfileForm
                  title="初始化你的决策坐标原点"
                  description="系统即将构建 8 个高压团队冲突场景。请输入真实的职位背景，以便 AI 为你生成“颗粒度对齐”的实战模拟。"
                  profile={{ nickname: name, role, level, gender, background }}
                  setProfile={(key, value) => {
                    if (key === 'nickname') setName(value);
                    if (key === 'role') setRole(value);
                    if (key === 'level') setLevel(value);
                    if (key === 'gender') setGender(value);
                    if (key === 'background') setBackground(value);
                  }}
                  onStart={handleStart}
                  themeColor="indigo"
                />
              </motion.div>
            )}

            {/* Step 2: Generating Questions */}
            {step === "generating" && (
              <motion.div 
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center p-6"
              >
                <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8">
                  <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-4 relative">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30 border-t-indigo-600 animate-spin" style={{ animationDuration: '3s' }}></div>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">正在构建 4D 坐标系模拟场景</h3>
                    <p className="text-sm text-zinc-500 mt-2">基于您的职位与行业定制高压决策题...</p>
                  </div>

                  <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => {
                      // Simple heuristic: count occurrences of "id": in the raw JSON stream
                      const currentCount = (generationProgress.match(/"id":/g) || []).length;
                      const isCompleted = currentCount > i + 1;
                      const isCurrent = currentCount === i + 1;
                      
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                            isCompleted 
                              ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" 
                              : isCurrent
                                ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 animate-pulse"
                                : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                          }`}>
                            {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                          </div>
                          <div className="flex-1">
                            <div className={`h-2 rounded-full transition-all duration-500 ${
                              isCompleted 
                                ? "bg-green-500 w-full" 
                                : isCurrent
                                  ? "bg-indigo-500 w-2/3 animate-pulse"
                                  : "bg-zinc-100 dark:bg-zinc-800 w-full"
                            }`} />
                          </div>
                          <span className={`text-xs font-medium transition-colors ${
                            isCompleted 
                              ? "text-green-600 dark:text-green-400"
                              : isCurrent
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-zinc-300 dark:text-zinc-700"
                          }`}>
                            {isCompleted ? "已完成" : isCurrent ? "生成中..." : "等待中"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Questions */}
            {step === "questions" && questions.length > 0 && questions[currentQuestionIndex] && (
              <motion.div 
                key="questions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full w-full flex flex-col max-w-3xl mx-auto p-6 md:p-12 overflow-y-auto"
              >
                {/* Progress Bar */}
                <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full mb-8">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <div className="mb-2 text-sm font-medium text-indigo-600 uppercase tracking-wider">
                    场景 {currentQuestionIndex + 1} / {questions.length}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                    {questions[currentQuestionIndex].title}
                  </h3>
                  
                  <p className="text-lg text-zinc-600 dark:text-zinc-300 mb-8 leading-relaxed">
                    {questions[currentQuestionIndex].scenario}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {questions[currentQuestionIndex].options.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => handleAnswer(option.label)}
                        className="text-left p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 flex items-center justify-center text-sm font-medium transition-colors">
                            {option.label}
                          </span>
                          <span className="text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                            {option.text}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Analyzing (Generating Report) */}
            {step === "analyzing" && (
              <motion.div 
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center p-6"
              >
                <div className="w-full max-w-md text-center space-y-8">
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
                    <div className="relative bg-white dark:bg-zinc-900 rounded-full p-4 border-2 border-indigo-100 dark:border-indigo-900 shadow-xl">
                       <RefreshCw className="w-full h-full text-indigo-600 animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">正在绘制决策坐标...</h3>
                    <p className="text-zinc-500">高管内参正在解剖你的决策逻辑，请等待约 1-2 分钟</p>
                  </div>

                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 animate-progress-indeterminate origin-left" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-zinc-400">
                     <div className="flex items-center gap-2 justify-center">
                       <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                       <span>Cultivating</span>
                     </div>
                     <div className="flex items-center gap-2 justify-center">
                       <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse delay-75" />
                       <span>Including</span>
                     </div>
                     <div className="flex items-center gap-2 justify-center">
                       <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-150" />
                       <span>Visioning</span>
                     </div>
                     <div className="flex items-center gap-2 justify-center">
                       <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse delay-300" />
                       <span>Directing</span>
                     </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Report */}
            {step === "report" && (
              <motion.div 
                key="report"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col bg-[#F5F5F5]"
              >
                 <ReportStreamingStatus active={isStreaming} text={reportStreamingText} />
                 {/* Toolbar */}
                 <div className="bg-[#FDFBF7] px-4 py-2 md:px-8 md:py-3 border-b border-[#E5E0D5] flex flex-col gap-2 shadow-sm z-10 md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-4">
                   <div className="flex w-full items-start justify-end gap-3 md:w-auto md:items-center md:gap-4">
                     <div className="flex flex-col items-start gap-1 group md:flex-row md:items-center md:gap-2">
                          <span className="text-[10px] md:text-sm text-gray-600 group-hover:text-[#151E32] transition-colors">信息字号</span>
                          <input 
                              type="range" 
                              min="12" 
                              max="24" 
                              step="1"
                              value={infoFontSize}
                              onChange={(e) => setInfoFontSize(parseInt(e.target.value))}
                              className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#151E32]"
                          />
                     </div>

                     <div className="hidden h-4 w-px bg-gray-300 md:block"></div>

                     <div className="flex flex-col items-start gap-1 group md:flex-row md:items-center md:gap-2">
                          <span className="text-[10px] md:text-sm text-gray-600 group-hover:text-[#151E32] transition-colors">卡片缩放</span>
                          <input 
                              type="range" 
                              min={REPORT_VIEW_DEFAULTS.reportScaleMin}
                              max={REPORT_VIEW_DEFAULTS.reportScaleMax}
                              step={REPORT_VIEW_DEFAULTS.reportScaleStep}
                              value={reportScale}
                              onChange={(e) => setReportScale(parseFloat(e.target.value))}
                              className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#151E32]"
                          />
                     </div>
                   </div>

                   <div className="flex w-full items-center justify-end gap-3 md:w-auto md:gap-4">
                     <label className="flex items-center gap-2 cursor-pointer select-none group">
                         <input 
                             type="checkbox" 
                             checked={showRoleTag} 
                             onChange={(e) => setShowRoleTag(e.target.checked)}
                             className="w-4 h-4 text-[#151E32] rounded focus:ring-[#151E32] border-gray-400" 
                         />
                         <span className="text-xs md:text-sm text-gray-600 group-hover:text-[#151E32] transition-colors">岗位标签</span>
                     </label>

                     <label className="flex items-center gap-2 cursor-pointer select-none group">
                         <input 
                             type="checkbox" 
                             checked={showRoleInImage} 
                             onChange={(e) => setShowRoleInImage(e.target.checked)}
                             className="w-4 h-4 text-[#151E32] rounded focus:ring-[#151E32] border-gray-400" 
                         />
                         <span className="text-xs md:text-sm text-gray-600 group-hover:text-[#151E32] transition-colors">级别标签</span>
                     </label>

                     <button 
                       onClick={handleSaveImage}
                       className="flex items-center gap-2 text-xs md:text-sm text-[#151E32] hover:text-black transition-colors font-bold bg-[#C5A059]/20 hover:bg-[#C5A059]/30 px-3 py-1 md:px-4 md:py-1.5 rounded-lg border border-[#C5A059]/30"
                     >
                       <ImageIcon className="w-4 h-4" />
                       <span>保存海报</span>
                     </button>
                     
                     <button 
                       onClick={onClose}
                       className="hidden md:inline-flex p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                     >
                       <X className="w-5 h-5" />
                     </button>
                   </div>
                 </div>

                {/* Report Content */}
                <div className="flex-1 overflow-y-auto p-8">
                  <ReportCardFrame reportScale={reportScale}>
                    <ReportCardTemplate
                      id="report-card"
                      toolName="4D 高管坐标"
                      toolIcon={<Briefcase className="w-4 h-4" />}
                      userProfile={{
                        name: name,
                        role: role,
                        industry: background,
                        level: "Executive"
                      }}
                      showRoleTag={showRoleTag}
                      showRoleInImage={showRoleInImage}
                      infoFontSize={infoFontSize}
                      onNameChange={setName}
                    >
                    {/* Giant Watermark */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] z-0 select-none">
                       <div className="text-[120px] font-black text-[#151E32] rotate-[-30deg] whitespace-nowrap tracking-tighter">
                           EXECUTIVE INSIDER
                       </div>
                    </div>

                    {/* Radar Chart & Title Section */}
                    <div className="relative z-10 px-8 pt-8">
                       <div className="flex flex-row items-stretch gap-8 mb-2">
                           {/* Left: Radar Chart (2/3) */}
                           <div className="w-2/3 flex justify-end items-center">
                               <div className="transform mr-16 origin-center" style={{ transform: 'scale(1.18)' }}>
                                   <FourDRadarChart scores={calculateScores()} />
                               </div>
                           </div>

                           {/* Right: Title / Conclusion (1/3) */}
                           <div className="w-1/3 flex flex-col justify-center text-left">
                               {nicheTitle && (
                                   <div className="bg-white/50 p-6 rounded-2xl border border-zinc-100 shadow-sm backdrop-blur-sm h-full flex flex-col justify-center">
                                       <div className="flex items-center gap-3 mb-4">
                                           <div className="w-8 h-8 rounded-full bg-[#151E32] flex items-center justify-center text-[#C5A059] shadow-lg shadow-[#151E32]/20">
                                               <Target className="w-4 h-4" />
                                           </div>
                                           <span className="text-xs font-bold text-[#C5A059] tracking-widest uppercase">评估结果</span>
                                       </div>
                                       
                                       {/* Dynamic Title Rendering: Color (Big) + Role (Next Line) */}
                                       <div className="mb-4">
                                            {(() => {
                                                const cleanTitle = nicheTitle.replace(/你的团队生态位：/g, "");
                                                const parts = cleanTitle.split(/·| /).filter(s => s.trim());
                                                // Assuming format like "Green · Role Name"
                                                // If split works, parts[0] is color, parts[1]... is rest
                                                if (parts.length >= 2) {
                                                    const colorName = parts[0];
                                                    const roleName = cleanTitle.substring(cleanTitle.indexOf(colorName) + colorName.length).replace(/^[·\s]+/, "");
                                                    return (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="text-3xl font-black text-[#151E32] tracking-tight">{colorName}</div>
                                                            <div className="text-xl font-bold text-[#151E32] leading-tight">{roleName}</div>
                                                        </div>
                                                    );
                                                }
                                                // Fallback
                                                return <h3 className="text-xl font-black text-[#151E32] leading-tight tracking-wide">{cleanTitle}</h3>;
                                            })()}
                                       </div>

                                       {/* Render Niche Description here */}
                                       <div className="mt-2">
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm]}
                                                components={SharedReportMarkdownComponents}
                                            >
                                                {nicheBody}
                                            </ReactMarkdown>
                                       </div>
                                   </div>
                               )}
                           </div>
                       </div>
                    </div>

                    {/* Report Content */}
                    <div className="relative z-10 px-8 pb-12">
                      <div>
                        <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={SharedReportMarkdownComponents}
                    >
                        {remainingBody}
                    </ReactMarkdown>
                      </div>

                      {/* Review Section (Hidden by default, unlocked by Magic Word) */}
                      {isReviewUnlocked && (
                        <div className="mt-8 pt-8 border-t border-[#E5E0D5]">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-[#151E32]">Debug / Review Mode</h3>
                            <button 
                              onClick={copyToClipboard}
                              className="flex items-center gap-2 px-3 py-1.5 bg-[#F5F1E8] hover:bg-[#E5E0D5] rounded text-xs font-medium transition-colors text-[#151E32]"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Copy Data
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                             <div className="bg-[#F5F1E8] p-3 rounded-lg border border-[#E5E0D5]">
                                <div className="text-xs text-gray-500">Gen Time</div>
                                <div className="font-mono font-bold text-[#C5A059]">{(genStats?.duration || 0) / 1000}s</div>
                             </div>
                             <div className="bg-[#F5F1E8] p-3 rounded-lg border border-[#E5E0D5]">
                                <div className="text-xs text-gray-500">Gen Tokens</div>
                                <div className="font-mono font-bold text-[#C5A059]">
                                    {genStats?.usage?.prompt_tokens || 0} / {genStats?.usage?.completion_tokens || 0}
                                </div>
                             </div>
                             <div className="bg-[#F5F1E8] p-3 rounded-lg border border-[#E5E0D5]">
                                <div className="text-xs text-gray-500">Ana Time</div>
                                <div className="font-mono font-bold text-[#C5A059]">{(anaStats?.duration || 0) / 1000}s</div>
                             </div>
                             <div className="bg-[#F5F1E8] p-3 rounded-lg border border-[#E5E0D5]">
                                <div className="text-xs text-gray-500">Ana Tokens</div>
                                <div className="font-mono font-bold text-[#C5A059]">
                                    {anaStats?.usage?.prompt_tokens || 0} / {anaStats?.usage?.completion_tokens || 0}
                                </div>
                             </div>
                          </div>

                          <div className="bg-[#151E32] text-gray-300 p-4 rounded-lg font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-96">
                            {format4DQuestionsForReview(questions, answers, calculateScores(), {
                              genDuration: genStats?.duration,
                              genInput: genStats?.usage?.prompt_tokens,
                              genOutput: genStats?.usage?.completion_tokens,
                              anaDuration: anaStats?.duration,
                              anaInput: anaStats?.usage?.prompt_tokens,
                              anaOutput: anaStats?.usage?.completion_tokens
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    </ReportCardTemplate>
                  </ReportCardFrame>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
    </AssessmentModalTemplate>
  );
}
