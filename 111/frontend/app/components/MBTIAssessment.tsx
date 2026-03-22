
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, Briefcase, FileText, Copy, X, Image as ImageIcon, Activity } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useMagicWord } from '@/hooks/useMagicWord';
import { useAuth } from '@/context/auth-context';
import { usePreferences } from '@/context/preferences-context';
import { formatQuestionsForReview, processReportContent, parseMBTIQuestionsFromStream } from '@/lib/mbti-utils';

type UserProfile = {
  nickname: string;
  role: string;
  level: string;
  gender: string;
  background: string;
};

type Question = {
  id: number;
  scenario: string;
  optionA: { text: string; dimension: string; value: string };
  optionB: { text: string; dimension: string; value: string };
};

import { AssessmentModalTemplate, ReportCardTemplate, AssessmentProfileForm, MBTIReportMarkdownComponents, ReportStreamingStatus, useStreamingReportText, prepareReportCardExport, REPORT_VIEW_DEFAULTS, ReportCardFrame } from "./shared/AssessmentTemplates";

interface MBTIAssessmentProps {
  onClose: () => void;
}

export function MBTIAssessment({ onClose }: MBTIAssessmentProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'profile' | 'generating' | 'questions' | 'analyzing' | 'report'>('profile');
  const [profile, setProfile] = useState<UserProfile>({ nickname: user?.name || '', role: '', level: '', gender: '', background: '' });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [report, setReport] = useState<string>('');
  const [showQuestionReview, setShowQuestionReview] = useState(false);
  const [showRoleInImage, setShowRoleInImage] = useState(REPORT_VIEW_DEFAULTS.showRoleInImage); // Controls Level (P7, etc.)
  const [showRoleTag, setShowRoleTag] = useState(REPORT_VIEW_DEFAULTS.showRoleTag); // Controls Role/Post (Product Manager, etc.)
  const [infoFontSize, setInfoFontSize] = useState(REPORT_VIEW_DEFAULTS.infoFontSize);
  const [reportScale, setReportScale] = useState(REPORT_VIEW_DEFAULTS.reportScale);
  const { modelProvider } = usePreferences();
  
  // Magic Word Listener
  const isReviewUnlocked = useMagicWord("showreview");

  // Streaming State
  const [genProgress, setGenProgress] = useState(0);
  const [analysisState, setAnalysisState] = useState(0); // 0: init, 1-4: thinking steps, 5: writing
  const [isReportStreaming, setIsReportStreaming] = useState(false);
  const [reportStreamKey, setReportStreamKey] = useState(0);
  
  // Usage Stats
  const [genStats, setGenStats] = useState<{ duration: number; usage?: any } | null>(null);
  const [anaStats, setAnaStats] = useState<{ duration: number; usage?: any } | null>(null);
  const thinkingSteps = [
    "正在解构您的 16 个决策数据点...",
    "正在通过 4x4 维度矩阵进行交叉验证...",
    "正在检测行为偏好中的隐性动机...",
    "正在计算关键冲突维度的权重分布...",
    "正在匹配高管胜任力模型数据库...",
    "正在生成领导风格的稳定画像...",
    "正在校准情境决策的一致性指数...",
    "分析完成，正在生成最终MBTI专属报告..."
  ];
  const reportStreamingText = useStreamingReportText({
    sourceText: report,
    initialText: "正在解析你的决策风格与用人偏好...",
    intervalMs: 7800,
    initialDelayMs: 7800,
    resetKey: reportStreamKey,
    fallbackSegments: thinkingSteps,
    fallbackUntilLength: 240
  });

  const copyQuestionsToClipboard = () => {
    const text = formatQuestionsForReview(questions, answers, null, {
        model: modelProvider === 'deepseek' ? 'DeepSeek (Phase 1: Chat V3 / Phase 2: Reasoner R1)' : 'Doubao (Phase 1: Lite / Phase 2: Pro)',
        genDuration: genStats?.duration,
        genInput: genStats?.usage?.prompt_tokens,
        genOutput: genStats?.usage?.completion_tokens,
        anaDuration: anaStats?.duration,
        anaInput: anaStats?.usage?.prompt_tokens,
        anaOutput: anaStats?.usage?.completion_tokens
    });
    
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy: ', err);
      alert("复制失败，请手动复制");
    });
  };

  const handleStart = async () => {
    if (!profile.role || !profile.level || !profile.gender || !profile.background || !profile.nickname) return;
    setStep('generating');
    setGenProgress(0);
    const startTime = Date.now();

    try {
      const res = await fetch('/api/assessment/mbti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_questions',
          payload: { 
            userProfile: profile,
            modelProvider: modelProvider 
          }
        })
      });

      if (!res.ok) {
         throw new Error(`API Error: ${res.status}`);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        // Count occurrences of "id" or "scenario" to estimate progress
        // Each question has one "id" field. Target is 16.
        const matches = fullText.match(/"id"\s*:/g);
        const count = matches ? matches.length : 0;
        setGenProgress(Math.min(count, 16));
      }

      // Record Stats
      const duration = Date.now() - startTime;
      // Estimate input tokens: prompt is roughly fixed + profile length. 1 token ~= 4 chars (en) or 1 char (cn).
      // Prompt is ~1k chars. Profile is small.
      const inputTokens = 1500; // Rough estimate
      // Output tokens: fullText length / 3 (since JSON has structure overhead)
      const outputTokens = Math.round(fullText.length / 3);
      setGenStats({ duration, usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens } });

      const normalizedQuestions = parseMBTIQuestionsFromStream(fullText);
      setQuestions(normalizedQuestions);
      setStep('questions');

    } catch (e: any) {
      console.error(e);
      alert(e.message || "网络错误，请检查连接");
      setStep('profile');
    }
  };

  const handleAnswer = (value: string) => {
    const currentQ = questions[currentQuestionIndex];
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Finished
      submitAnswers(newAnswers);
    }
  };

  const submitAnswers = async (finalAnswers: Record<number, string>) => {
    setStep('analyzing');
    setAnalysisState(1); // Start mimic thinking
    setReport('');
    setIsReportStreaming(true);
    setReportStreamKey(prev => prev + 1);
    const startTime = Date.now();

    // Mimic thinking steps timer
    const thinkingTimer = setInterval(() => {
        setAnalysisState(prev => {
            if (prev < 8) return prev + 1;
            return prev;
        });
    }, 7800); // Change status every 7.8s

    let receivedFirstByte = false;
    try {
      const res = await fetch('/api/assessment/mbti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_report',
          payload: {
            userProfile: profile,
            questions: questions,
            answers: finalAnswers,
            modelProvider: modelProvider
          }
        })
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullReportContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Once we receive data, stop thinking animation and show report
        if (!receivedFirstByte) {
            receivedFirstByte = true;
            clearInterval(thinkingTimer);
            setStep('report');
        }

        const chunk = decoder.decode(value, { stream: true });
        fullReportContent += chunk;
        setReport(prev => prev + chunk);
      }

      // Record Stats
      const duration = Date.now() - startTime;
      // Estimate input tokens: transcript length
      const transcriptLen = 2000; // rough estimate of transcript
      const outputTokens = Math.round(fullReportContent.length / 2); // Chinese chars usually 1-2 tokens
      setAnaStats({ duration, usage: { prompt_tokens: transcriptLen, completion_tokens: outputTokens } });

      // Save History
      try {
        await fetch('/api/assessment/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'MBTI',
                title: `MBTI: ${profile.role} (${profile.background || 'Generic'})`,
                result: fullReportContent, // Save the actual accumulated content
            metadata: JSON.stringify({ 
                profile, 
                modelProvider: modelProvider,
                questions: questions,
                answers: finalAnswers
            })
        })
        });
      } catch (err) {
         console.error("Failed to save history", err);
      }

    } catch (e) {
      console.error(e);
      alert("网络错误");
      clearInterval(thinkingTimer);
      setStep('questions');
    } finally {
      clearInterval(thinkingTimer);
      setIsReportStreaming(false);
    }
  };

  const handleSaveImage = async () => {
    console.log("[SaveImage] Starting save process...");
    const element = document.getElementById('report-card');
    if (!element) {
        console.error("[SaveImage] Element #report-card not found!");
        return;
    }
    console.log("[SaveImage] Element found:", element);

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      const exportContext = prepareReportCardExport(element, 1);
      await exportContext.ready;
      console.log("[SaveImage] Starting html2canvas...");
      let canvas;
      try {
        canvas = await html2canvas(exportContext.node, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#FDFBF7',
          logging: true,
          width: exportContext.node.scrollWidth,
          height: exportContext.node.scrollHeight,
          scrollX: 0,
          scrollY: 0,
        });
      } finally {
        exportContext.cleanup();
      }
      console.log("[SaveImage] Canvas created:", canvas);
      
      console.log("[SaveImage] Converting to DataURL...");
      const image = canvas.toDataURL("image/png");
      console.log("[SaveImage] DataURL created (length):", image.length);

      const link = document.createElement('a');
      link.href = image;
      
      const now = new Date();
      const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0');
        
      link.download = `MBTI-Report-${profile.nickname}(${timestamp}).png`;
      console.log("[SaveImage] Triggering download:", link.download);
      link.click();
      console.log("[SaveImage] Done.");
    } catch (err) {
      console.error("[SaveImage] Error:", err);
      alert("保存图片失败: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Render Helpers
  const renderProfile = () => (
    <AssessmentProfileForm
      title="初始化你的决策模型"
      description="为了生成最贴合您职场情境的模拟战，请完善以下信息。"
      profile={profile}
      setProfile={(key, value) => setProfile(prev => ({ ...prev, [key]: value }))}
      onStart={handleStart}
      themeColor="blue"
    />
  );

  const renderLoading = (text: string) => {
    // Determine content based on phase
    if (step === 'generating') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
              <div className="relative">
                <div className="absolute inset-0 bg-[#1e40af] rounded-full animate-ping opacity-10"></div>
                <Loader2 className="h-16 w-16 text-[#1e40af] animate-spin relative z-10" />
              </div>
              <h3 className="mt-8 text-xl font-medium text-gray-800 text-center whitespace-pre-wrap leading-relaxed">
                  正在生成MBTI决策模拟场景...
              </h3>
              <div className="w-64 h-2 bg-gray-100 rounded-full mt-6 overflow-hidden">
                  <div 
                    className="h-full bg-[#1e40af] transition-all duration-300 ease-out"
                    style={{ width: `${(genProgress / 16) * 100}%` }}
                  ></div>
              </div>
              <p className="mt-3 text-[#1e40af] font-medium text-sm">
                  已生成 {genProgress} / 16 道情境题
              </p>
            </div>
        );
    }

    if (step === 'analyzing') {
        const currentText = thinkingSteps[Math.min(analysisState - 1, 7)] || thinkingSteps[0];

        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
              <div className="relative">
                <div className="absolute inset-0 bg-[#FFBF3F] rounded-full animate-ping opacity-20"></div>
                <Loader2 className="h-16 w-16 text-[#FFBF3F] animate-spin relative z-10" />
              </div>
              <h3 className="mt-8 text-xl font-medium text-gray-800 text-center whitespace-pre-wrap leading-relaxed animate-pulse">
                  {currentText}
              </h3>
              <p className="mt-2 text-gray-500 text-sm">高管内参正在生成报告(1~2分钟)</p>
            </div>
        );
    }

    return null;
  };

  const renderQuestion = () => {
    const q = questions[currentQuestionIndex];
    if (!q) return null;

    // Safety check for malformed question data
    if (!q.optionA || !q.optionB) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-xl text-center">
          <p className="text-red-600 font-medium">题目数据加载异常</p>
          <button 
             onClick={() => setStep('profile')}
             className="mt-4 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
          >
            重新开始
          </button>
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto px-4 pb-6">
        <div className="max-w-2xl mx-auto mt-6">
        {/* Progress */}
        <div className="flex items-center justify-between mb-6 px-2">
          <span className="text-xs font-bold text-blue-600 tracking-wider">QUESTION {currentQuestionIndex + 1} / {questions.length}</span>
          <div className="h-1.5 flex-1 mx-4 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Scenario Card */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6 border-t-4 border-blue-600">
          <h3 className="text-base md:text-lg font-serif text-gray-900 leading-relaxed text-center">
            {q.scenario}
          </h3>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleAnswer(q.optionA.value)}
            className="group relative p-3 md:p-5 bg-white hover:bg-blue-50 border border-gray-100 hover:border-blue-500 rounded-lg transition-all duration-300 text-left hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 group-hover:bg-blue-600 text-gray-500 group-hover:text-white flex items-center justify-center font-bold mr-3 transition-colors text-sm">
                A
              </div>
              <span className="text-sm md:text-base text-gray-700 group-hover:text-blue-900 font-medium leading-relaxed">
                {q.optionA.text}
              </span>
            </div>
          </button>

          <button
            onClick={() => handleAnswer(q.optionB.value)}
            className="group relative p-3 md:p-5 bg-white hover:bg-blue-50 border border-gray-100 hover:border-blue-500 rounded-lg transition-all duration-300 text-left hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 group-hover:bg-blue-600 text-gray-500 group-hover:text-white flex items-center justify-center font-bold mr-3 transition-colors text-sm">
                B
              </div>
              <span className="text-sm md:text-base text-gray-700 group-hover:text-blue-900 font-medium leading-relaxed">
                {q.optionB.text}
              </span>
            </div>
          </button>
        </div>
        </div>
      </div>
    );
  };

  const renderReport = () => {
    // Split report into Main Body and Turnaround (Shenzhuanzhe)
    // Apply instant subtitle optimization for current view
    const processedReport = processReportContent(report);
        
    const [mainBody, turnaroundBody] = processedReport.split(/##\s*一句话神转折/);

    return (
    <div className="h-full flex flex-col bg-[#F5F5F5]">
      <ReportStreamingStatus active={isReportStreaming} text={reportStreamingText} />
      {/* Review & Save Button Bar */}
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
            onClick={() => {
              copyQuestionsToClipboard();
              setShowQuestionReview(true);
            }}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#151E32] transition-colors"
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

      {/* Report Content - Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-8">
          <ReportCardFrame reportScale={reportScale}>
              <ReportCardTemplate
                id="report-card"
                toolName="MBTI高管决策风格评测报告"
                toolIcon={<Briefcase className="w-4 h-4" />}
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
                <div className="p-10 flex-1 relative z-10">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={MBTIReportMarkdownComponents}
                    >
                    {mainBody}
                    </ReactMarkdown>
                </div>

            {/* 6. The "Turnaround" Section (Shenzhuanzhe) - Movie Poster Style */}
            {turnaroundBody && (
                <div className="mt-auto bg-[#151E32] px-8 py-4 text-center relative overflow-hidden print:break-inside-avoid flex flex-col items-center justify-center min-h-[100px]">
                    {/* Golden Accent Line */}
                    <div className="w-12 h-[1px] bg-[#C5A059] opacity-40 mb-2"></div>
                    
                    <h2 className="text-[#C5A059] font-medium tracking-[0.4em] text-[10px] uppercase mb-1 opacity-50">EXECUTIVE INSIGHT</h2>
                    
                    <div className="relative inline-block max-w-lg mx-auto px-4">
                        <div className="text-xl font-serif text-white leading-relaxed tracking-widest opacity-90">
                            <ReactMarkdown components={{
                                p: ({node, ...props}) => <p className="m-0 text-white drop-shadow-sm" {...props}/>,
                                em: ({node, ...props}) => <em className="not-italic" {...props}/>,
                                strong: ({node, ...props}) => <strong className="font-bold text-[#C5A059]" {...props}/>
                            }}>
                                {turnaroundBody}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}
              </ReportCardTemplate>
          </ReportCardFrame>
      </div>
    </div>
  );
  };

  const { nicheTitle, nicheBody, remainingBody } = { nicheTitle: "", nicheBody: "", remainingBody: "" }; // Placeholder if needed or just use logic inside renderReport

  return (
    <AssessmentModalTemplate
      title="MBTI online"
      icon={<Activity className="w-5 h-5 text-white" />}
      iconBgClass="bg-blue-600"
      headerColorClass="text-blue-600"
      onClose={onClose}
      maxWidthClass="max-w-3xl"
    >
        {/* Step 1: Profile Input */}
        {step === 'profile' && renderProfile()}

        {/* Step 2: Generating */}
        {step === 'generating' && renderLoading("正在生成MBTI决策模拟场景...")}

        {/* Step 3: Questions */}
        {step === 'questions' && renderQuestion()}

        {/* Step 4: Analyzing */}
        {step === 'analyzing' && renderLoading("正在分析决策风格...")}

        {/* Step 5: Report */}
        {step === 'report' && renderReport()}

        {/* Question Review Modal */}
        {showQuestionReview && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
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
                   {formatQuestionsForReview(questions, answers, null, {
                      model: modelProvider === 'deepseek' ? 'DeepSeek (Phase 1: Chat V3 / Phase 2: Reasoner R1)' : 'Doubao (Phase 1: Lite / Phase 2: Pro)',
                      genDuration: genStats?.duration,
                      genInput: genStats?.usage?.prompt_tokens,
                      genOutput: genStats?.usage?.completion_tokens,
                      anaDuration: anaStats?.duration,
                      anaInput: anaStats?.usage?.prompt_tokens,
                      anaOutput: anaStats?.usage?.completion_tokens
                  })}
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
                   onClick={copyQuestionsToClipboard}
                   className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 shadow-sm"
                 >
                   <Copy className="w-4 h-4" />
                   一键复制全部
                 </button>
               </div>
            </div>
          </div>
        )}
    </AssessmentModalTemplate>
  );
}
