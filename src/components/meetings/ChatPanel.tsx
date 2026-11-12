import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { getSocket } from '../../services/socket';
import { useSocketStore } from '../../stores/socketStore';
import type { ChatMessage, ChatNewPayload } from '../../types/meeting';

interface ChatPanelProps { meetingId: string }

export function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function getMessageDateLabel(dateStr: string, now = new Date()): string {
  const date = new Date(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((today.getTime() - target.getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

function dateKey(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default function ChatPanel({ meetingId }: ChatPanelProps) {
  const { user } = useAuthStore();
  const isConnected = useSocketStore((state) => state.isConnected);
  const { messages, isLoading, error, loadMessages, sendMessage, addMessage } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottom = useRef(true);

  useEffect(() => {
    if (isConnected) void loadMessages(meetingId);
    const socket = getSocket();
    if (!socket) return;
    const onMessage = (payload: ChatNewPayload) => { if (payload.meetingId === meetingId) addMessage(payload, user?.id); };
    const onError = (err: { message: string }) => console.error('Chat error:', err.message);
    socket.on('chat:new', onMessage);
    socket.on('error', onError);
    return () => { socket.off('chat:new', onMessage); socket.off('error', onError); };
  }, [meetingId, loadMessages, addMessage, user?.id, isConnected]);

  useEffect(() => {
    if (shouldStickToBottom.current) messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  const groups = useMemo(() => {
    const result: Array<{ message: ChatMessage; showSender: boolean; showDate: boolean }> = [];
    messages.forEach((message, index) => {
      const previous = messages[index - 1];
      result.push({
        message,
        showDate: !previous || dateKey(previous.createdAt) !== dateKey(message.createdAt),
        showSender: !previous || previous.userId !== message.userId || dateKey(previous.createdAt) !== dateKey(message.createdAt),
      });
    });
    return result;
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    shouldStickToBottom.current = true;
    sendMessage(meetingId, input);
    setInput('');
  };

  return <section aria-label="In-call messages" className="flex min-h-[360px] flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#151622] lg:min-h-0">
    <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3"><h2 className="text-sm font-semibold text-white">In-call messages</h2><span className="text-xs text-slate-400">{messages.length}</span></header>
    <div ref={scrollRef} onScroll={(event) => { const el = event.currentTarget; shouldStickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 72; }} className="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
      {isLoading && messages.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Loading messages…</p>}
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      {!isLoading && messages.length === 0 && !error && <p className="py-8 text-center text-xs text-slate-400">Messages are visible to everyone in the meeting.</p>}
      {groups.map(({ message, showSender, showDate }) => {
        const own = message.userId === user?.id;
        return <div key={message.id}>
          {showDate && <div className="my-4 flex items-center gap-3"><span className="h-px flex-1 bg-white/10"/><span className="text-[10px] font-medium text-slate-500">{getMessageDateLabel(message.createdAt)}</span><span className="h-px flex-1 bg-white/10"/></div>}
          <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl px-3 py-2 ${own ? 'rounded-br-md bg-violet-700/80 text-white' : 'rounded-bl-md bg-slate-800 text-slate-100'}`}>
              {showSender && <div className="mb-1 flex items-baseline justify-between gap-4"><span className={`text-[11px] font-semibold ${own ? 'text-violet-200' : 'text-sky-300'}`}>{own ? 'You' : `${message.user.firstName} ${message.user.lastName}`}</span><time className="text-[10px] text-slate-400">{formatMessageTime(message.createdAt)}</time></div>}
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
              {!showSender && <time className="mt-1 block text-right text-[10px] text-slate-400">{formatMessageTime(message.createdAt)}</time>}
            </div>
          </div>
        </div>;
      })}
      <div ref={messagesEndRef} />
    </div>
    <form onSubmit={(event) => { event.preventDefault(); handleSend(); }} className="shrink-0 border-t border-white/10 p-3">
      <div className="flex items-end gap-2 rounded-2xl border border-slate-700 bg-[#10111A] p-2 focus-within:border-violet-500">
        <textarea aria-label="Message" rows={1} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSend(); } }} placeholder="Send a message" maxLength={2000} className="max-h-28 min-h-9 flex-1 resize-y bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-500" />
        <button type="submit" disabled={!input.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-600 text-white hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500" aria-label="Send message"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/></svg></button>
      </div>
      <p className="mt-1.5 px-2 text-[10px] text-slate-500">Enter to send · Shift+Enter for a new line</p>
    </form>
  </section>;
}
