'use client';

import React from 'react';

// Validated light-mode palette (see dataviz reference palette).
// Categorical slots are assigned in this fixed order, never cycled.
export const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
export const SEQUENTIAL = '#2a78d6';

// Status colors are reserved for genuine states and always ship with a label.
const STATUS = {
    good: '#0ca30c',
    warning: '#fab219',
    serious: '#ec835a',
    critical: '#d03b3b',
    neutral: '#898781',
};

const GOOD = ['PRESENT', 'COMPLETED', 'ACTIVE', 'ACCEPTED', 'APPROVED', 'PAID', 'READ', 'VERIFIED', 'CALCULATED', 'ENROLLED', 'SUBMITTED', 'RELEASED', 'FINALIZED', 'ASSIGNED_TO_CLASS', 'DELIVERED'];
const WARN = ['PENDING', 'LATE', 'OPEN', 'PARTIAL', 'IN_PROGRESS', 'PENDING_APPROVAL', 'SENT', 'PROCESSING', 'IN_CUSTODY', 'LOCKED', 'DRAFT', 'NOT_ENROLLED'];
const BAD = ['ABSENT', 'FAILED', 'REJECTED', 'CANCELLED', 'DESTROYED', 'INACTIVE', 'OVERDUE', 'NOT_TAUGHT', 'URGENT', 'HIGH'];

export const statusColor = (status: string): string => {
    const s = status.toUpperCase();
    if (GOOD.includes(s)) return STATUS.good;
    if (WARN.includes(s)) return STATUS.warning;
    if (BAD.includes(s)) return STATUS.critical;
    return STATUS.neutral;
};

export const formatLabel = (raw: string) =>
    raw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export const formatMoney = (amount?: number | null) => `FCFA ${(amount ?? 0).toLocaleString()}`;

export const formatNumber = (n?: number | null) => (n ?? 0).toLocaleString();

export const formatPercent = (n?: number | null) => `${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

export const formatRelativeTime = (iso?: string) => {
    if (!iso) return '';
    const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    return new Date(iso).toLocaleString();
};

// ── Stat tiles (KPI numbers are tiles, not charts) ──

export function StatTile({ label, value, sub, tone = 'default' }: {
    label: string;
    value: React.ReactNode;
    sub?: string;
    tone?: 'default' | 'alert';
}) {
    return (
        <div className="min-w-0 rounded-lg border border-gray-100 bg-white p-3">
            <p className="text-xs text-gray-500 truncate" title={label}>{label}</p>
            <p className={`mt-0.5 text-lg font-semibold break-words ${tone === 'alert' ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
    );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">{children}</div>;
}

// ── Horizontal bar list — magnitude comparison, one sequential hue ──

export interface BarRow {
    label: string;
    value: number;
    display?: string; // formatted value (e.g. money); defaults to the number
}

export function BarList({ rows, maxRows = 10 }: { rows: BarRow[]; maxRows?: number }) {
    const shown = rows.slice(0, maxRows);
    const max = Math.max(0, ...shown.map(r => r.value));
    if (shown.length === 0) return <p className="text-sm text-gray-500">No data.</p>;
    return (
        <div className="space-y-2">
            {shown.map(r => (
                <div key={r.label} className="flex items-center gap-3" title={`${r.label}: ${r.display ?? formatNumber(r.value)}`}>
                    <span className="w-32 sm:w-40 shrink-0 text-sm text-gray-600 truncate" title={r.label}>{r.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100">
                        <div className="h-2 rounded-full" style={{ width: `${max > 0 ? Math.max(2, (r.value / max) * 100) : 0}%`, backgroundColor: SEQUENTIAL }} />
                    </div>
                    <span className="w-20 shrink-0 text-right text-sm font-medium text-gray-900 tabular-nums">{r.display ?? formatNumber(r.value)}</span>
                </div>
            ))}
            {rows.length > maxRows && (
                <p className="text-xs text-gray-400">+ {rows.length - maxRows} more</p>
            )}
        </div>
    );
}

// ── Segment bar — part-to-whole as a single 100% stacked bar + legend ──

export interface Segment {
    label: string;
    value: number;
    color: string;
    display?: string;
}

// Assign fixed-order categorical slots; fold the tail past 7 into "Other"
export const toCategoricalSegments = (
    rows: { label: string; value: number; display?: string }[]
): Segment[] => {
    const head = rows.slice(0, 7).map((r, i) => ({ ...r, color: CATEGORICAL[i] }));
    const tail = rows.slice(7);
    if (tail.length > 0) {
        head.push({ label: 'Other', value: tail.reduce((s, r) => s + r.value, 0), display: undefined, color: STATUS.neutral });
    }
    return head;
};

export const toStatusSegments = (rows: { status: string; count: number }[]): Segment[] =>
    rows.map(r => ({ label: formatLabel(r.status), value: r.count, color: statusColor(r.status) }));

export function SegmentBar({ segments, title }: { segments: Segment[]; title?: string }) {
    const total = segments.reduce((s, x) => s + x.value, 0);
    const visible = segments.filter(s => s.value > 0);
    return (
        <div>
            {title && <p className="text-xs font-medium text-gray-500 mb-1.5">{title}</p>}
            {total === 0 ? (
                <p className="text-sm text-gray-500">No data.</p>
            ) : (
                <>
                    {/* 2px gaps between fills (gap-0.5) act as the surface spacer */}
                    <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
                        {visible.map(s => (
                            <div
                                key={s.label}
                                title={`${s.label}: ${s.display ?? formatNumber(s.value)} (${((s.value / total) * 100).toFixed(1)}%)`}
                                className="h-3 first:rounded-l-full last:rounded-r-full"
                                style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color, minWidth: 3 }}
                            />
                        ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {segments.map(s => (
                            <span key={s.label} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                {s.label}
                                <span className="font-medium text-gray-900 tabular-nums">{s.display ?? formatNumber(s.value)}</span>
                            </span>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Donut (pie) chart — part-to-whole with a center total and value legend ──

const polar = (cx: number, cy: number, r: number, angle: number): [number, number] =>
    [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];

// Annular sector path from startAngle to endAngle (radians, clockwise from 12 o'clock)
const arcPath = (cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number) => {
    const a0 = start - Math.PI / 2;
    const a1 = end - Math.PI / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const [x0, y0] = polar(cx, cy, rOuter, a0);
    const [x1, y1] = polar(cx, cy, rOuter, a1);
    const [x2, y2] = polar(cx, cy, rInner, a1);
    const [x3, y3] = polar(cx, cy, rInner, a0);
    return `M ${x0} ${y0} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${rInner} ${rInner} 0 ${large} 0 ${x3} ${y3} Z`;
};

export function DonutChart({ segments, title, centerText, centerSub }: {
    segments: Segment[];
    title?: string;
    centerText?: string; // defaults to the formatted total
    centerSub?: string;
}) {
    const total = segments.reduce((s, x) => s + x.value, 0);
    const visible = segments.filter(s => s.value > 0);
    if (total === 0) {
        return (
            <div>
                {title && <p className="text-xs font-medium text-gray-500 mb-1.5">{title}</p>}
                <p className="text-sm text-gray-500">No data.</p>
            </div>
        );
    }
    // 2px-equivalent surface gap between slices (skip when a single slice fills the ring)
    const pad = visible.length > 1 ? 0.045 : 0;
    let cursor = 0;
    const slices = visible.map(s => {
        const sweep = (s.value / total) * Math.PI * 2;
        const start = cursor + pad / 2;
        const end = Math.max(start, cursor + sweep - pad / 2);
        cursor += sweep;
        return { ...s, start, end };
    });
    return (
        <div>
            {title && <p className="text-xs font-medium text-gray-500 mb-2">{title}</p>}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
                    <svg viewBox="0 0 120 120" className="w-full h-full" role="img" aria-label={title || 'Breakdown'}>
                        {slices.map(s => (
                            <path
                                key={s.label}
                                d={arcPath(60, 60, 56, 36, s.start, s.end)}
                                fill={s.color}
                                className="transition-opacity hover:opacity-75"
                            >
                                <title>{`${s.label}: ${s.display ?? formatNumber(s.value)} (${((s.value / total) * 100).toFixed(1)}%)`}</title>
                            </path>
                        ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
                        <span className="text-sm font-semibold text-gray-900 leading-tight break-words">{centerText ?? formatNumber(total)}</span>
                        {centerSub && <span className="text-[10px] text-gray-400 leading-tight">{centerSub}</span>}
                    </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-1.5">
                    {segments.map(s => (
                        <li key={s.label} className="flex items-center gap-2 text-sm">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-gray-600 truncate min-w-0" title={s.label}>{s.label}</span>
                            <span className="ml-auto shrink-0 font-medium text-gray-900 tabular-nums">{s.display ?? formatNumber(s.value)}</span>
                            <span className="w-12 shrink-0 text-right text-xs text-gray-400 tabular-nums">
                                {total > 0 ? `${((s.value / total) * 100).toFixed(1)}%` : ''}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

// ── Vertical bar (column) chart — magnitude comparison, one sequential hue ──

export function BarChart({ rows, title, maxCols = 8 }: {
    rows: BarRow[];
    title?: string;
    maxCols?: number;
}) {
    const shown = rows.slice(0, maxCols);
    const max = Math.max(0, ...shown.map(r => r.value));
    if (shown.length === 0) {
        return (
            <div>
                {title && <p className="text-xs font-medium text-gray-500 mb-1.5">{title}</p>}
                <p className="text-sm text-gray-500">No data.</p>
            </div>
        );
    }
    return (
        <div>
            {title && <p className="text-xs font-medium text-gray-500 mb-2">{title}</p>}
            <div className="flex items-end gap-2 sm:gap-3 h-40 border-b border-gray-200">
                {shown.map(r => (
                    <div
                        key={r.label}
                        className="flex-1 min-w-0 h-full flex flex-col justify-end items-center"
                        title={`${r.label}: ${r.display ?? formatNumber(r.value)}`}
                    >
                        <span className="text-[11px] font-medium text-gray-700 tabular-nums mb-1 max-w-full truncate">
                            {r.display ?? formatNumber(r.value)}
                        </span>
                        <div
                            className="w-full max-w-[44px] rounded-t transition-opacity hover:opacity-75"
                            style={{
                                // 82% ceiling leaves room for the value label; ratios are preserved
                                height: `${max > 0 ? Math.max(1.5, (r.value / max) * 82) : 0}%`,
                                backgroundColor: SEQUENTIAL,
                            }}
                        />
                    </div>
                ))}
            </div>
            <div className="flex gap-2 sm:gap-3 mt-1.5">
                {shown.map(r => (
                    <span key={r.label} className="flex-1 min-w-0 text-center text-[11px] leading-tight text-gray-500 truncate" title={r.label}>
                        {r.label}
                    </span>
                ))}
            </div>
            {rows.length > maxCols && <p className="mt-1 text-xs text-gray-400">+ {rows.length - maxCols} more</p>}
        </div>
    );
}

// ── Meter — a single ratio against a limit ──

export function Meter({ label, rate, detail, critical = false }: {
    label: string;
    rate: number; // already a percentage
    detail?: string;
    critical?: boolean;
}) {
    const clamped = Math.min(100, Math.max(0, rate));
    return (
        <div>
            <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm text-gray-600">{label}</p>
                <p className={`text-sm font-semibold tabular-nums ${critical ? 'text-red-600' : 'text-gray-900'}`}>{formatPercent(rate)}</p>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-gray-100" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
                <div className="h-2 rounded-full" style={{ width: `${clamped}%`, backgroundColor: critical ? STATUS.critical : SEQUENTIAL }} />
            </div>
            {detail && <p className="mt-1 text-xs text-gray-400">{detail}</p>}
        </div>
    );
}
