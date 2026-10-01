import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Split text by lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="space-y-1.5 my-2.5 pl-2">
          {currentList.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-800 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-sbsz-blue shrink-0 mt-2" />
              <span>{renderInlineFormatting(item)}</span>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const renderInlineFormatting = (text: string): React.ReactNode => {
    // Basic bold and code formatting
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\$.*?\$)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-extrabold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="px-1.5 py-0.5 rounded-md bg-slate-100 font-mono text-xs text-sbsz-blue border border-slate-200">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        return (
          <span key={index} className="font-mono font-bold text-sbsz-darkBlue bg-blue-50 px-1 py-0.5 rounded border border-blue-100">
            {part.slice(1, -1)}
          </span>
        );
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***') {
      flushList();
      elements.push(<hr key={index} className="my-4 border-slate-200" />);
      return;
    }

    // Heading 3: ###
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={index} className="text-sm sm:text-base font-extrabold text-slate-900 mt-4 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded bg-sbsz-blue shrink-0" />
          <span>{renderInlineFormatting(trimmed.substring(4))}</span>
        </h4>
      );
      return;
    }

    // Heading 2: ##
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={index} className="text-base sm:text-lg font-black text-slate-900 mt-5 mb-2 pb-1 border-b border-slate-200">
          {renderInlineFormatting(trimmed.substring(3))}
        </h3>
      );
      return;
    }

    // Heading 1: #
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={index} className="text-lg sm:text-xl font-black text-slate-900 mt-5 mb-2">
          {renderInlineFormatting(trimmed.substring(2))}
        </h2>
      );
      return;
    }

    // List item: * or -
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      currentList.push(trimmed.substring(2));
      return;
    }

    // Numbered list item: 1. or 2.
    if (/^\d+\.\s/.test(trimmed)) {
      currentList.push(trimmed.replace(/^\d+\.\s/, ''));
      return;
    }

    // Empty line
    if (!trimmed) {
      flushList();
      return;
    }

    // Regular Paragraph
    flushList();
    elements.push(
      <p key={index} className="text-xs sm:text-sm text-slate-800 leading-relaxed my-2">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-1">{elements}</div>;
};
