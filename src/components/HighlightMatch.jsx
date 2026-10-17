import React from 'react';

/**
 * Highlights matches of the query within the text
 */
export default function HighlightMatch({ text = '', query = '' }) {
  if (!query || !query.trim() || !text) {
    return <span>{text}</span>;
  }

  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return <span>{text}</span>;

  // Escape regex special chars
  const escapedTerms = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

  const parts = String(text).split(regex);

  return (
    <span>
      {parts.map((part, i) => {
        const isMatch = regex.test(part);
        regex.lastIndex = 0; // reset regex state
        return isMatch ? (
          <mark
            key={i}
            className="bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 rounded-xs px-0.5 font-semibold selection:bg-amber-200 dark:selection:bg-amber-900"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </span>
  );
}
