import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, IconButton, Tooltip, Badge, Collapse } from '@mui/material';
import { Lock, LockOpen, Delete, Download, ExpandMore, ExpandLess } from '@mui/icons-material';

export interface ActivityLogEntry {
  id: string;
  timestamp: string;       // HH:MM:SS
  model: string;           // "Flash" or "Pro"
  analysisType: string;    // "realtime" or "comprehensive"
  phase: 'started' | 'complete' | 'error';
  summary: string;         // one-line summary
  details?: {
    prompt?: string;
    temperature?: number;
    maxTokens?: number;
    thinkingBudget?: number | null;
    ragTools?: string[];
    latencyMs?: number;
    ttftMs?: number | null;
    tokenUsage?: {
      prompt_tokens?: number | null;
      completion_tokens?: number | null;
      total_tokens?: number | null;
      thinking_tokens?: number | null;
    };
    finishReason?: string | null;
    groundingChunks?: number;
    groundingSources?: Array<{ title: string; pages?: string | null }>;
    responseLength?: number;
    jsonParseSuccess?: boolean;
    usedFallback?: boolean;
    triggerPhrase?: boolean;
    resultSummary?: string;  // e.g. "engagement=0.72, alliance=moderate"
  };
}

interface ActivityLogProps {
  entries: ActivityLogEntry[];
  onClear?: () => void;
}

const ActivityLog: React.FC<ActivityLogProps> = ({ entries, onClear }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const handleDownloadLog = () => {
    if (entries.length === 0) return;
    const exportData = entries.map(entry => ({
      timestamp: entry.timestamp,
      model: entry.model,
      analysisType: entry.analysisType,
      phase: entry.phase,
      summary: entry.summary,
      ...(entry.details || {}),
    }));
    const content = JSON.stringify(exportData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llm-activity-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getModelColor = (model: string) => {
    if (model.toLowerCase().includes('flash')) return '#00bcd4';  // cyan
    if (model.toLowerCase().includes('pro')) return '#ab47bc';    // purple
    return '#78909c';
  };

  const getPhaseIcon = (phase: string) => {
    if (phase === 'started') return '\u25B6';  // play triangle
    if (phase === 'complete') return '\u2713';  // checkmark
    if (phase === 'error') return '\u2717';     // X mark
    return '\u2022';
  };

  const getPhaseColor = (phase: string) => {
    if (phase === 'started') return '#ffa726';
    if (phase === 'complete') return '#66bb6a';
    if (phase === 'error') return '#ef5350';
    return '#78909c';
  };

  const getModelShort = (model: string) => {
    if (model.toLowerCase().includes('flash')) return 'Flash';
    if (model.toLowerCase().includes('pro')) return 'Pro';
    return model;
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      borderTop: '1px solid rgba(196, 199, 197, 0.3)',
      mt: 1,
    }}>
      {/* Header — click to collapse/expand */}
      <Box
        onClick={() => setCollapsed(c => !c)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.75,
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {collapsed
            ? <ExpandMore sx={{ fontSize: 16, color: '#78909c' }} />
            : <ExpandLess sx={{ fontSize: 16, color: '#78909c' }} />
          }
          <Typography sx={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#78909c',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            LLM Activity
          </Typography>
          <Badge
            badgeContent={entries.length}
            color="primary"
            max={99}
            sx={{ ml: 1.5, '& .MuiBadge-badge': { fontSize: '9px', height: 16, minWidth: 16 } }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 0.25 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'} arrow>
            <IconButton size="small" onClick={() => setAutoScroll(!autoScroll)} sx={{ p: 0.5 }}>
              {autoScroll
                ? <Lock sx={{ fontSize: 14, color: '#66bb6a' }} />
                : <LockOpen sx={{ fontSize: 14, color: '#78909c' }} />
              }
            </IconButton>
          </Tooltip>
          <Tooltip title="Download log (JSON)" arrow>
            <IconButton size="small" onClick={handleDownloadLog} disabled={entries.length === 0} sx={{ p: 0.5 }}>
              <Download sx={{ fontSize: 14, color: entries.length > 0 ? '#42a5f5' : '#555' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear log" arrow>
            <IconButton size="small" onClick={onClear} sx={{ p: 0.5 }}>
              <Delete sx={{ fontSize: 14, color: '#78909c' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Log entries — collapsible */}
      <Collapse in={!collapsed}>
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#1e1e2e',
          borderRadius: '4px',
          mx: 1,
          mb: 1,
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
          fontSize: '11px',
          lineHeight: 1.5,
          p: 1,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: '#1e1e2e' },
          '&::-webkit-scrollbar-thumb': { background: '#444', borderRadius: 3 },
        }}
      >
        {entries.length === 0 && (
          <Typography sx={{
            color: '#555',
            fontSize: '11px',
            fontFamily: 'inherit',
            textAlign: 'center',
            py: 3,
          }}>
            Waiting for analysis...
          </Typography>
        )}

        {entries.map((entry) => {
          const isExpanded = expandedIds.has(entry.id);
          const modelColor = getModelColor(entry.model);
          const phaseColor = getPhaseColor(entry.phase);

          return (
            <Box
              key={entry.id}
              onClick={() => toggleExpand(entry.id)}
              sx={{
                cursor: 'pointer',
                py: 0.25,
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' },
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              {/* Main line */}
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
                <Typography component="span" sx={{ color: '#555', fontSize: '11px', fontFamily: 'inherit', flexShrink: 0 }}>
                  {entry.timestamp}
                </Typography>
                <Typography component="span" sx={{ color: phaseColor, fontSize: '11px', fontFamily: 'inherit', flexShrink: 0 }}>
                  {getPhaseIcon(entry.phase)}
                </Typography>
                <Typography component="span" sx={{
                  color: modelColor,
                  fontSize: '11px',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {getModelShort(entry.model)}
                </Typography>
                <Typography component="span" sx={{ color: '#999', fontSize: '11px', fontFamily: 'inherit', flexShrink: 0 }}>
                  |
                </Typography>
                <Typography component="span" sx={{ color: '#cdd6f4', fontSize: '11px', fontFamily: 'inherit' }}>
                  {entry.summary}
                </Typography>
              </Box>

              {/* Expanded details */}
              {isExpanded && entry.details && (
                <Box sx={{ pl: '72px', pb: 0.5 }}>
                  {entry.details.prompt && (
                    <DetailLine label="Prompt" value={entry.details.prompt} />
                  )}
                  {entry.details.temperature !== undefined && (
                    <DetailLine label="Config" value={`temp=${entry.details.temperature} | max=${entry.details.maxTokens} tok${entry.details.thinkingBudget ? ` | think=${entry.details.thinkingBudget}` : ''}`} />
                  )}
                  {entry.details.ragTools && entry.details.ragTools.length > 0 && (
                    <DetailLine label="RAG" value={entry.details.ragTools.join(', ')} color="#f9e2af" />
                  )}
                  {entry.details.latencyMs !== undefined && (
                    <DetailLine label="Latency" value={`${entry.details.latencyMs}ms${entry.details.ttftMs ? ` | TTFT: ${entry.details.ttftMs}ms` : ''}`} color={entry.details.latencyMs > 5000 ? '#ef5350' : '#66bb6a'} />
                  )}
                  {entry.details.tokenUsage && (
                    <DetailLine
                      label="Tokens"
                      value={`${entry.details.tokenUsage.prompt_tokens ?? '?'} in \u2192 ${entry.details.tokenUsage.completion_tokens ?? '?'} out (${entry.details.tokenUsage.total_tokens ?? '?'} total)${entry.details.tokenUsage.thinking_tokens ? ` | think: ${entry.details.tokenUsage.thinking_tokens}` : ''}`}
                      color="#89b4fa"
                    />
                  )}
                  {entry.details.groundingChunks !== undefined && (
                    <DetailLine
                      label="Citations"
                      value={`${entry.details.groundingChunks} sources${entry.details.groundingSources ? ': ' + entry.details.groundingSources.map(s => s.title.replace('.pdf', '').substring(0, 30)).join(', ') : ''}`}
                      color="#a6e3a1"
                    />
                  )}
                  {entry.details.finishReason && (
                    <DetailLine label="Finish" value={entry.details.finishReason} color={entry.details.finishReason === 'STOP' ? '#66bb6a' : '#ffa726'} />
                  )}
                  {entry.details.jsonParseSuccess !== undefined && (
                    <DetailLine label="JSON" value={entry.details.jsonParseSuccess ? 'Parsed OK' : 'PARSE FAILED'} color={entry.details.jsonParseSuccess ? '#66bb6a' : '#ef5350'} />
                  )}
                  {entry.details.usedFallback && (
                    <DetailLine label="Fallback" value="Yes - primary prompt failed" color="#ffa726" />
                  )}
                  {entry.details.triggerPhrase !== undefined && (
                    <DetailLine label="Trigger" value={entry.details.triggerPhrase ? 'Phrase detected' : 'No trigger phrase'} />
                  )}
                  {entry.details.resultSummary && (
                    <DetailLine label="Result" value={entry.details.resultSummary} color="#cba6f7" />
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
      </Collapse>
    </Box>
  );
};

const DetailLine: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = '#888' }) => (
  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
    <Typography component="span" sx={{ color: '#555', fontSize: '10px', fontFamily: 'inherit', flexShrink: 0 }}>
      {'\u2514\u2500'}
    </Typography>
    <Typography component="span" sx={{ color: '#666', fontSize: '10px', fontFamily: 'inherit', flexShrink: 0, minWidth: 52 }}>
      {label}:
    </Typography>
    <Typography component="span" sx={{ color, fontSize: '10px', fontFamily: 'inherit', wordBreak: 'break-word' }}>
      {value}
    </Typography>
  </Box>
);

export default ActivityLog;
