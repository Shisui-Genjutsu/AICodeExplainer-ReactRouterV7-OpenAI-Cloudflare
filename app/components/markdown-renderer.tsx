import React, { useState, useEffect } from 'react';

// Lazy load react-markdown only on client side
let ReactMarkdown: any = null;
let remarkGfm: any = null;
let loadError: Error | null = null;

const loadMarkdown = async () => {
  if (typeof window !== 'undefined' && !ReactMarkdown) {
    try {
      const markdown = await import('react-markdown');
      ReactMarkdown = markdown.default;
      
      // Skip remark-gfm for now as it has compatibility issues
      // Basic markdown should be sufficient for code explanations
      remarkGfm = null;
    } catch (error) {
      console.error('Failed to load react-markdown:', error);
      loadError = error as Error;
    }
  }
  return { ReactMarkdown, remarkGfm, loadError };
};

interface MarkdownRendererProps {
  children: string;
  components?: any;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  children,
  components,
}) => {
  const [isClient, setIsClient] = useState(false);
  const [MarkdownComponent, setMarkdownComponent] = useState<any>(null);
  const [GfmPlugin, setGfmPlugin] = useState<any>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsClient(true);
    loadMarkdown().then(({ ReactMarkdown: RM, remarkGfm: GFM, loadError: error }) => {
      if (error) {
        setHasError(true);
      } else {
        setMarkdownComponent(() => RM);
        setGfmPlugin(GFM);
      }
    }).catch((error) => {
      console.error('Error loading markdown:', error);
      setHasError(true);
    });
  }, []);

  if (!isClient || hasError) {
    // Fallback: render plain text during SSR, while loading, or on error
    return <div className="text-sm leading-relaxed whitespace-pre-wrap">{children}</div>;
  }

  if (!MarkdownComponent) {
    // Still loading
    return <div className="text-sm leading-relaxed whitespace-pre-wrap">{children}</div>;
  }

  // Use remark-gfm only if it loaded successfully
  const plugins = GfmPlugin ? [GfmPlugin] : [];

  return (
    <MarkdownComponent remarkPlugins={plugins} components={components}>
      {children}
    </MarkdownComponent>
  );
};

