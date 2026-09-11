import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useInsights, useChatCoach } from '../../services/aiService';
import { Bot, User as UserIcon, Send, Sparkles, HelpCircle } from 'lucide-react';

export const AICoach: React.FC = () => {
  const { data: insights } = useInsights();
  const { mutateAsync: sendMessage, isPending } = useChatCoach();
  const [input, setInput] = useState('');
  const [chat, setChat] = useState<{ role: 'user' | 'coach', text: string }[]>([]);

  const promptSuggestions = [
    'What should I eat post-workout?',
    'How can I optimize my sleep recovery?',
    'Review my training volume for today',
  ];

  const handleSendPrompt = async (textToSend: string) => {
    if (!textToSend.trim() || isPending) return;

    const userText = textToSend;
    const historyPayload = chat.map(c => ({
      role: (c.role === 'coach' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: c.text
    }));

    setChat(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');

    try {
      const res = await sendMessage({
        message: userText,
        history: historyPayload
      });
      setChat(prev => [...prev, { role: 'coach', text: res.reply }]);
    } catch (err) {
      setChat(prev => [...prev, { role: 'coach', text: 'Advisor offline. Please check connection and try again.' }]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendPrompt(input);
  };

  return (
    <Card className="h-full flex flex-col border-kaizen-border/80 shadow-subtle overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-kaizen-border flex items-center justify-between bg-kaizen-surface-elevated/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-control bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow-emerald">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white tracking-tight">Training & Nutrition Advisor</h3>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live
              </span>
            </div>
            <p className="text-xs text-kaizen-muted font-sans">Contextual guidance synchronized to your metabolic & workout logs</p>
          </div>
        </div>
      </div>
      
      {/* Daily Telemetry Insight */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-emerald-500/20">
        <div className="flex items-start gap-3">
          <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold block mb-0.5">
              Daily Intelligence Directive
            </span>
            <p className="text-xs text-kaizen-text font-sans leading-relaxed">
              {insights?.insight || "Analyzing your recent training volume, hydration curve, and circadian markers..."}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-72 min-h-[160px]">
        {chat.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-kaizen-muted mb-3 font-sans">
              Have questions about your nutritional macros, training progression, or sleep cycles?
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {promptSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendPrompt(suggestion)}
                  className="px-3 py-1.5 rounded-control text-xs font-mono bg-kaizen-bg hover:bg-kaizen-surface-hover text-kaizen-muted hover:text-white border border-kaizen-border hover:border-emerald-500/40 transition-all text-left flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chat.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-control flex items-center justify-center shrink-0 ${
                msg.role === 'user'
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                  : 'bg-kaizen-surface-elevated border border-kaizen-border text-kaizen-muted'
              }`}>
                {msg.role === 'user' ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div className={`px-4 py-2.5 rounded-structural text-xs sm:text-sm max-w-[85%] whitespace-pre-line leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-500/15 text-white border border-emerald-500/30 rounded-tr-none'
                  : 'bg-kaizen-surface-elevated text-kaizen-text border border-kaizen-border rounded-tl-none shadow-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))
        )}
        {isPending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-control bg-kaizen-surface-elevated border border-kaizen-border flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            </div>
            <div className="px-4 py-2.5 rounded-structural text-xs bg-kaizen-surface-elevated text-emerald-400 border border-emerald-500/20 rounded-tl-none animate-pulse flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Computing guidance...
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleFormSubmit} className="p-3 bg-kaizen-bg/60 border-t border-kaizen-border flex gap-2">
        <Input 
          placeholder="Ask a question about nutrition, exercises, or recovery..." 
          value={input} 
          onChange={e => setInput(e.target.value)}
          className="flex-1 bg-kaizen-surface text-xs sm:text-sm"
        />
        <Button type="submit" variant="primary" disabled={isPending || !input.trim()} className="px-4">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
};
