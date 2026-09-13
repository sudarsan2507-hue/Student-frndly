import React, { useMemo } from 'react';
import { decaySeries, bandOf, bandColor, AT_RISK } from '../utils/decayCalculations';

const W = 720, H = 220, PAD = { t: 14, r: 104, b: 26, l: 34 };

const toPath = (pts, x, y) =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');

/**
 * Projected retention for every skill over the next `days` days.
 * Pure SVG, scales with its container; label per line at the right edge.
 */
const DecayChart = ({ skills = [], days = 14 }) => {
    const { lines, x, y } = useMemo(() => {
        const x = (d) => PAD.l + (d / days) * (W - PAD.l - PAD.r);
        const y = (v) => PAD.t + (1 - v / 100) * (H - PAD.t - PAD.b);
        const lines = skills.map((s) => {
            const pts = decaySeries(s, 0, days, 0.5);
            const band = bandOf(pts[0].value);
            return { id: s.id, name: s.name, band, pts, end: pts[pts.length - 1].value, start: pts[0].value };
        });
        // Spread end labels apart (min 13px) and keep the whole stack inside the plot
        const GAP = 13, top = PAD.t + 4, bottom = H - PAD.b - 4;
        const sorted = [...lines].sort((a, b) => b.end - a.end);
        let lastY = -Infinity;
        sorted.forEach((l) => { l.labelY = Math.max(y(l.end), lastY + GAP); lastY = l.labelY; });
        const overflow = lastY - bottom;
        if (overflow > 0) {
            // push the stack up from the bottom, never past the top
            let nextY = bottom;
            [...sorted].reverse().forEach((l) => { l.labelY = Math.min(l.labelY, nextY); nextY = l.labelY - GAP; });
            sorted.forEach((l) => { l.labelY = Math.max(l.labelY, top); });
        }
        return { lines, x, y };
    }, [skills, days]);

    if (!skills.length) return null;

    const ticks = [0, 25, 50, 75, 100];
    const dayTicks = [0, 7, days];

    return (
        <div className="decay-projection-scroll">
        <svg className="decay-projection" viewBox={`0 0 ${W} ${H}`} role="img"
            aria-label={`Projected retention for ${skills.length} skills over the next ${days} days`}>
            {ticks.map((t) => (
                <g key={t}>
                    <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="dc-grid" />
                    <text x={PAD.l - 8} y={y(t) + 4} className="dc-tick" textAnchor="end">{t}</text>
                </g>
            ))}
            <line x1={PAD.l} x2={W - PAD.r} y1={y(AT_RISK)} y2={y(AT_RISK)} className="dc-threshold" />
            <text x={PAD.l + 4} y={y(AT_RISK) + 12} className="dc-threshold-label">at risk below {AT_RISK}</text>

            {dayTicks.map((d) => (
                <text key={d} x={x(d)} y={H - 6} className="dc-tick" textAnchor={d === 0 ? 'start' : 'middle'}>
                    {d === 0 ? 'today' : `+${d}d`}
                </text>
            ))}

            {lines.map((l) => (
                <g key={l.id} className={`dc-line dc-${l.band}`}>
                    <path d={toPath(l.pts, x, y)} fill="none" stroke={bandColor[l.band]} strokeWidth="1.75" strokeLinejoin="round" />
                    <circle cx={x(0)} cy={y(l.start)} r="3" fill={bandColor[l.band]} />
                    <text x={W - PAD.r + 6} y={l.labelY + 4} className="dc-label" fill={bandColor[l.band]}>
                        {l.name.length > 14 ? l.name.slice(0, 13) + '…' : l.name}
                    </text>
                </g>
            ))}
        </svg>
        </div>
    );
};

/** Tiny inline curve for list rows: past 14 days → next 14 days. */
export const Sparkline = ({ skill, width = 88, height = 24 }) => {
    const pts = useMemo(() => decaySeries(skill, -14, 14, 1), [skill]);
    const band = bandOf(pts[14].value);
    const x = (d) => ((d + 14) / 28) * width;
    const y = (v) => 2 + (1 - v / 100) * (height - 4);
    return (
        <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
            <line x1={x(0)} x2={x(0)} y1="0" y2={height} className="sp-now" />
            <path d={toPath(pts, x, y)} fill="none" stroke={bandColor[band]} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    );
};

export default DecayChart;
