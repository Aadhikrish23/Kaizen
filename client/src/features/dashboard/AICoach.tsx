import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useInsights, useChatCoach } from '../../services/aiService';
import { MessageSquare, Bot, User as UserIcon, Send } from 'lucide-react';

export const AICoach: React.FC = () => {
  const { data: insights } = useInsights();
  const { mutateAsync: sendMessage, isPending } = useChatCoach();
  const [input, setInput] = useState('');
  const [chat, setChat] = useState<{ role: 'user' | 'coach', text: string }[]>([]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
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
      setChat(prev => [...prev, { role: 'coach', text: 'I am currently offline. Please try again later.' }]);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b border-kaizen-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-kaizen-primary/10 border border-kaizen-primary/20 flex items-center justify-center text-kaizen-primary">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-kaizen-text leading-tight">Training & Nutrition Advisor</h3>
            <p className="text-[11px] text-kaizen-muted font-mono">Personalized guidance based on your daily targets</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-kaizen-primary/10 border-b border-kaizen-border">
        <p className="text-sm text-kaizen-text flex items-start gap-2">
          <Bot className="w-4 h-4 mt-0.5 shrink-0 text-kaizen-primary" />
          <span>{insights?.insight || "Analyzing your data..."}</span>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-64">
        {chat.length === 0 ? (
          <div className="text-center text-sm text-kaizen-muted pt-8 opacity-50">
            Ask me anything about your diet, workouts, or recovery.
          </div>
        ) : (
          chat.map((msg, idx) => (
            <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-kaizen-surface-elevated' : 'bg-kaizen-primary/20'}`}>
                {msg.role === 'user' ? <UserIcon className="w-3 h-3 text-kaizen-text" /> : <Bot className="w-3 h-3 text-kaizen-primary" />}
              </div>
              <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] whitespace-pre-line leading-relaxed ${msg.role === 'user' ? 'bg-kaizen-surface-elevated text-kaizen-text rounded-tr-none' : 'bg-kaizen-surface text-kaizen-text border border-kaizen-border rounded-tl-none'}`}>
                {msg.text}
              </div>
            </div>
          ))
        )}
        {isPending && (
          <div className="flex gap-2">
             <div className="w-6 h-6 rounded-full bg-kaizen-primary/20 flex items-center justify-center shrink-0">
               <Bot className="w-3 h-3 text-kaizen-primary animate-pulse" />
             </div>
             <div className="px-3 py-2 rounded-lg text-sm bg-kaizen-surface text-kaizen-text border border-kaizen-border rounded-tl-none animate-pulse">
               Thinking...
             </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-kaizen-border flex gap-2">
        <Input 
          placeholder="Ask a health question..." 
          value={input} 
          onChange={e => setInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="primary" disabled={isPending || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
};
