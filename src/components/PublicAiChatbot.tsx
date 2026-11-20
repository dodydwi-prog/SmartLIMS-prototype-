import { FormEvent, Fragment, ReactNode, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Bot,
  RotateCcw,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';

export type PublicChatSurface = 'landing' | 'login';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

interface PublicAiChatbotProps {
  pageContext: PublicChatSurface;
}

const MAX_MESSAGE_LENGTH = 500;

const QUICK_PROMPTS: Record<PublicChatSurface, string[]> = {
  landing: [
    'Baku Mutu Air Limbah',
    'Estimasi Biaya & Waktu Sampling',
    'Cara Daftar Akun Pelanggan',
  ],
  login: [
    'Cara Daftar & Verifikasi Email',
    'Gagal Login / Lupa Kata Sandi',
    'Perbedaan Portal Pelanggan & Lab',
  ],
};

function getWelcomeMessage(pageContext: PublicChatSurface): ChatMessage {
  return {
    id: `welcome-${pageContext}`,
    role: 'assistant',
    content:
      pageContext === 'login'
        ? 'Halo, saya **SmartLIMS Assistant**. Ada kendala saat mendaftar badan usaha, memverifikasi email, atau masuk ke portal? Pilih topik cepat di bawah atau ketik pertanyaan Anda.'
        : 'Halo, saya **SmartLIMS Assistant**. Saya siap membantu informasi baku mutu SNI (Air Limbah, Udara Ambien, Emisi, Air Bersih), estimasi biaya sampling, hingga panduan pendaftaran akun.',
  };
}

// XSS-safe inline text renderer supporting **bold**, *italic*, and `code` only (no dangerouslySetInnerHTML)
function renderInlineSafe(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={idx} className="italic text-slate-700">
          {token.slice(1, -1)}
        </em>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={idx}
          className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[11px] text-slate-900"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={idx}>{token}</Fragment>;
  });
}

function SafeAssistantText({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${keyPrefix}`} className="my-1.5 space-y-1 pl-4 list-disc">
        {listItems.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {renderInlineSafe(item)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(`empty-${idx}`);
      return;
    }

    const bulletMatch = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      return;
    }

    flushList(`p-${idx}`);
    blocks.push(
      <p key={`p-${idx}`} className="leading-relaxed not-first:mt-1.5">
        {renderInlineSafe(line)}
      </p>
    );
  });

  flushList('end');
  return <div className="text-[13px] text-slate-700">{blocks}</div>;
}

export function PublicAiChatbot({ pageContext }: PublicAiChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    getWelcomeMessage(pageContext),
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [hasUserChatted, setHasUserChatted] = useState(false);

  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync welcome prompt cleanly when switching between Landing & Login before user chats
  useEffect(() => {
    if (!hasUserChatted) {
      setMessages([getWelcomeMessage(pageContext)]);
    }
  }, [pageContext, hasUserChatted]);

  // Abort active stream cleanly on component unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({
        behavior: streamingMessageId ? 'auto' : 'smooth',
      });
      if (!streamingMessageId) {
        const timer = window.setTimeout(() => {
          inputRef.current?.focus();
        }, 120);
        return () => window.clearTimeout(timer);
      }
    }
  }, [isOpen, messages, isSending, streamingMessageId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isSending) return;
    if (trimmed.length > MAX_MESSAGE_LENGTH) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const historyForApi = messages
      .filter((m) => !m.id.startsWith('welcome-') && !m.isError)
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: m.content.trim().slice(0, 1500),
      }));

    setHasUserChatted(true);
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsSending(true);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const botMsgId = `bot-${Date.now()}`;
    let hasInsertedBotMsg = false;
    let accumulatedText = '';

    const upsertBotText = (nextText: string) => {
      if (!hasInsertedBotMsg) {
        hasInsertedBotMsg = true;
        setStreamingMessageId(botMsgId);
        setMessages((prev) => [
          ...prev,
          {
            id: botMsgId,
            role: 'assistant',
            content: nextText,
          },
        ]);
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === botMsgId ? { ...m, content: nextText } : m))
        );
      }
    };

    const appendErrorBubble = (errorText: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: errorText,
          isError: true,
        },
      ]);
    };

    try {
      const response = await fetch('/api/public-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream, application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          pageContext,
          stream: true,
          history: historyForApi,
        }),
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') ?? '';

      // Path A: Progressive Server-Sent Events (SSE) Streaming
      if (response.ok && contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let streamErrorMessage: string | null = null;

        const processEventBlock = (rawBlock: string) => {
          const lines = rawBlock.split('\n');
          let eventName = 'message';
          const dataLines: string[] = [];

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trim());
            }
          }

          if (dataLines.length === 0) return;
          let payload: Record<string, unknown> = {};
          try {
            payload = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
          } catch {
            return;
          }

          if (eventName === 'delta' && typeof payload.text === 'string') {
            accumulatedText += payload.text;
            upsertBotText(accumulatedText);
          } else if (eventName === 'error' && typeof payload.error === 'string') {
            streamErrorMessage = payload.error;
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const block = buffer.slice(0, boundary).trim();
            buffer = buffer.slice(boundary + 2);
            if (block) processEventBlock(block);
            boundary = buffer.indexOf('\n\n');
          }
        }

        const trailing = (buffer + decoder.decode()).trim();
        if (trailing) {
          processEventBlock(trailing);
        }

        if (streamErrorMessage) {
          appendErrorBubble(streamErrorMessage);
        } else if (!accumulatedText.trim()) {
          appendErrorBubble(
            'Gagal menerima jawaban dari SmartLIMS Assistant. Silakan coba kembali beberapa saat lagi.'
          );
        }
        return;
      }

      // Path B: Standard JSON response (validation/rate-limit errors or non-SSE fallback)
      const data = (await response.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
      };

      if (!response.ok || !data.reply) {
        appendErrorBubble(
          data.error ||
            'Gagal menerima jawaban dari SmartLIMS Assistant. Silakan coba kembali beberapa saat lagi.'
        );
        return;
      }

      upsertBotText(data.reply);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      appendErrorBubble(
        accumulatedText
          ? 'Koneksi terputus saat menerima sisa jawaban. Silakan kirim ulang jika memerlukan kelanjutan.'
          : 'Koneksi ke server asisten terputus. Periksa jaringan internet Anda lalu coba lagi.'
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setStreamingMessageId(null);
      setIsSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(inputValue);
  };

  const handleReset = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStreamingMessageId(null);
    setIsSending(false);
    setHasUserChatted(false);
    setMessages([getWelcomeMessage(pageContext)]);
    setInputValue('');
  };

  const quickPrompts = QUICK_PROMPTS[pageContext];

  return (
    <div className="fixed right-5 bottom-5 z-40 sm:right-6 sm:bottom-6">
      <AnimatePresence>
        {isOpen && (
          <motion.section
            key="smartlims-chat-popover"
            role="dialog"
            aria-label="SmartLIMS Assistant"
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 flex h-[min(520px,calc(100vh-6.5rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Header */}
            <header className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3.5 text-white">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                  <Bot className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-sm font-semibold tracking-tight text-white">
                    SmartLIMS Assistant
                  </h2>
                  <p className="truncate text-[11px] text-slate-300">
                    Panduan ISO 17025 · Gemini AI
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {hasUserChatted && (
                  <button
                    type="button"
                    onClick={handleReset}
                    aria-label="Mulai ulang percakapan"
                    title="Mulai ulang percakapan"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-800 hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Tutup asisten"
                  title="Tutup"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </header>

            {/* Trust Sub-bar (clean unboxed metadata) */}
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              <span className="truncate">
                Panduan Publik Terverifikasi · Tanpa data pribadi (Zero PII)
              </span>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
              aria-live="polite"
            >
              {messages.map((msg) =>
                msg.role === 'user' ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-slate-900 px-3.5 py-2.5 text-[13px] leading-relaxed text-white">
                      {msg.content}
                    </div>
                  </div>
                ) : msg.isError ? (
                  <div key={msg.id} className="flex justify-start">
                    <div
                      role="alert"
                      className="flex max-w-[92%] items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-800"
                    >
                      <AlertCircle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600"
                        aria-hidden="true"
                      />
                      <span>{msg.content}</span>
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex justify-start">
                    <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                      <SafeAssistantText content={msg.content} />
                      {streamingMessageId === msg.id && (
                        <span
                          aria-hidden="true"
                          className="mt-1 inline-block h-3.5 w-1.5 align-middle bg-cyan-600 motion-safe:animate-pulse"
                        />
                      )}
                    </div>
                  </div>
                )
              )}

              {isSending && !streamingMessageId && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
                    <span>Menyusun panduan...</span>
                  </div>
                </div>
              )}

              <div ref={scrollEndRef} />
            </div>

            {/* Contextual Quick Prompts */}
            <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
              <p className="mb-1.5 text-[11px] font-medium text-slate-500">
                Pertanyaan Cepat
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isSending}
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 transition-colors hover:border-cyan-500 hover:bg-cyan-50/60 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-slate-200 bg-white px-3.5 py-3"
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) =>
                    setInputValue(e.target.value.slice(0, MAX_MESSAGE_LENGTH))
                  }
                  disabled={isSending}
                  placeholder={
                    pageContext === 'login'
                      ? 'Tanya kendala daftar atau login...'
                      : 'Tanya baku mutu, biaya, atau alur...'
                  }
                  aria-label="Ketik pertanyaan untuk SmartLIMS Assistant"
                  className="min-h-[42px] flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 disabled:bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={isSending || !inputValue.trim()}
                  aria-label="Kirim pesan"
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg bg-slate-900 text-cyan-400 transition-colors hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {inputValue.length > 380 && (
                <p className="mt-1 text-right font-mono text-[10px] text-slate-400 tabular-nums">
                  {inputValue.length}/{MAX_MESSAGE_LENGTH}
                </p>
              )}
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Tutup SmartLIMS Assistant' : 'Buka SmartLIMS Assistant'}
          className="group flex h-14 items-center gap-2.5 rounded-full bg-slate-900 px-4 text-white shadow-lg ring-1 ring-slate-800 transition-all duration-150 hover:bg-slate-800 hover:ring-4 hover:ring-cyan-500/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/40 cursor-pointer"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-400 transition-colors group-hover:bg-cyan-500/25">
            {isOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Bot className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
          <span className="pr-1 text-xs font-semibold tracking-tight whitespace-nowrap">
            {isOpen ? 'Tutup Asisten' : 'Tanya SmartLIMS'}
          </span>
        </button>
      </div>
    </div>
  );
}
