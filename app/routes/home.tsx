import React, { useState, useRef, useEffect } from 'react';
import { useFetcher } from 'react-router';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Send, Copy, Square, Pencil } from 'lucide-react';
import { TypingAnimation } from '../components/typing-animation';
import type { TypingAnimationRef } from '../components/typing-animation';
import { MarkdownRenderer } from '../components/markdown-renderer';

interface FormData {
  code: string;
  language: string;
}

const LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C++',
  'C#',
  'Go',
  'Rust',
  'PHP',
  'Ruby',
  'Swift',
  'Kotlin',
  'HTML',
  'CSS',
  'SQL',
  'Other',
];

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  language?: string;
  timestamp: Date;
  isTyping?: boolean;
}

const MODEL_NAME = 'GPT-OSS-120B';

const HomePage = () => {
  const fetcher = useFetcher<{ explanation?: string; error?: string; language?: string }>();
  const isSubmitting = fetcher.state === 'submitting';
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingRefs = useRef<Map<string, TypingAnimationRef>>(new Map());
  const { register, handleSubmit, reset, watch, setValue } = useForm<FormData>({
    defaultValues: {
      code: '',
      language: 'JavaScript',
    },
  });

  const codeValue = watch('code');

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add assistant response when fetcher data is received
  useEffect(() => {
    const data = fetcher.data;
    if (!data) return;

    if (data.explanation) {
      const messageId = Date.now().toString();
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          type: 'assistant' as const,
          content: data.explanation || '',
          timestamp: new Date(),
          isTyping: true,
        },
      ]);

      // Mark as complete after typing animation (faster now with 3ms speed)
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isTyping: false } : msg
          )
        );
      }, (data.explanation.length * 3) + 500); // Updated for 3ms speed
    } else if (data.error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'assistant' as const,
          content: `Error: ${data.error}`,
          timestamp: new Date(),
          isTyping: false,
        },
      ]);
    }
  }, [fetcher.data]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const formData = new FormData(form);
    const code = formData.get('code') as string;
    const language = formData.get('language') as string;

    if (!code?.trim()) {
      e.preventDefault();
      return;
    }

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: code,
      language: language,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Reset form (fetcher.Form will handle the submission without navigation)
    reset({ code: '', language: language });
  };

  return (
    <div className="flex flex-col h-full max-h-dvh">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 py-4">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-xl font-semibold font-press-start-2p">CLICK</h1>
        </div>
      </div>

      {/* Messages Area */}
      <div className="overflow-y-auto px-4 py-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Paste your code to get started</h2>
                <p className="text-muted-foreground">
                  Select a language and paste your code below to get an explanation
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                {message.type === 'assistant' && (
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 group ${message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                    }`}
                >
                  {message.type === 'user' && message.language && (
                    <div className="text-xs opacity-70 mb-2 font-medium">
                      {message.language}
                    </div>
                  )}
                  {message.type === 'user' ? (
                    <>
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {message.content}
                      </pre>
                      {/* Action buttons for user messages */}
                      <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(message.content);
                            } catch (err) {
                              console.error('Failed to copy:', err);
                            }
                          }}
                        >
                          <Copy className="size-3" />
                          Copy
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setValue('code', message.content);
                            setValue('language', message.language || 'JavaScript');
                            // Scroll to input
                            document.querySelector('textarea')?.focus();
                          }}
                        >
                          <Pencil className="size-3" />
                          Edit
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="markdown-content text-sm leading-relaxed">
                        {message.isTyping ? (
                          <TypingAnimation
                            ref={(ref) => {
                              if (ref) {
                                typingRefs.current.set(message.id, ref);
                              }
                            }}
                            text={message.content}
                            speed={3}
                            renderMarkdown={true}
                            onComplete={() => {
                              setMessages((prev) =>
                                prev.map((msg) =>
                                  msg.id === message.id
                                    ? { ...msg, isTyping: false }
                                    : msg
                                )
                              );
                            }}
                          />
                        ) : (
                          <MarkdownRenderer
                            components={{
                              p: ({ children }: any) => <p className="mb-4 last:mb-0">{children}</p>,
                              h1: ({ children }: any) => <h1 className="text-2xl font-semibold mb-3 mt-6 first:mt-0">{children}</h1>,
                              h2: ({ children }: any) => <h2 className="text-xl font-semibold mb-2 mt-5 first:mt-0">{children}</h2>,
                              h3: ({ children }: any) => <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0">{children}</h3>,
                              ul: ({ children }: any) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                              ol: ({ children }: any) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                              li: ({ children }: any) => <li className="ml-4">{children}</li>,
                              code: ({ children, className }: any) => {
                                const isInline = !className;
                                return isInline ? (
                                  <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                                ) : (
                                  <code className={className}>{children}</code>
                                );
                              },
                              pre: ({ children }: any) => (
                                <pre className="bg-muted border border-border rounded-lg p-4 overflow-x-auto mb-4">
                                  {children}
                                </pre>
                              ),
                              blockquote: ({ children }: any) => (
                                <blockquote className="border-l-4 border-border pl-4 italic text-muted-foreground my-4">
                                  {children}
                                </blockquote>
                              ),
                              a: ({ children, href }: any) => (
                                <a href={href} className="text-primary underline underline-offset-4 hover:text-primary/80">
                                  {children}
                                </a>
                              ),
                              strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
                              em: ({ children }: any) => <em className="italic">{children}</em>,
                            }}
                          >
                            {message.content}
                          </MarkdownRenderer>
                        )}
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {message.isTyping ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              const typingRef = typingRefs.current.get(message.id);
                              if (typingRef) {
                                typingRef.stop();
                                setMessages((prev) =>
                                  prev.map((msg) =>
                                    msg.id === message.id
                                      ? { ...msg, isTyping: false }
                                      : msg
                                  )
                                );
                              }
                            }}
                          >
                            <Square className="size-3" />
                            Stop
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(message.content);
                                  // You could add a toast notification here
                                } catch (err) {
                                  console.error('Failed to copy:', err);
                                }
                              }}
                            >
                              <Copy className="size-3" />
                              Copy
                            </Button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {message.type === 'user' && (
                  <div className="shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-sm font-semibold">
                    U
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-background">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <fetcher.Form
            method="post"
            action="/explain-code"
            onSubmit={onSubmit}
          >
            <div className="space-y-3">
              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <label htmlFor="language" className="text-sm font-medium text-muted-foreground">
                  Language:
                </label>
                <select
                  {...register('language')}
                  id="language"
                  className="px-3 py-1.5 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* Code Input */}
              <div className="relative">
                <textarea
                  {...register('code', { required: true })}
                  placeholder="Paste your code here..."
                  rows={8}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none font-mono text-sm"
                />
              </div>

              {/* Send Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!codeValue?.trim() || isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Explaining...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </fetcher.Form>

          {/* Model Name */}
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Powered by <span className="font-semibold">Bhaskar Guthula</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
