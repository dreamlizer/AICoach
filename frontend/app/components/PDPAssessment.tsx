"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import html2canvas from "html2canvas";
import { CheckCircle2, Loader2, Tag, Image as ImageIcon, X, FileText, Copy } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { usePreferences } from "@/context/preferences-context";
import { PDP_TAGS } from "@/lib/pdp_prompts";
import { parsePDPQuestionsFromStream, formatPDPQuestionsForReview } from "@/lib/mbti-utils";
import pdpTiger from "@/lib/Pic/PDP-Tiger.png";
import pdpPeacock from "@/lib/Pic/PDP-Peacock.png";
import pdpOwl from "@/lib/Pic/PDP-OWL.png";
import pdpKoala from "@/lib/Pic/PDP-Loala.png";
import pdpChameleon from "@/lib/Pic/PDP-Chameleon.png";
import { useMagicWord } from "@/hooks/useMagicWord";
import {
  AssessmentModalTemplate,
  AssessmentProfileForm,
  ReportCardFrame,
  ReportCardTemplate,
  SharedReportMarkdownComponents,
  ReportStreamingStatus,
  useStreamingReportText,
  prepareReportCardExport,
  REPORT_VIEW_DEFAULTS
} from "./shared/AssessmentTemplates";

type UserProfile = {
  nickname: string;
  role: string;
  level: string;
  gender: string;
  background: string;
};

type Step = "profile" | "tags" | "generating" | "questions" | "analyzing" | "report";

type AnimalType = "Tiger" | "Peacock" | "Koala" | "Owl" | "Chameleon";

type QuestionOption = {
  label: string;
  text: string;
  value: string;
};

type Question = {
  id: number;
  title: string;
  scenario: string;
  options: QuestionOption[];
};

interface PDPAssessmentProps {
  onClose: () => void;
}

export function PDPAssessment({ onClose }: PDPAssessmentProps) {
  const { user } = useAuth();
  const { modelProvider } = usePreferences();
  const [step, setStep] = useState<Step>("profile");
  const [profile, setProfile] = useState<UserProfile>({
    nickname: user?.name || "",
    role: "",
    level: "",
    gender: "",
    background: ""
  });
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [genProgress, setGenProgress] = useState(0);
  const [report, setReport] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [reportStreamKey, setReportStreamKey] = useState(0);
  const [showRoleTag, setShowRoleTag] = useState(REPORT_VIEW_DEFAULTS.showRoleTag);
  const [showRoleInImage, setShowRoleInImage] = useState(REPORT_VIEW_DEFAULTS.showRoleInImage);
  const [infoFontSize, setInfoFontSize] = useState(REPORT_VIEW_DEFAULTS.infoFontSize);
  const [reportScale, setReportScale] = useState(REPORT_VIEW_DEFAULTS.reportScale);
  const [dominantAnimal, setDominantAnimal] = useState<AnimalType>("Tiger");
  const [showQuestionReview, setShowQuestionReview] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const isReviewUnlocked = useMagicWord("showreview");
  const [thinkingIndex, setThinkingIndex] = useState(0);

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      const target = PDP_TAGS.find((tag) => tag.id === id);
      if (!target) return prev;
      const pickedTags = PDP_TAGS.filter((tag) => prev.includes(tag.id));
      const positiveCount = pickedTags.filter((tag) => tag.type === "positive").length;
      const negativeCount = pickedTags.filter((tag) => tag.type === "negative").length;
      if (target.type === "positive" && positiveCount >= 2) return prev;
      if (target.type === "negative" && negativeCount >= 2) return prev;
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const selectedTags = PDP_TAGS.filter((tag) => selectedTagIds.includes(tag.id));
  const selectedPositiveCount = selectedTags.filter((tag) => tag.type === "positive").length;
  const selectedNegativeCount = selectedTags.filter((tag) => tag.type === "negative").length;
  const canProceed = selectedPositiveCount === 2 && selectedNegativeCount === 2;
  const negativeTags = PDP_TAGS.filter((tag) => tag.type === "negative");
  const positiveTags = PDP_TAGS.filter((tag) => tag.type === "positive");
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = 15;
  const pdpThinkingSteps = [
    "正在解构你的行为倾向...",
    "正在核对五种动物权重分布...",
    "正在检测角色我与真实我的差异...",
    "正在测算能量电池消耗曲线...",
    "正在识别高频触发的职场面具...",
    "正在匹配组织生态位与适配度...",
    "正在生成个人优势与风险地图...",
    "正在定位团队互动的关键张力点...",
    "正在校准你的行为稳定度与波动点...",
    "正在生成最终报告，请稍后"
  ];

  const reportStreamingText = useStreamingReportText({
    sourceText: report,
    initialText: "正在解析你的行为画像与角色差异...",
    intervalMs: 7800,
    initialDelayMs: 7800,
    resetKey: reportStreamKey,
    fallbackSegments: pdpThinkingSteps,
    fallbackUntilLength: 240
  });

  const animalLabelMap: Record<AnimalType, string> = {
    Tiger: "老虎",
    Peacock: "孔雀",
    Koala: "考拉",
    Owl: "猫头鹰",
    Chameleon: "变色龙"
  };

  const animalImageMap: Record<AnimalType, typeof pdpTiger> = {
    Tiger: pdpTiger,
    Peacock: pdpPeacock,
    Koala: pdpKoala,
    Owl: pdpOwl,
    Chameleon: pdpChameleon
  };

  useEffect(() => {
    if (step !== "analyzing") return;
    setThinkingIndex(0);
    const timer = setInterval(() => {
      setThinkingIndex((prev) =>
        prev < pdpThinkingSteps.length - 1 ? prev + 1 : prev
      );
    }, 8000);
    return () => clearInterval(timer);
  }, [step, pdpThinkingSteps.length]);

  const buildPdpAnswerStats = (finalAnswers: Record<number, string>) => {
    const totals = { Tiger: 0, Peacock: 0, Koala: 0, Owl: 0, Chameleon: 0 };
    const roleTotals = { Tiger: 0, Peacock: 0, Koala: 0, Owl: 0, Chameleon: 0 };
    const coreTotals = { Tiger: 0, Peacock: 0, Koala: 0, Owl: 0, Chameleon: 0 };
    const answerMap: Record<number, string> = {};
    const answerDetails: Array<{ id: number; label: string; value: string; text: string }> = [];

    questions.forEach((q, index) => {
      const selectedLabel = finalAnswers[q.id];
      if (!selectedLabel) return;
      let selectedOption = q.options.find((o) => o.label === selectedLabel) || null;
      if (!selectedOption && selectedLabel) {
        const normalized = String(selectedLabel).trim().toLowerCase();
        selectedOption =
          q.options.find(
            (o) =>
              String(o.label).toLowerCase() === normalized ||
              String(o.value).toLowerCase() === normalized ||
              String(o.text).toLowerCase() === normalized
          ) || null;
      }
      if (!selectedOption) return;
      const animal = selectedOption.value;
      answerMap[q.id] = animal;
      answerDetails.push({ id: q.id, label: selectedOption.label, value: animal, text: selectedOption.text });

      if (totals[animal as keyof typeof totals] !== undefined) {
        totals[animal as keyof typeof totals] += 1;
      }

      const questionNumber = Number.isFinite(q.id) ? q.id : index + 1;
      const bucket = questionNumber <= 10 ? roleTotals : coreTotals;
      if (bucket[animal as keyof typeof bucket] !== undefined) {
        bucket[animal as keyof typeof bucket] += 1;
      }
    });

    const orderedAnimals: AnimalType[] = ["Tiger", "Peacock", "Owl", "Koala", "Chameleon"];
    const pickDominant = (scores: Record<AnimalType, number>) => {
      let dominant: AnimalType = orderedAnimals[0];
      let maxScore = -1;
      orderedAnimals.forEach((animal) => {
        const score = scores[animal];
        if (score > maxScore) {
          maxScore = score;
          dominant = animal;
        }
      });
      return dominant;
    };

    const dominant = pickDominant(totals);
    const roleDominant = pickDominant(roleTotals);
    const coreDominant = pickDominant(coreTotals);

    return { totals, roleTotals, coreTotals, answerMap, answerDetails, dominant, roleDominant, coreDominant };
  };

  const submitAnswers = async (finalAnswers: Record<number, string>) => {
    setStep("analyzing");
    setReport("");
    setIsStreaming(true);
    setReportStreamKey((prev) => prev + 1);

    const { totals, roleTotals, coreTotals, answerMap, answerDetails, dominant, roleDominant, coreDominant } =
      buildPdpAnswerStats(finalAnswers);
    if (Object.keys(answerMap).length < totalQuestions) {
      alert("题目统计异常，请重新作答");
      setStep("questions");
      return;
    }
    setDominantAnimal(dominant);

    try {
      const response = await fetch("/api/assessment/pdp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_report",
          payload: {
            userProfile: profile,
            selectedTags: selectedTags.map((tag) => ({
              id: tag.id,
              label: tag.label,
              animal: tag.animal
            })),
            questions,
            answers: answerMap,
            stats: { totals, roleTotals, coreTotals },
            dominant,
            roleDominant,
            coreDominant,
            selectedAnswers: answerDetails,
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
      let receivedFirstByte = false;
      let fullReportContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (!receivedFirstByte) {
          receivedFirstByte = true;
          setStep("report");
        }

        const chunk = decoder.decode(value, { stream: true });
        fullReportContent += chunk;
        setReport((prev) => prev + chunk);
      }

      try {
        await fetch("/api/assessment/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "PDP",
            title: `PDP: ${profile.role || "未填写"} (${profile.background || "未填写"})`,
            result: fullReportContent,
            metadata: JSON.stringify({
              profile,
              modelProvider,
              questions,
              answers: answerMap,
              stats: { totals, roleTotals, coreTotals },
              dominant,
              roleDominant,
              coreDominant
            })
          })
        });
      } catch (err) {
        console.error("Failed to save history", err);
      }
    } catch (error) {
      console.error("Report generation error:", error);
      alert("报告生成失败，请稍后重试");
      setStep("questions");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSaveImage = async () => {
    const element = document.getElementById("report-card");
    if (!element) {
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
          backgroundColor: "#FDFBF7",
          logging: false,
          width: exportContext.node.scrollWidth,
          height: exportContext.node.scrollHeight,
          windowWidth: exportContext.node.scrollWidth,
          windowHeight: exportContext.node.scrollHeight,
          scrollX: 0,
          scrollY: 0
        });
      } finally {
        exportContext.cleanup();
      }

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;

      const now = new Date();
      const timestamp =
        now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, "0") +
        now.getDate().toString().padStart(2, "0") +
        now.getHours().toString().padStart(2, "0") +
        now.getMinutes().toString().padStart(2, "0");

      link.download = `PDP-${profile.nickname || "report"}(${timestamp}).png`;
      link.click();
    } catch (err) {
      console.error("[SaveImage] Error:", err);
      alert("保存图片失败");
    }
  };

  const handleReviewQuestions = () => {
    const stats = buildPdpAnswerStats(answers);
    const text = formatPDPQuestionsForReview(questions, stats.answerMap, stats.totals);
    setReviewText(text);
    setShowQuestionReview(true);
  };

  const copyReviewText = async () => {
    try {
      await navigator.clipboard.writeText(reviewText || "");
      alert("已复制审阅内容");
    } catch (err) {
      console.error("复制失败", err);
    }
  };

  const handleGenerateQuestions = async () => {
    setStep("generating");
    setGenProgress(0);
    try {
      const response = await fetch("/api/assessment/pdp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_questions",
          payload: {
            userProfile: profile,
            selectedTags: selectedTags.map((tag) => ({
              id: tag.id,
              label: tag.label,
              animal: tag.animal
            })),
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
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        const matches = fullText.match(/Q\s*\d+\s*[:：]/gi);
        const count = matches ? matches.length : 0;
        setGenProgress(Math.min(count, totalQuestions));
      }

      const parsedQuestions = parsePDPQuestionsFromStream(fullText);
      if (!parsedQuestions || parsedQuestions.length < totalQuestions) {
        throw new Error("题目生成不完整，请重试");
      }
      setQuestions(parsedQuestions.slice(0, totalQuestions));
      setCurrentQuestionIndex(0);
      setAnswers({});
      setStep("questions");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "网络错误，请检查连接");
      setStep("tags");
    }
  };

  const handleAnswer = (option: QuestionOption) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option.label }));
    if (currentQuestionIndex + 1 >= questions.length) {
      submitAnswers({ ...answers, [currentQuestion.id]: option.label });
      return;
    }
    setCurrentQuestionIndex((prev) => prev + 1);
  };

  const renderQuestion = () => {
    if (!currentQuestion || currentQuestion.options.length === 0 || !currentQuestion.scenario) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="text-sm text-red-600 font-medium">题目生成异常，请重新生成</div>
          <button
            onClick={() => {
              setQuestions([]);
              setCurrentQuestionIndex(0);
              setStep("tags");
            }}
            className="mt-4 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
          >
            返回重新生成
          </button>
        </div>
      );
    }

    const scenarioText = currentQuestion.scenario?.trim() || "";
    const titleText = currentQuestion.title?.trim() || "";
    const mergedText =
      titleText && scenarioText && !scenarioText.includes(titleText)
        ? `${titleText} ${scenarioText}`
        : scenarioText || titleText;

    return (
      <div className="h-full overflow-y-auto px-4 pb-6">
        <div className="max-w-2xl mx-auto mt-6">
        <div className="flex items-center justify-center mb-3">
          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
            第 2 步 / 共 2 步：完成答题
          </div>
        </div>
        <div className="flex items-center justify-between mb-6 px-2">
          <span className="text-xs font-bold text-amber-600 tracking-wider">
            QUESTION {currentQuestionIndex + 1} / {questions.length}
          </span>
          <div className="h-1.5 flex-1 mx-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-600 transition-all duration-500 ease-out"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6 border-t-4 border-amber-600">
          <h3 className="text-base md:text-lg font-serif text-gray-900 leading-relaxed text-center">
            {mergedText}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
          {currentQuestion.options.map((option) => (
            <button
              key={`${currentQuestion.id}-${option.label}`}
              onClick={() => handleAnswer(option)}
              className="group relative p-3 md:p-5 bg-white hover:bg-amber-50 border border-gray-100 hover:border-amber-500 rounded-lg transition-all duration-300 text-left hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 group-hover:bg-amber-600 text-gray-500 group-hover:text-white flex items-center justify-center font-bold mr-3 transition-colors text-sm">
                  {option.label}
                </div>
                <span className="text-sm md:text-base text-gray-700 group-hover:text-amber-900 font-medium leading-relaxed">
                  {option.text}
                </span>
              </div>
            </button>
          ))}
        </div>
        </div>
      </div>
    );
  };

  const renderReport = () => {
    const normalizedReport = report.replace(/(\*\*你的天敌\*\*：[^\n]*)\n([^\n])/g, "$1$2");
    return (
      <div className="h-full flex flex-col bg-[#F5F5F5]">
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

          {isReviewUnlocked && (
            <button
              onClick={handleReviewQuestions}
              className="flex items-center gap-2 text-xs md:text-sm text-gray-600 hover:text-[#151E32] transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>审阅题目</span>
            </button>
          )}

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

      <div className="flex-1 overflow-y-auto p-8">
        <ReportCardFrame reportScale={reportScale}>
          <ReportCardTemplate
            id="report-card"
            toolName="PDP 行为特质报告"
            toolIcon={<Tag className="w-4 h-4" />}
            userProfile={{
              name: profile.nickname,
              role: profile.role,
              industry: profile.background,
              level: profile.level
            }}
            showRoleTag={showRoleTag}
            showRoleInImage={showRoleInImage}
            infoFontSize={infoFontSize}
            onNameChange={(name) => setProfile({ ...profile, nickname: name })}
          >
            <div className="absolute top-6 right-8 z-20 pointer-events-none">
              <div className="w-28 h-28 rounded-2xl bg-white/95 border border-[#E5E0D5] shadow-sm flex items-center justify-center">
                <div
                  className="w-24 h-24 bg-center bg-no-repeat bg-contain"
                  style={{ backgroundImage: `url(${animalImageMap[dominantAnimal].src})` }}
                />
              </div>
            </div>
            <div className="p-10 flex-1 relative z-10">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={SharedReportMarkdownComponents}>
                {normalizedReport}
              </ReactMarkdown>
            </div>
          </ReportCardTemplate>
        </ReportCardFrame>
      </div>

      {showQuestionReview && (
        <div className="fixed inset-0 z-[130] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                题目数据审阅
              </h3>
              <button
                onClick={() => setShowQuestionReview(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <pre className="font-mono text-sm whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100 h-full">
                {reviewText}
              </pre>
            </div>

            <div className="p-5 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setShowQuestionReview(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                关闭
              </button>
              <button
                onClick={copyReviewText}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 shadow-sm"
              >
                <Copy className="w-4 h-4" />
                一键复制全部
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  };

  return (
    <AssessmentModalTemplate
      title="PDP 行为特质"
      icon={<Tag className="w-5 h-5 text-white" />}
      iconBgClass="bg-amber-600"
      headerColorClass="text-amber-600"
      onClose={onClose}
      maxWidthClass="max-w-3xl"
    >
      {step === "profile" && (
        <div className="w-full">
          <div className="max-w-md mx-auto mt-4 mb-2 flex items-center justify-center">
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
              测试流程共 2 步：选择 4 个关键词 → 完成 15 道题
            </div>
          </div>
          <AssessmentProfileForm
            title="初始化你的行为画像"
            description="填写你的基本信息，用于生成更贴近你的场景题。"
            profile={profile}
            setProfile={(key, value) => setProfile((prev) => ({ ...prev, [key]: value }))}
            onStart={() => {
              setStep("tags");
            }}
            themeColor="blue"
          />
        </div>
      )}

      {step === "tags" && (
        <div className="h-full w-full flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl">
            <div className="text-center mb-4 sm:mb-5">
              <div className="flex flex-col items-center justify-center gap-1 sm:flex-row sm:gap-2 mb-2">
                <div className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                  第 1 步 / 共 2 步：选择关键词
                </div>
                <div className="text-xs text-zinc-500">选完 4 个后进入第 2 步答题</div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-zinc-900">请选择 4 个最符合你的关键词</h3>
              <p className="text-zinc-500 text-xs sm:text-sm mt-1">
                已选 正面 {selectedPositiveCount} / 2 · 负面 {selectedNegativeCount} / 2
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs font-semibold text-rose-600 mb-2">消极标签（必选 2 个）</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {negativeTags.map((tag) => {
                    const active = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`relative p-1.5 sm:p-2 rounded-xl border text-center transition-all ${
                          active
                            ? "border-amber-500 bg-amber-50 text-amber-800 shadow-sm"
                            : "border-zinc-200 hover:border-amber-300 hover:bg-amber-50/40 text-zinc-700"
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-medium leading-snug">{tag.label}</span>
                        {active && <CheckCircle2 className="w-4 h-4 text-amber-600 absolute top-1.5 right-1.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-emerald-600 mb-2">积极标签（必选 2 个）</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {positiveTags.map((tag) => {
                    const active = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`relative p-1.5 sm:p-2 rounded-xl border text-center transition-all ${
                          active
                            ? "border-amber-500 bg-amber-50 text-amber-800 shadow-sm"
                            : "border-zinc-200 hover:border-amber-300 hover:bg-amber-50/40 text-zinc-700"
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-medium leading-snug">{tag.label}</span>
                        {active && <CheckCircle2 className="w-4 h-4 text-amber-600 absolute top-1.5 right-1.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {selectedTags.length > 0 && (
              <div className="mt-5 bg-white border border-amber-100 rounded-xl p-4">
                <div className="text-xs font-semibold text-amber-700 mb-2">已选关键词</div>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <div key={tag.id} className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                      {tag.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="sticky bottom-0 pt-4 pb-2 bg-white/95 backdrop-blur">
              <button
                onClick={handleGenerateQuestions}
                disabled={!canProceed}
                className={`w-full py-2.5 rounded-xl font-semibold text-[0.875rem] text-white transition-all duration-300 ${
                  !canProceed
                    ? "bg-zinc-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-600 to-orange-600 hover:shadow-amber-500/30"
                }`}
              >
                继续进入题目生成
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "generating" && (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping opacity-20"></div>
            <Loader2 className="h-16 w-16 text-amber-600 animate-spin relative z-10" />
          </div>
          <h3 className="mt-8 text-xl font-medium text-gray-800 text-center whitespace-pre-wrap leading-relaxed">
            正在生成 PDP 场景题...
          </h3>
          <div className="w-64 h-2 bg-gray-100 rounded-full mt-6 overflow-hidden">
            <div
              className="h-full bg-amber-600 transition-all duration-300 ease-out"
              style={{ width: `${(genProgress / totalQuestions) * 100}%` }}
            ></div>
          </div>
          <p className="mt-3 text-amber-700 font-medium text-sm">
            已生成 {genProgress} / {totalQuestions} 道情境题
          </p>
        </div>
      )}

      {step === "questions" && renderQuestion()}

      {step === "analyzing" && (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">{pdpThinkingSteps[thinkingIndex]}</h3>
          <p className="text-sm text-gray-500 mt-2">正在生成 PDP 报告 （2分钟左右）</p>
        </div>
      )}

      {step === "report" && renderReport()}
    </AssessmentModalTemplate>
  );
}
