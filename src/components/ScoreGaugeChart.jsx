import { useEffect, useState } from 'react';

const segments = [
  { id: 'critique', label: 'CRITIQUE', desc: 'Action urgente requise', range: '0-30', min: 0, max: 30, color: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.4)', gradient: ['#ef4444', '#dc2626'], percent: 30 },
  { id: 'mauvais', label: 'MAUVAIS', desc: 'Corrections necessaires', range: '30-50', min: 30, max: 50, color: '#f97316', glowColor: 'rgba(249, 115, 22, 0.4)', gradient: ['#f97316', '#ea580c'], percent: 20 },
  { id: 'acceptable', label: 'ACCEPTABLE', desc: 'Ameliorations recommandees', range: '50-75', min: 50, max: 75, color: '#eab308', glowColor: 'rgba(234, 179, 8, 0.4)', gradient: ['#eab308', '#ca8a04'], percent: 25 },
  { id: 'bon', label: 'BON', desc: 'Optimisations mineures', range: '75-90', min: 75, max: 90, color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.4)', gradient: ['#22c55e', '#16a34a'], percent: 15 },
  { id: 'excellent', label: 'EXCELLENT', desc: 'Site tres bien protege', range: '90-100', min: 90, max: 100, color: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.4)', gradient: ['#60a5fa', '#3b82f6'], percent: 10 },
];

const cx = 160;
const cy = 160;
const outerR = 130;
const innerR = 88;
const GAP = 2.5;

function degToRad(deg) {
  return ((deg - 90) * Math.PI) / 180;
}

function polarToCart(cxValue, cyValue, r, angleDeg) {
  const rad = degToRad(angleDeg);
  return { x: cxValue + r * Math.cos(rad), y: cyValue + r * Math.sin(rad) };
}

function describeArc(cxValue, cyValue, outerRadius, innerRadius, startDeg, endDeg) {
  const halfGap = GAP / 2;
  const s = startDeg + halfGap;
  const e = endDeg - halfGap;
  const p1 = polarToCart(cxValue, cyValue, outerRadius, s);
  const p2 = polarToCart(cxValue, cyValue, outerRadius, e);
  const p3 = polarToCart(cxValue, cyValue, innerRadius, e);
  const p4 = polarToCart(cxValue, cyValue, innerRadius, s);
  const large = e - s > 180 ? 1 : 0;

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${large} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

function describeSolidArc(cxValue, cyValue, radius, startDeg, endDeg) {
  const p1 = polarToCart(cxValue, cyValue, radius, startDeg);
  const p2 = polarToCart(cxValue, cyValue, radius, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cxValue} ${cyValue} L ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${large} 1 ${p2.x} ${p2.y} Z`;
}

function getActiveSegment(score) {
  return (
    segments.find((segment) => score >= segment.min && score < segment.max) ||
    (score === 100 ? segments[segments.length - 1] : segments[0])
  );
}

export default function ScoreGaugeChart({
  score,
  compact = false,
  showLegend = true,
  badgeLiftMobile = false,
}) {
  const [currentScore, setCurrentScore] = useState(0);
  const [hoveredSeg, setHoveredSeg] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false, seg: null });
  const activeSegment = getActiveSegment(currentScore);

  useEffect(() => {
    let frameId;
    const duration = compact ? 900 : 1200;
    const start = performance.now();

    function easeOut(t) {
      return 1 - (1 - t) ** 3;
    }

    function update(time) {
      const progress = Math.min((time - start) / duration, 1);
      setCurrentScore(Math.round(easeOut(progress) * score));
      if (progress < 1) {
        frameId = requestAnimationFrame(update);
      }
    }

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [score, compact]);

  const scoreAngle = (currentScore / 100) * 180 - 90;
  const needleLength = outerR + 14;
  const needleBase = innerR - 16;
  const needleTip = polarToCart(cx, cy, needleLength, scoreAngle);
  const needleStart = polarToCart(cx, cy, needleBase, scoreAngle);
  const arrowSize = 9;
  const arrowAngleRad = degToRad(scoreAngle);
  const perpRad = arrowAngleRad + Math.PI / 2;
  const arrowBase1 = {
    x: needleTip.x - Math.cos(arrowAngleRad) * arrowSize + Math.cos(perpRad) * 4,
    y: needleTip.y - Math.sin(arrowAngleRad) * arrowSize + Math.sin(perpRad) * 4,
  };
  const arrowBase2 = {
    x: needleTip.x - Math.cos(arrowAngleRad) * arrowSize - Math.cos(perpRad) * 4,
    y: needleTip.y - Math.sin(arrowAngleRad) * arrowSize - Math.sin(perpRad) * 4,
  };
  const labelPos = polarToCart(cx, cy, outerR + 36, scoreAngle);
  const connectorStart = polarToCart(cx, cy, needleLength + 2, scoreAngle);
  const connectorEnd = polarToCart(cx, cy, outerR + 12, scoreAngle);
  let startAngleAcc = -90;

  const containerClass = compact
    ? 'relative w-[250px] h-[145px] sm:w-[270px] sm:h-[155px] z-10 flex-shrink-0'
    : 'relative w-[300px] h-[160px] sm:w-[320px] sm:h-[180px] z-10 flex-shrink-0';

  const scoreBlockClass = compact
    ? badgeLiftMobile
      ? 'absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pointer-events-none pb-0 translate-y-6 sm:translate-y-10'
      : 'absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pointer-events-none pb-0 translate-y-8 sm:translate-y-10'
    : badgeLiftMobile
    ? 'absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pointer-events-none pb-0 translate-y-8 sm:translate-y-12'
    : 'absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pointer-events-none pb-0 translate-y-10 sm:translate-y-12';

  return (
    <div className={containerClass}>
      <svg
        viewBox="0 0 320 180"
        width="100%"
        height="100%"
        style={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.4))', overflow: 'visible' }}
      >
        <defs>
          {segments.map((seg) => (
            <radialGradient key={seg.id} id={`grad-${seg.id}-${compact ? 'compact' : 'full'}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={seg.gradient[0]} stopOpacity="1" />
              <stop offset="100%" stopColor={seg.gradient[1]} stopOpacity="0.85" />
            </radialGradient>
          ))}
          <filter id={`glow-${compact ? 'compact' : 'full'}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id={`softShadow-${compact ? 'compact' : 'full'}`}>
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>

        <path d={describeSolidArc(cx, cy, outerR + 8, -90, 90)} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <path d={describeArc(cx, cy, outerR, innerR, -90, 90)} fill="rgba(255,255,255,0.03)" />

        {segments.map((seg) => {
          const startAngle = startAngleAcc;
          const endAngle = startAngleAcc + (seg.percent / 100) * 180;
          startAngleAcc = endAngle;

          const isActive = seg.id === activeSegment.id;
          const isHovered = hoveredSeg === seg.id;
          const actualOuter = isActive ? outerR + 6 : outerR;
          const actualInner = isActive ? innerR - 4 : innerR;

          return (
            <g
              key={seg.id}
              className={showLegend ? 'cursor-pointer' : undefined}
              onMouseMove={(e) => {
                if (!showLegend) return;
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltipPos({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  visible: true,
                  seg,
                });
                setHoveredSeg(seg.id);
              }}
              onMouseLeave={() => {
                setTooltipPos((prev) => ({ ...prev, visible: false }));
                setHoveredSeg(null);
              }}
            >
              {isActive && (
                <path
                  d={describeArc(cx, cy, outerR + 5, innerR - 5, startAngle, endAngle)}
                  fill={seg.glowColor}
                  filter={`url(#glow-${compact ? 'compact' : 'full'})`}
                  opacity="0.5"
                />
              )}
              <path
                d={describeArc(cx, cy, actualOuter, actualInner, startAngle, endAngle)}
                fill={isActive ? `url(#grad-${seg.id}-${compact ? 'compact' : 'full'})` : seg.color}
                style={{ transition: 'opacity 0.3s' }}
                opacity={isActive ? 1 : isHovered ? 0.65 : 0.35}
                filter={isActive ? `url(#softShadow-${compact ? 'compact' : 'full'})` : undefined}
              />
              {seg.min > 0 && (
                <g>
                  <line
                    x1={polarToCart(cx, cy, outerR + 12, startAngle).x}
                    y1={polarToCart(cx, cy, outerR + 12, startAngle).y}
                    x2={polarToCart(cx, cy, outerR + 2, startAngle).x}
                    y2={polarToCart(cx, cy, outerR + 2, startAngle).y}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <text
                    x={polarToCart(cx, cy, outerR + 22, startAngle).x}
                    y={polarToCart(cx, cy, outerR + 22, startAngle).y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(255,255,255,0.3)"
                    fontSize="9"
                    fontWeight="600"
                  >
                    {seg.min}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        <path d={describeSolidArc(cx, cy, innerR - 2, -90, 90)} fill="#0d1530" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <path d={describeArc(cx, cy, innerR - 6, innerR - 7, -90, 90)} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

        <line x1={needleStart.x + 2} y1={needleStart.y + 2} x2={needleTip.x + 2} y2={needleTip.y + 2} stroke="rgba(0,0,0,0.4)" strokeWidth="3" strokeLinecap="round" />
        <line x1={needleStart.x} y1={needleStart.y} x2={needleTip.x} y2={needleTip.y} stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={needleStart.x} cy={needleStart.y} r="3.5" fill={activeSegment.color} stroke="#ffffff" strokeWidth="2" />

        <circle cx={needleTip.x} cy={needleTip.y} r="8" fill={activeSegment.glowColor} opacity="0.6" />
        <polygon points={`${needleTip.x},${needleTip.y} ${arrowBase1.x},${arrowBase1.y} ${arrowBase2.x},${arrowBase2.y}`} fill={activeSegment.color} stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />

        <rect x={labelPos.x - 22} y={labelPos.y - 11} width="44" height="22" rx="11" fill={activeSegment.color} opacity="0.9" />
        <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize="12" fontWeight="800" letterSpacing="-0.5">
          {currentScore}
        </text>
        <line x1={connectorStart.x} y1={connectorStart.y} x2={connectorEnd.x} y2={connectorEnd.y} stroke={activeSegment.color} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7" />
      </svg>

      <div className={scoreBlockClass}>
        <div className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-white/40 tracking-[2.5px] uppercase font-semibold mb-1`}>
          Score
        </div>
        <div className={`${compact ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'} font-extrabold leading-none bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent tracking-[-2px]`}>
          {currentScore}
        </div>
        <div className={`${compact ? 'text-xs' : 'text-sm'} text-white/25 font-medium mt-0.5`}>/ 100</div>

        <div
          className={`inline-flex items-center gap-1.5 ${compact ? 'mt-2 sm:mt-3' : 'mt-3'} px-3 py-1 rounded-full border`}
          style={{ backgroundColor: `${activeSegment.color}26`, borderColor: `${activeSegment.color}4D` }}
        >
          <div className="w-[6px] h-[6px] rounded-full animate-pulse" style={{ backgroundColor: activeSegment.color, boxShadow: `0 0 6px ${activeSegment.glowColor}` }} />
          <span className="text-[11px] font-bold tracking-[1px] uppercase" style={{ color: activeSegment.color }}>
            {activeSegment.label}
          </span>
        </div>
      </div>

      {showLegend && tooltipPos.visible && tooltipPos.seg && (
        <div
          className="absolute bg-[#0d1530]/95 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white/85 pointer-events-none whitespace-nowrap z-50 backdrop-blur-md shadow-2xl transition-opacity"
          style={{ left: tooltipPos.x, top: tooltipPos.y - 48, transform: 'translateX(-50%)' }}
        >
          <span style={{ color: tooltipPos.seg.color, fontWeight: 800 }}>{tooltipPos.seg.label}</span>
          <span className="text-white/40 mx-1.5">|</span>
          <span className="text-white/60">{tooltipPos.seg.range}</span>
          <span className="text-white/30 ml-1.5">-</span>
          <span className="text-white/50 ml-1.5 font-normal">{tooltipPos.seg.desc}</span>
        </div>
      )}
    </div>
  );
}
