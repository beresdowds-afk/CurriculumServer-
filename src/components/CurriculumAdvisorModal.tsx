import React, { useState } from 'react';
import { 
  UserProfile, 
  UserRole 
} from '../types';
import { 
  Sparkles, 
  Send, 
  RefreshCw, 
  X, 
  BookOpen, 
  ShieldCheck, 
  UserCheck, 
  HelpCircle,
  Award
} from 'lucide-react';

interface CurriculumAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const CurriculumAdvisorModal: React.FC<CurriculumAdvisorModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  if (!isOpen) return null;

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello ${currentUser.name}! I am your CurriculumFlow AI Academic Advisor. As the **${currentUser.role.replace('_', ' ').toUpperCase()}**, how can I assist with your curriculum planning, pedagogical strategies, Nigerian NERDC standards, or examination quality assurance today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const getSuggestedPrompts = (role: UserRole) => {
    switch (role) {
      case 'principal':
        return [
          'How do I audit SS2 Mathematics curriculum coverage against WAEC syllabus?',
          'What are the key regulatory requirements for BECE & WASSCE accreditation?',
          'How can I structure teacher remediation for low-scoring science classes?'
        ];
      case 'academic_coordinator':
        return [
          'Generate a 12-week scheme of work review checklist for JSS 2 Basic Science.',
          'How do we evaluate cognitive balance in teacher-submitted continuous assessment tests?',
          'Recommend instructional materials for Nigerian secondary schools with limited lab equipment.'
        ];
      case 'teacher':
        return [
          'How can I introduce quadratic equations using Nigerian real-world business scenarios?',
          'Give me 3 formative evaluation questions for photosynthesis in SS 1 Biology.',
          'What scaffolded steps help students overcome fear of algebra?'
        ];
      case 'exam_officer':
        return [
          'What is the standard Bloom taxonomy distribution for WAEC SSCE mock papers?',
          'How should marking schemes distinguish between Method Marks (M) and Accuracy Marks (A)?',
          'What security protocols prevent exam question leakages before testing day?'
        ];
      case 'student':
        return [
          'Explain the difference between linear and quadratic equations with simple examples.',
          'What are the most frequent topics in BECE Basic Science examinations?',
          'How do I calculate speed, distance, and acceleration step-by-step?'
        ];
      case 'parent':
        return [
          'What topics should my child master in SS 2 First Term Mathematics?',
          'How can I support my child who is struggling with science topics at home?',
          'What is the grading scale for JSS 3 Junior WAEC / BECE?'
        ];
      default:
        return [
          'Explain the Nigerian 9-3-4 Universal Basic Education curriculum framework.',
          'What are the compulsory cross-cutting subjects for Senior Secondary in Nigeria?'
        ];
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/curriculum-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: currentUser.role,
          userQuery: query,
          context: `User Name: ${currentUser.name}, School: Federal Government College Lagos, Current Term: Term 1 (2026/2027)`
        })
      });

      if (!response.ok) throw new Error('Advisor API call failed');
      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.response || 'I am here to guide your curriculum implementation.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Advisor error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: 'I encountered an issue retrieving authoritative curricular advice. Please ensure you are connected and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full h-[650px] flex flex-col overflow-hidden shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md border border-emerald-400/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base">CurriculumFlow AI Academic Advisor</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  NERDC Grounded
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tailored for: <strong className="text-slate-200">{currentUser.name}</strong> ({currentUser.role.replace('_', ' ')})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  AI
                </div>
              )}
              <div
                className={`p-4 rounded-2xl max-w-xl space-y-1.5 leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-950/40'
                    : 'bg-slate-850 text-slate-200 border border-slate-700/80 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-line font-sans text-xs">{m.text}</p>
                <span className={`text-[10px] block ${m.sender === 'user' ? 'text-emerald-200' : 'text-slate-500'}`}>
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                AI
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-700/80 rounded-bl-none flex items-center gap-2 text-slate-400 text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Consulting NERDC curriculum & pedagogical frameworks...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-slate-900 border-t border-slate-800/80 overflow-x-auto no-scrollbar flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 pl-1">
            Suggested:
          </span>
          {getSuggestedPrompts(currentUser.role).map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-[11px] whitespace-nowrap transition-all hover:border-emerald-500/40"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask about curriculum objectives, lesson structures, WAEC/BECE standards..."
            className="flex-1 bg-slate-900 text-slate-200 p-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold transition-all shadow-md shadow-emerald-950/50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
