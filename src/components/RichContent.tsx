import React from 'react';

interface RichContentProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Checks if the content string contains HTML markup.
 */
function hasHtmlMarkup(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

/**
 * Simple sanitizer that strips dangerous tags and attributes (script, iframe, on* handlers)
 * while preserving styling tags like span, mark, b, strong, i, em, u, s, font, a, br, p, div.
 */
function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Remove script and style tags and their contents
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Remove inline on* attributes (onclick, onload, onerror, etc.)
  clean = clean.replace(/\s+on\w+="[^"]*"/gi, '');
  clean = clean.replace(/\s+on\w+='[^']*'/gi, '');
  clean = clean.replace(/\s+on\w+=[^\s>]+/gi, '');

  // Remove javascript: URLs in href/src
  clean = clean.replace(/href=["']?javascript:[^"'>]+/gi, 'href="#"');

  return clean;
}

/**
 * Autolinks plain URLs that aren't inside an <a> tag.
 */
function autoLinkHtml(html: string): string {
  // If already contains <a> tags or plain text
  const urlRegex = /(?<!href=["'])(https?:\/\/[^\s<"']+)/gi;
  return html.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2 hover:opacity-80 break-all" onclick="event.stopPropagation()">${url}</a>`;
  });
}

export function RichContent({ content, className = '', style }: RichContentProps) {
  if (!content) return null;

  const isHtml = hasHtmlMarkup(content);

  if (isHtml) {
    const safeHtml = autoLinkHtml(sanitizeHtml(content));
    return (
      <div
        className={`rich-content break-words leading-relaxed ${className}`}
        style={style}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  // Plain text fallback with URL detection
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);

  return (
    <div className={`whitespace-pre-wrap break-words leading-relaxed ${className}`} style={style}>
      {parts.map((part, i) => {
        if (urlRegex.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80 break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
