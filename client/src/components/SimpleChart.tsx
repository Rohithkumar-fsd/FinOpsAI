import React from 'react';

interface AreaChartProps {
  data: { label: string; value1: number; value2?: number }[];
  height?: number;
  color1?: string;
  color2?: string;
  label1?: string;
  label2?: string;
  formatValue?: (v: number) => string;
}

export const TrendAreaChart: React.FC<AreaChartProps> = ({
  data,
  height = 200,
  color1 = '#38bdf8',
  color2 = '#10b981',
  label1 = 'Volume',
  label2 = 'Settled',
  formatValue = (v) => `₹${v.toLocaleString()}`,
}) => {
  const chartList = Array.isArray(data) ? data : [];
  if (chartList.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>No data points available</div>;
  }

  const maxVal = Math.max(...chartList.map((d) => Math.max(d.value1 || 0, d.value2 || 0)), 100);
  const width = 600;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points1 = chartList.map((d, i) => {
    const x = padding.left + (i / (chartList.length - 1 || 1)) * chartW;
    const y = padding.top + chartH - ((d.value1 || 0) / maxVal) * chartH;
    return `${x},${y}`;
  });

  const points2 = chartList.map((d, i) => {
    const x = padding.left + (i / (chartList.length - 1 || 1)) * chartW;
    const y = padding.top + chartH - ((d.value2 || 0) / maxVal) * chartH;
    return `${x},${y}`;
  });

  const area1 = `${padding.left},${padding.top + chartH} ${points1.join(' ')} ${padding.left + chartW},${padding.top + chartH}`;
  const area2 = `${padding.left},${padding.top + chartH} ${points2.join(' ')} ${padding.left + chartW},${padding.top + chartH}`;

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: color1 }} />
          <span style={{ color: '#94a3b8' }}>{label1}</span>
        </div>
        {label2 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color2 }} />
            <span style={{ color: '#94a3b8' }}>{label2}</span>
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color1} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color1} stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color2} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color2} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padding.top + chartH * (1 - ratio);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                fill="#64748b"
                fontSize="10"
                textAnchor="end"
                fontFamily="JetBrains Mono"
              >
                {formatValue(Math.round(maxVal * ratio))}
              </text>
            </g>
          );
        })}

        {/* Area 2 */}
        {data[0]?.value2 !== undefined && (
          <>
            <polygon points={area2} fill="url(#grad2)" />
            <polyline points={points2.join(' ')} fill="none" stroke={color2} strokeWidth="2.5" />
          </>
        )}

        {/* Area 1 */}
        <polygon points={area1} fill="url(#grad1)" />
        <polyline points={points1.join(' ')} fill="none" stroke={color1} strokeWidth="2.5" />

        {/* X Axis labels */}
        {data.map((d, i) => {
          if (i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null;
          const x = padding.left + (i / (data.length - 1 || 1)) * chartW;
          return (
            <text
              key={i}
              x={x}
              y={height - 8}
              fill="#64748b"
              fontSize="10"
              textAnchor="middle"
              fontFamily="Inter"
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export const HealthScoreGauge: React.FC<{ score: number }> = ({ score }) => {
  const radius = 68;
  const stroke = 12;
  const normalizedScore = Math.min(Math.max(score, 0), 100);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference * 0.75;

  const getColor = (s: number) => {
    if (s >= 85) return '#10b981';
    if (s >= 65) return '#38bdf8';
    if (s >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getStatusText = (s: number) => {
    if (s >= 85) return 'OPTIMAL HEALTH';
    if (s >= 65) return 'GOOD';
    if (s >= 40) return 'ACTION REQUIRED';
    return 'CRITICAL LEAKAGE';
  };

  const color = getColor(normalizedScore);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <svg width="180" height="150" viewBox="0 0 180 150">
        <circle
          cx="90"
          cy="95"
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset="0"
          strokeLinecap="round"
          transform="rotate(135 90 95)"
        />
        <circle
          cx="90"
          cy="95"
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(135 90 95)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', top: '55px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, color, fontFamily: 'Outfit' }}>
          {normalizedScore}%
        </div>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', color: '#94a3b8' }}>
          {getStatusText(normalizedScore)}
        </div>
      </div>
    </div>
  );
};
