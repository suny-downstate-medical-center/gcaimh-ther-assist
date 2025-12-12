// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import { Chip } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Citation } from '../types/types';

interface RenderTextWithCitationsOptions {
  citations: Citation[];
  onCitationClick: (citation: Citation) => void;
  markdown?: boolean;
}

/**
 * Renders text with clickable citation chips
 * @param text - The text containing citation markers like [1], [2], [3, 6, 9]
 * @param options - Options for rendering including citations array and click handler
 * @returns JSX element with rendered text and clickable citations
 */
export const renderTextWithCitations = (
  text: string,
  options: RenderTextWithCitationsOptions
): JSX.Element => {
  const { citations, onCitationClick, markdown = false } = options;
  
  // If markdown is enabled, process markdown first then citations
  if (markdown) {
    // Split text by citation pattern to preserve them
    const segments: { type: 'text' | 'citation'; content: string }[] = [];
    const citationPattern = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
    let lastIndex = 0;
    let match;
    
    while ((match = citationPattern.exec(text)) !== null) {
      // Add text before citation
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }
      
      // Add citation
      segments.push({
        type: 'citation',
        content: match[1]
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }
    
    // If no segments were created, treat entire text as one segment
    if (segments.length === 0) {
      segments.push({
        type: 'text',
        content: text
      });
    }
    
    // Render segments
    return (
      <>
        {segments.map((segment, index) => {
          if (segment.type === 'citation') {
            const citationNumbers = segment.content.split(',').map(num => parseInt(num.trim()));
            
            // Create individual chips for each citation number
            return (
              <React.Fragment key={`citation-group-${index}`}>
                {citationNumbers.map((citationNumber, citIndex) => {
                  const citation = citations.find(c => c.citation_number === citationNumber);
                  
                  return (
                    <Chip
                      key={`citation-${index}-${citIndex}`}
                      label={`[${citationNumber}]`}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (citation) {
                          onCitationClick(citation);
                        }
                      }}
                      sx={{
                        height: 20,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
                        color: 'white',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #00639b 0%, #0b57d0 100%)',
                          transform: 'scale(1.1)',
                        },
                        transition: 'all 0.2s ease',
                        mx: 0.3,
                        verticalAlign: 'middle',
                        display: 'inline-flex',
                      }}
                    />
                  );
                })}
              </React.Fragment>
            );
          } else {
            // Render markdown for text segments
            return (
              <ReactMarkdown
                key={`text-${index}`}
                components={{
                  p: ({ children }) => <span style={{ display: 'inline' }}>{children}</span>,
                  ul: ({ children }) => <ul style={{ display: 'inline-block', marginTop: '0.5em', marginBottom: '0.5em', paddingLeft: '1.5em' }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ display: 'inline-block', marginTop: '0.5em', marginBottom: '0.5em', paddingLeft: '1.5em' }}>{children}</ol>,
                  li: ({ children }) => <li style={{ marginBottom: '0.25em' }}>{children}</li>,
                  strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                  em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                  code: ({ children }) => (
                    <code style={{ 
                      background: 'rgba(0, 0, 0, 0.05)', 
                      padding: '0.1em 0.3em', 
                      borderRadius: '3px',
                      fontSize: '0.9em',
                      fontFamily: 'monospace'
                    }}>
                      {children}
                    </code>
                  ),
                }}
              >
                {segment.content}
              </ReactMarkdown>
            );
          }
        })}
      </>
    );
  }
  
  // Non-markdown version
  const citationPattern = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;
  let keyCounter = 0;

  while ((match = citationPattern.exec(text)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Parse citation numbers
    const citationNumbers = match[1].split(',').map(num => parseInt(num.trim()));
    
    // Create individual clickable citation chips for each number
    const citationChips = citationNumbers.map((citationNumber, citIndex) => {
      const citation = citations.find(c => c.citation_number === citationNumber);
      
      return (
        <Chip
          key={`citation-${keyCounter++}-${citIndex}`}
          label={`[${citationNumber}]`}
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (citation) {
              onCitationClick(citation);
            }
          }}
          sx={{
            height: 20,
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #0b57d0 0%, #00639b 100%)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(135deg, #00639b 0%, #0b57d0 100%)',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.2s ease',
            mx: 0.3,
            verticalAlign: 'middle',
          }}
        />
      );
    });
    
    // Add all citation chips
    parts.push(
      <React.Fragment key={`citation-group-${keyCounter++}`}>
        {citationChips}
      </React.Fragment>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last citation
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // If no citations found, return the original text
  if (parts.length === 0) {
    return <>{text}</>;
  }

  return <>{parts}</>;
};

/**
 * Simple markdown renderer without citation support
 * @param text - The markdown text to render
 * @returns JSX element with rendered markdown
 */
export const renderMarkdown = (text: string): JSX.Element => {
  return (
    <ReactMarkdown
      components={{
        // Customize components as needed
        p: ({ children }) => <span style={{ display: 'block', marginBottom: '0.5em' }}>{children}</span>,
        ul: ({ children }) => <ul style={{ marginTop: '0.5em', marginBottom: '0.5em', paddingLeft: '1.5em' }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ marginTop: '0.5em', marginBottom: '0.5em', paddingLeft: '1.5em' }}>{children}</ol>,
        li: ({ children }) => <li style={{ marginBottom: '0.25em' }}>{children}</li>,
        strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
        em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
        code: ({ children }) => (
          <code style={{ 
            background: 'rgba(0, 0, 0, 0.05)', 
            padding: '0.1em 0.3em', 
            borderRadius: '3px',
            fontSize: '0.9em',
            fontFamily: 'monospace'
          }}>
            {children}
          </code>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
};
