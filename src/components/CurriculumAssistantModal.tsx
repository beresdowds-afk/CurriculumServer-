import React, { useState } from 'react';
import { SubjectCurriculum } from '../types';
import { NERDC_SUBJECTS_DATABASE } from '../data/nerdcDatabase';
import { 
  X, 
  Sparkles, 
  Send, 
  Loader2, 
  Bot, 
  User, 
  BookOpen, 
  Lightbulb, 
  HelpCircle 
} from 'lucide-react';

interface CurriculumAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const PRESET_PROMPTS = [
  'How do I teach Projectile Motion effectively to SS 2 Physics students using locally available materials in Nigeria?',
  'What are the compulsory trade subjects in the Senior Secondary NERDC curriculum and how should schools implement them?',
  'Explain the key differences between the Junior Secondary (JSS 1-3) Basic Science syllabus and Senior Secondary Biology.',
  'Provide a 40-minute lesson outline on Photosynthesis with student-led laboratory activities for SS 1.',
];

export const CurriculumAssistantModal: React.FC<CurriculumAssistantModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your **NERDC National Curriculum AI Assistant**. 
I specialize in the official Nigerian Universal Basic Education (JSS 1–3) and Senior Secondary (SSS 1–3) curricula, as well as WAEC, NECO, BECE, and JAMB standards.

How can I assist your teaching, lesson preparation, or curriculum planning today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('General Nigerian Curriculum');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/curriculum-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          subjectContext: selectedSubject,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await res.json();

      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'assistant',
        text: data.answer || 'I could not generate a response. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        sender: 'assistant',
        text: 'Sorry, I encountered an issue reaching the curriculum engine. Please verify your connection and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div
        id="curriculum-assistant-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-slate-850 px-6 py-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>NERDC Curriculum AI Assistant</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Online
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Specialized pedagogical consultant for Nigerian secondary education standards.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Stream Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-emerald-400 border border-slate-700'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-850 text-slate-200 border border-slate-700/80 whitespace-pre-wrap'
                }`}
              >
                <div>{msg.text}</div>
                <div
                  className={`text-[10px] mt-1 text-right ${
                    msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-500'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-emerald-400 border border-slate-700 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-850 rounded-2xl px-4 py-3 text-xs border border-slate-700/80 flex items-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Consulting NERDC curriculum guidelines...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Quick Questions */}
        <div className="px-6 py-2 bg-slate-900/90 border-t border-slate-800">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Suggestions:
            </span>
            {PRESET_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="text-[11px] bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-2.5 py-1 rounded-full whitespace-nowrap border border-slate-700 transition-colors shrink-0"
              >
                {prompt.length > 45 ? `${prompt.slice(0, 45)}...` : prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="bg-slate-850 p-4 border-t border-slate-700/80 flex items-center gap-3"
        >
          <input
            type="text"
            placeholder="Ask anything about NERDC curriculum, WAEC/NECO syllabus, teaching methods..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs shadow flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
