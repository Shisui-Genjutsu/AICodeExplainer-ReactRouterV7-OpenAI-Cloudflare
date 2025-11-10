import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { MarkdownRenderer } from './markdown-renderer';

interface TypingAnimationProps {
  text: string;
  speed?: number; // milliseconds per character
  onComplete?: () => void;
  renderMarkdown?: boolean;
}

export interface TypingAnimationRef {
  stop: () => void;
  isComplete: boolean;
}

export const TypingAnimation = forwardRef<TypingAnimationRef, TypingAnimationProps>(({
  text,
  speed = 3, // Increased speed: 3ms per character (was 15ms)
  onComplete,
  renderMarkdown = true,
}, ref) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    stop: () => {
      stoppedRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsComplete(true);
      onComplete?.();
    },
    isComplete,
  }));

  useEffect(() => {
    if (!text) return;

    setDisplayedText('');
    setIsComplete(false);
    stoppedRef.current = false;
    let currentIndex = 0;

    intervalRef.current = setInterval(() => {
      if (stoppedRef.current) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onComplete?.();
      }
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, speed, onComplete]);

  const markdownComponents = {
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
  };

  const content = renderMarkdown ? (
    <MarkdownRenderer components={markdownComponents}>
      {displayedText}
    </MarkdownRenderer>
  ) : (
    displayedText
  );

  return (
    <>
      {content}
      {!isComplete && (
        <span className="inline-block w-0.5 h-4 ml-0.5 bg-current animate-pulse align-middle">|</span>
      )}
    </>
  );
});

TypingAnimation.displayName = 'TypingAnimation';
