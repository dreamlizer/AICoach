"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { X, Trash2, FileText, Calendar, CheckSquare, Square, ChevronRight, Loader2, AlertCircle, Image as ImageIcon, Briefcase, User, Hash, Target, Crown, Tag, Activity, Zap, BookOpen, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/context/auth-context';
import html2canvas from 'html2canvas';
import { FourDRadarChart } from './FourDRadarChart';

import { useMagicWord } from '@/hooks/useMagicWord';
import { formatQuestionsForReview, format4DQuestionsForReview, formatPDPQuestionsForReview, processReportContent, extract4DReportSections } from '@/lib/mbti-utils';
import { ReportCardTemplate, SharedReportMarkdownComponents, MBTIReportMarkdownComponents, prepareReportCardExport, REPORT_VIEW_DEFAULTS, ReportCardFrame } from './shared/AssessmentTemplates';
import pdpTiger from '@/lib/Pic/PDP-Tiger.png';
import pdpPeacock from '@/lib/Pic/PDP-Peacock.png';
import pdpOwl from '@/lib/Pic/PDP-OWL.png';
import pdpKoala from '@/lib/Pic/PDP-Loala.png';
import pdpChameleon from '@/lib/Pic/PDP-Chameleon.png';

interface AssessmentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Assessment = {
  id: number;
  type: string;
  title: string;
  result: string;
  metadata: string;
  created_at: string;
};

export function AssessmentHistoryModal({ isOpen, onClose }: AssessmentHistoryModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Assessment[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [viewingItem, setViewingItem] = useState<Assessment | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showRoleInImage, setShowRoleInImage] = useState(REPORT_VIEW_DEFAULTS.showRoleInImage);
  const [showRoleTag, setShowRoleTag] = useState(REPORT_VIEW_DEFAULTS.showRoleTag);
  const [infoFontSize, setInfoFontSize] = useState(REPORT_VIEW_DEFAULTS.infoFontSize);
  const [reportScale, setReportScale] = useState(REPORT_VIEW_DEFAULTS.reportScale);
  const [editableNickname, setEditableNickname] = useState('');
  const [showQuestionReview, setShowQuestionReview] = useState(false);
  const [reviewText, setReviewText] = useState('');
  
  // Magic Word Listener
  const isReviewUnlocked = useMagicWord("showreview");

  const animalLabelMap = {
    Tiger: "老虎",
    Peacock: "孔雀",
    Koala: "考拉",
    Owl: "猫头鹰",
    Chameleon: "变色龙"
  } as const;

  type AnimalType = keyof typeof animalLabelMap;

  const animalImageMap: Record<AnimalType, typeof pdpTiger> = {
    Tiger: pdpTiger,
    Peacock: pdpPeacock,
    Koala: pdpKoala,
    Owl: pdpOwl,
    Chameleon: pdpChameleon
  };

  useEffect(() => {
    if (viewingItem) {
      const meta = getProfileFromMetadata(viewingItem);
      setEditableNickname(meta.nickname || 'User');
      setShowRoleTag(REPORT_VIEW_DEFAULTS.showRoleTag);
      setShowRoleInImage(REPORT_VIEW_DEFAULTS.showRoleInImage);
      setInfoFontSize(REPORT_VIEW_DEFAULTS.infoFontSize);
      setReportScale(REPORT_VIEW_DEFAULTS.reportScale);
    }
  }, [viewingItem]);

  useEffect(() => {
    if (isOpen && user) {
      fetchHistory();
    }
  }, [isOpen, user]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assessment/history');
      const data = await res.json();
      if (data.history) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error("Failed to load history", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 条记录吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const res = await fetch('/api/assessment/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      
      if (res.ok) {
        setHistory(prev => prev.filter(item => !selectedIds.has(item.id)));
        setSelectedIds(new Set());
        setIsSelectionMode(false);
      } else {
        alert("删除失败");
      }
    } catch (error) {
      alert("网络错误");
    }
  };

  const handleSaveImage = async () => {
    console.log("[HistorySaveImage] Starting save process...");
    const element = document.getElementById('history-report-card');
    if (!element || !viewingItem) {
        console.error("[HistorySaveImage] Element or viewingItem missing", { element, viewingItem });
        return;
    }

    try {
      console.log("[HistorySaveImage] Starting html2canvas...");
      const exportContext = prepareReportCardExport(element, 1);
      await exportContext.ready;
      let canvas;
      try {
        canvas = await html2canvas(exportContext.node, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#FDFBF7',
          logging: true,
          width: exportContext.node.scrollWidth,
          height: exportContext.node.scrollHeight,
          windowWidth: exportContext.node.scrollWidth,
          windowHeight: exportContext.node.scrollHeight,
          scrollX: 0,
          scrollY: 0,
        });
      } finally {
        exportContext.cleanup();
      }
      console.log("[HistorySaveImage] Canvas created");

      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      const parsedMetadata = viewingItem.metadata ? JSON.parse(viewingItem.metadata) : {};
      
      // Use the editable nickname if available, otherwise fallback
      const nickname = editableNickname || parsedMetadata.profile?.nickname || 'User';
      
      const now = new Date();
      const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0');

      const prefix = viewingItem.type === '4D-Leadership' ? '4D-Leadership-Report' : 'MBTI-Report';
      link.download = `${prefix}-${nickname}(${timestamp}).png`;
      console.log("[HistorySaveImage] Triggering download:", link.download);
      link.click();
      console.log("[HistorySaveImage] Done");
    } catch (err) {
      console.error("[HistorySaveImage] Error:", err);
      alert("保存图片失败: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === history.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(history.map(h => h.id)));
    }
  };

  const buildReviewText = (meta: any, type?: string) => {
    if (!meta?.questions || !meta?.answers) {
      return "该历史记录未包含题目详情";
    }
    const questions = meta.questions;
    const answers = meta.answers;
    const firstQuestion = Array.isArray(questions) ? questions[0] : null;
    if (type === '4D-Leadership') {
      return format4DQuestionsForReview(questions, answers);
    }
    if (type?.toLowerCase().includes('pdp')) {
      return formatPDPQuestionsForReview(questions, answers);
    }
    if (type?.toLowerCase().includes('mbti') || (firstQuestion && firstQuestion.optionA && firstQuestion.optionB)) {
      return formatQuestionsForReview(questions, answers);
    }
    if (firstQuestion && Array.isArray(firstQuestion.options)) {
      return format4DQuestionsForReview(questions, answers);
    }
    return JSON.stringify({ questions, answers }, null, 2);
  };

  const copyReviewText = () => {
    if (!reviewText) return;
    navigator.clipboard.writeText(reviewText).catch(err => {
      console.error('Failed to copy: ', err);
      alert("复制失败，请手动复制");
    });
  };

  const handleReviewQuestions = () => {
    if (!viewingItem || !viewingItem.metadata) return;
    try {
        const meta = JSON.parse(viewingItem.metadata);
        const fullText = buildReviewText(meta, viewingItem.type);
        setReviewText(fullText);
        setShowQuestionReview(true);
    } catch (e) {
        console.error(e);
        setReviewText("数据解析失败");
        setShowQuestionReview(true);
    }
  };

  const getProfileFromMetadata = (item: Assessment) => {
      try {
          const meta = JSON.parse(item.metadata);
          return meta.profile || meta.userProfile || {};
      } catch (e) {
          return {};
      }
  };

  const get4DScores = (item: Assessment) => {
    try {
        const meta = JSON.parse(item.metadata);
        const scores = { Green: 0, Yellow: 0, Blue: 0, Orange: 0 };
        if (meta.answers) {
             Object.values(meta.answers).forEach((color: any) => {
                 if (scores[color as keyof typeof scores] !== undefined) {
                     scores[color as keyof typeof scores]++;
                 }
             });
        }
        return scores;
    } catch (e) {
        return { Green: 0, Yellow: 0, Blue: 0, Orange: 0 };
    }
  };

  const getPdpDominant = (item: Assessment): AnimalType => {
    try {
      const meta = JSON.parse(item.metadata);
      const candidate = meta?.dominant;
      if (candidate && animalLabelMap[candidate as AnimalType]) {
        return candidate as AnimalType;
      }
      const totals = meta?.stats?.totals;
      if (totals) {
        const ordered: AnimalType[] = ["Tiger", "Peacock", "Owl", "Koala", "Chameleon"];
        let dominant: AnimalType = ordered[0];
        let maxScore = -1;
        ordered.forEach((animal) => {
          const score = totals[animal];
          if (typeof score === "number" && score > maxScore) {
            maxScore = score;
            dominant = animal;
          }
        });
        return dominant;
      }
    } catch (e) {
      return "Tiger";
    }
    return "Tiger";
  };

  if (!isOpen) return null;

  const profile = viewingItem ? getProfileFromMetadata(viewingItem) : {};
  const is4D = viewingItem?.type === "4D-Leadership";
  const isPDP = viewingItem?.type?.toLowerCase().includes("pdp");
  const pdpDominant = viewingItem && isPDP ? getPdpDominant(viewingItem) : "Tiger";

  // Apply instant subtitle optimization for history view
  const processedResult = viewingItem ? processReportContent(viewingItem.result) : "";
  const { nicheTitle, nicheBody, remainingBody } = is4D
    ? extract4DReportSections(processedResult) 
    : { nicheTitle: "", nicheBody: "", remainingBody: processedResult };

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-[1400px] h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-[#333333]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#333333] flex justify-between items-center bg-gray-50/50 dark:bg-[#252525]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">历史评测结果</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">查看过往的所有测评报告与分析</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-[#333333] rounded-full transition-colors text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* List Sidebar */}
          <div className={`${viewingItem ? 'hidden lg:flex' : 'flex'} ${viewingItem ? 'w-[350px]' : 'w-full'} flex-col border-r border-gray-100 dark:border-[#333333] bg-white dark:bg-[#1E1E1E] transition-all duration-300`}>
            {/* Toolbar */}
            <div className="p-3 border-b border-gray-100 dark:border-[#333333] flex justify-between items-center bg-gray-50/30 dark:bg-[#252525]/50">
              <button
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  setSelectedIds(new Set());
                }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  isSelectionMode 
                    ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-[#2C2C2C] dark:border-[#333333] dark:text-gray-300'
                }`}
              >
                {isSelectionMode ? '取消选择' : '批量管理'}
              </button>
              
              {isSelectionMode && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={toggleAll}
                    className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    全选
                  </button>
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                  <button 
                    onClick={handleDelete}
                    disabled={selectedIds.size === 0}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="w-3 h-3" />
                    删除 ({selectedIds.size})
                  </button>
                </div>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <span className="text-xs">加载中...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-sm">暂无历史记录</span>
                </div>
              ) : (
                history.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => !isSelectionMode && setViewingItem(item)}
                    className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${
                      viewingItem?.id === item.id 
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                        : 'bg-white border-gray-100 hover:border-blue-100 hover:shadow-sm dark:bg-[#2C2C2C] dark:border-[#333333] dark:hover:border-blue-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isSelectionMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(item.id);
                          }}
                          className="mt-1 text-gray-400 hover:text-blue-600 dark:text-gray-500"
                        >
                          {selectedIds.has(item.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium text-sm mb-1 truncate ${viewingItem?.id === item.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-200'}`}>
                          {item.title || item.type}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.created_at).toLocaleString('zh-CN', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      
                      {!isSelectionMode && (
                        <ChevronRight className={`w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors ${viewingItem?.id === item.id ? 'text-blue-400' : ''}`} />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detail View */}
          {viewingItem ? (
            <div className="flex-1 bg-gray-50 dark:bg-[#121212] flex flex-col h-full w-full lg:w-2/3 absolute lg:relative inset-0 z-10 lg:z-auto">
               {/* Mobile Back Button */}
               <div className="lg:hidden px-4 py-3 bg-white dark:bg-[#1E1E1E] border-b border-gray-100 dark:border-[#333333] flex items-center gap-2">
                 <button onClick={() => setViewingItem(null)} className="text-gray-500">
                   <ChevronRight className="w-5 h-5 rotate-180" />
                 </button>
                 <span className="font-bold text-gray-900 dark:text-white truncate">{viewingItem.title}</span>
               </div>

               {/* Toolbar for Report Card */}
               <div className="bg-[#FDFBF7] px-8 py-3 border-b border-[#E5E0D5] flex flex-col gap-2 shadow-sm md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-4">
                 <div className="flex w-full items-center justify-end gap-4 md:w-auto">
                   <div className="flex items-center gap-2 group">
                        <span className="text-sm text-gray-600 group-hover:text-[#151E32] transition-colors">信息字号</span>
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

                   <div className="h-4 w-px bg-gray-300"></div>

                   <div className="flex items-center gap-2 group">
                        <span className="text-sm text-gray-600 group-hover:text-[#151E32] transition-colors">卡片缩放</span>
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

                 <div className="flex w-full items-center justify-end gap-4 md:w-auto">
                   <label className="flex items-center gap-2 cursor-pointer select-none group">
                       <input 
                           type="checkbox" 
                           checked={showRoleTag} 
                           onChange={(e) => setShowRoleTag(e.target.checked)}
                           className="w-4 h-4 text-[#151E32] rounded focus:ring-[#151E32] border-gray-400" 
                       />
                       <span className="text-sm text-gray-600 group-hover:text-[#151E32] transition-colors">岗位标签</span>
                   </label>

                   <label className="flex items-center gap-2 cursor-pointer select-none group">
                       <input 
                           type="checkbox" 
                           checked={showRoleInImage} 
                           onChange={(e) => setShowRoleInImage(e.target.checked)}
                           className="w-4 h-4 text-[#151E32] rounded focus:ring-[#151E32] border-gray-400" 
                       />
                       <span className="text-sm text-gray-600 group-hover:text-[#151E32] transition-colors">级别标签</span>
                   </label>
                   
                   {isReviewUnlocked && (
                   <button 
                     onClick={handleReviewQuestions}
                     className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#151E32] transition-colors mr-4"
                   >
                     <FileText className="w-4 h-4" />
                     <span>审阅题目</span>
                   </button>
                   )}

                   <button 
                     onClick={handleSaveImage}
                     className="flex items-center gap-2 text-sm text-[#151E32] hover:text-black transition-colors font-bold bg-[#C5A059]/20 hover:bg-[#C5A059]/30 px-4 py-1.5 rounded-lg border border-[#C5A059]/30"
                   >
                     <ImageIcon className="w-4 h-4" />
                     <span>保存海报</span>
                   </button>
                 </div>
               </div>

               {/* Content - with max-w-3xl constraint to match live view */}
              <div className="flex-1 overflow-y-auto p-8 bg-[#F5F5F5]">
                <ReportCardFrame reportScale={reportScale} widthScale={0.9}>
                  <ReportCardTemplate
                    id="history-report-card"
                    toolName={is4D ? "4D 高管坐标" : isPDP ? "PDP 职场生态解码" : "MBTI高管决策风格评测报告"}
                    toolIcon={<Briefcase className="w-4 h-4" />}
                    userProfile={{
                      name: editableNickname,
                      role: profile.role,
                      industry: profile.industry || profile.background,
                      level: profile.level
                    }}
                    showRoleTag={showRoleTag}
                    showRoleInImage={showRoleInImage}
                    infoFontSize={infoFontSize}
                    onNameChange={setEditableNickname}
                  >
                      {is4D ? (
                        <>
                        {/* Radar Chart & Title Section */}
                        <div className="relative z-10 px-8 pt-8">
                           <div className="flex flex-row items-stretch gap-8 mb-2">
                               {/* Left: Radar Chart (2/3) */}
                               <div className="w-2/3 flex justify-end items-center">
                                   <div className="transform mr-16 origin-center" style={{ transform: 'scale(1.18)' }}>
                                       <FourDRadarChart scores={get4DScores(viewingItem)} />
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
                                           
                                           {/* Dynamic Title Rendering */}
                                           <div className="mb-4">
                                                {(() => {
                                                    const cleanTitle = nicheTitle.replace(/你的团队生态位：/g, "");
                                                    const parts = cleanTitle.split(/·| /).filter(s => s.trim());
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
                                                    return <h3 className="text-xl font-black text-[#151E32] leading-tight tracking-wide">{cleanTitle}</h3>;
                                                })()}
                                           </div>

                                           {/* Render Niche Description */}
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
                        </div>
                       </>
                  ) : isPDP ? (
                      <>
                        <div className="absolute top-6 right-8 z-20 pointer-events-none">
                          <div className="w-28 h-28 rounded-2xl bg-white/95 border border-[#E5E0D5] shadow-sm flex items-center justify-center">
                            <div
                              className="w-24 h-24 bg-center bg-no-repeat bg-contain"
                              style={{ backgroundImage: `url(${animalImageMap[pdpDominant].src})` }}
                            />
                          </div>
                        </div>
                        <div className="p-10 flex-1 relative z-10">
                          <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={SharedReportMarkdownComponents}
                          >
                            {remainingBody}
                          </ReactMarkdown>
                        </div>
                      </>
                  ) : (
                       <>
                         <div className="p-10 flex-1 relative z-10">
                           <ReactMarkdown 
                               remarkPlugins={[remarkGfm]}
                               components={MBTIReportMarkdownComponents}
                           >
                             {remainingBody.split(/##\s*一句话神转折/)[0]}
                           </ReactMarkdown>
                         </div>

                         {remainingBody.split(/##\s*一句话神转折/)[1] && (
                              <div className="mt-auto bg-[#151E32] px-8 py-4 text-center relative overflow-hidden print:break-inside-avoid flex flex-col items-center justify-center min-h-[100px]">
                                  <div className="w-12 h-[1px] bg-[#C5A059] opacity-40 mb-2"></div>
                                  
                                  <h2 className="text-[#C5A059] font-medium tracking-[0.4em] text-[10px] uppercase mb-1 opacity-50">EXECUTIVE INSIGHT</h2>
                                  
                                  <div className="relative inline-block max-w-lg mx-auto px-4">
                                      <div className="text-xl font-serif text-white leading-relaxed tracking-widest opacity-90">
                                          <ReactMarkdown components={{
                                              p: ({node, ...props}) => <p className="m-0 text-white drop-shadow-sm" {...props}/>,
                                              em: ({node, ...props}) => <em className="not-italic" {...props}/>,
                                              strong: ({node, ...props}) => <strong className="font-bold text-[#C5A059]" {...props}/>
                                          }}>
                                              {remainingBody.split(/##\s*一句话神转折/)[1]}
                                          </ReactMarkdown>
                                      </div>
                                  </div>
                              </div>
                         )}
                       </>
                      )}
                  </ReportCardTemplate>
                </ReportCardFrame>
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50 dark:bg-[#121212] text-gray-400 flex-col gap-4">
              <FileText className="w-16 h-16 opacity-20" />
              <p>选择左侧记录查看详情</p>
            </div>
          )}
        </div>
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
    </div>,
    document.body
  );
}
