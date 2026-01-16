
import React, { useState } from 'react';
import { PracticeQuestion, CourseSection, Workspace, McqReview } from '../types';
import { evaluateMcqResponse } from '../services/geminiService';

interface PracticeQuestionsProps {
  questions: PracticeQuestion[];
  activeSection: CourseSection;
  onUpdateQuestions: (qs: PracticeQuestion[]) => void;
  onCorrect: () => void;
  workspace: Workspace;
}

export const ExamRoom: React.FC<PracticeQuestionsProps> = ({ questions, activeSection, onUpdateQuestions, onCorrect, workspace }) => {
  const [isEvaluating, setIsEvaluating] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'review'>('all');

  const handleSelect = async (qId: string, idx: number) => {
    const q = questions.find(item => item.id === qId);
    if (!q || q.hasBeenAnswered || !workspace.attachment) return;

    setIsEvaluating(qId);
    try {
      const review: McqReview = await evaluateMcqResponse(q, idx, activeSection, workspace.attachment);
      
      const updated = questions.map(item => item.id === qId ? {
        ...item,
        hasBeenAnswered: true,
        wasCorrect: review.isCorrect,
        deepInsight: review
      } : item);

      onUpdateQuestions(updated);
      if (review.isCorrect) onCorrect();
    } catch (e) {
      console.error("Evaluation failed", e);
    } finally {
      setIsEvaluating(null);
    }
  };

  const visibleQuestions = (questions || []).filter(q => filter === 'all' ? true : (q.hasBeenAnswered && !q.wasCorrect));

  return (
    <div className="flex-1 h-full overflow-y-auto custom-scrollbar bg-[#fdfdfd] p-12">
      <div className="max-w-4xl mx-auto space-y-12 pb-32">
        <div className="flex justify-between items-end gap-8">
          <div className="space-y-4">
            <div className="inline-block px-4 py-1.5 bg-slate-950 text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em]">Diagnostic Protocol</div>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Diagnostic Exam Room</h3>
            <p className="text-slate-400 max-w-lg text-xs font-medium leading-relaxed">Deep Insight analyzes your logical path to correct misconceptions.</p>
          </div>
          <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl flex-shrink-0">
            <button 
              onClick={() => setFilter('all')} 
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              All Probes
            </button>
            <button 
              onClick={() => setFilter('review')} 
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'review' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Review ({(questions || []).filter(q => q.hasBeenAnswered && !q.wasCorrect).length})
            </button>
          </div>
        </div>

        <div className="space-y-12">
          {visibleQuestions.length === 0 ? (
             <div className="py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Awaiting Diagnostic Probes...</p>
             </div>
          ) : visibleQuestions.map((q, qIdx) => (
            <div key={q.id} className={`bg-white p-12 rounded-[4rem] border transition-all relative overflow-hidden ${
              q.hasBeenAnswered ? q.wasCorrect ? 'border-emerald-100 bg-emerald-50/10' : 'border-rose-100 bg-rose-50/10' : 'border-slate-100 shadow-xl shadow-slate-200/50'
            }`}>
              {isEvaluating === q.id && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center flex-col gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Deep Insight Analysis...</span>
                </div>
              )}

              <div className="flex gap-8 items-start mb-10">
                <span className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 ${q.hasBeenAnswered ? q.wasCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white' : 'bg-slate-950 text-white'}`}>
                  {qIdx + 1}
                </span>
                <p className="text-2xl font-black text-slate-900 leading-[1.3] tracking-tight pt-1">{q.question}</p>
              </div>
              
              <div className="grid gap-4">
                {q.options?.map((opt, i) => {
                  const hasAnswered = q.hasBeenAnswered;
                  let style = "bg-slate-50 border-slate-100 hover:border-indigo-300";
                  if (hasAnswered) {
                    if (i === q.correctIndex) style = "bg-emerald-600 text-white border-emerald-600";
                    else if (q.deepInsight?.isCorrect === false && i === q.correctIndex) style = "border-emerald-500 bg-emerald-50";
                    else style = "opacity-40 grayscale";
                  }
                  return (
                    <button 
                      key={i} 
                      disabled={hasAnswered} 
                      onClick={() => handleSelect(q.id, i)} 
                      className={`w-full text-left p-8 rounded-[2.5rem] font-bold text-sm transition-all flex items-center gap-6 border ${style}`}
                    >
                      <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-[11px] font-black border border-slate-200">{String.fromCharCode(65 + i)}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              
              {q.hasBeenAnswered && q.deepInsight && (
                <div className="mt-12 space-y-8 animate-in slide-in-from-top-6">
                  <div className={`p-10 rounded-[3rem] border ${q.wasCorrect ? 'bg-emerald-50 border-emerald-100 text-emerald-950' : 'bg-rose-50 border-rose-100 text-rose-950'}`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-6">Deep Insight Verdict: {q.deepInsight.verdict}</p>
                    <p className="text-lg font-bold leading-relaxed mb-6">"{q.deepInsight.whyUserChoiceIsCorrectOrWrong}"</p>
                    <div className="h-px bg-current opacity-10 mb-6"></div>
                    <div className="space-y-4">
                      <p className="text-sm font-medium"><span className="font-black">Teacher's Explanation:</span> {q.deepInsight.correctAnswerExplanation}</p>
                      {!q.wasCorrect && (
                        <div className="p-6 bg-white/50 rounded-2xl border border-current opacity-80">
                           <p className="text-xs font-black uppercase mb-2">Misconception Identified</p>
                           <p className="text-sm font-medium">{q.deepInsight.misconceptionDetected}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Concepts to Review:</span>
                    {q.deepInsight.conceptsToReview.map((c, i) => (
                      <span key={i} className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">{c}</span>
                    ))}
                  </div>
                  
                  <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] flex items-center gap-6 shadow-xl">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl"><i className="fas fa-lightbulb"/></div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Exam Protocol Tip</p>
                      <p className="text-sm font-bold">{q.deepInsight.examTip}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
