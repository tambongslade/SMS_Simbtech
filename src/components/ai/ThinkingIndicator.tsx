'use client';

import { useEffect, useState } from 'react';

/**
 * Shown while a question is being answered.
 *
 * The wait is not uniform: a question matching a hand-written intent returns in
 * milliseconds and this barely appears, while a generated one takes seven to
 * twenty-five seconds on this hardware. A single static dot for that long reads
 * as a hung request, so this shows elapsed time and moves through the stages the
 * backend actually goes through.
 *
 * The stage text is time-based rather than streamed from the server, so it says
 * what is *typically* happening at that point rather than claiming to know.
 * Phrasing is kept honest for that reason — "writing a query" rather than
 * "step 3 of 4".
 */

interface Stage {
    /** Seconds elapsed at which this stage starts. */
    at: number;
    label: string;
}

const STAGES: Stage[] = [
    { at: 0, label: 'Reading your question' },
    { at: 2, label: 'Finding the right tables' },
    { at: 5, label: 'Writing a query' },
    { at: 12, label: 'Still writing — this one is unusual' },
    { at: 22, label: 'Nearly there' },
];

export default function ThinkingIndicator() {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const started = Date.now();
        const id = setInterval(() => setElapsed((Date.now() - started) / 1000), 100);
        return () => clearInterval(id);
    }, []);

    const stage = [...STAGES].reverse().find(s => elapsed >= s.at) ?? STAGES[0];

    return (
        <div className="flex items-center gap-3">
            <ThinkingGlyph />

            <div className="flex flex-col">
                <span
                    // Keyed on the label so React remounts it and the fade
                    // replays on each change, rather than the text swapping
                    // abruptly mid-wait.
                    key={stage.label}
                    className="stage-label text-sm text-gray-700"
                >
                    {stage.label}
                    <span className="inline-block w-6 text-left">
                        <Ellipsis />
                    </span>
                </span>
                {elapsed >= 3 && (
                    <span className="text-xs tabular-nums text-gray-400">
                        {elapsed.toFixed(0)}s
                    </span>
                )}
            </div>

            <style jsx>{`
                .stage-label {
                    animation: fadeIn 400ms ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(2px); }
                    to   { opacity: 1; transform: none; }
                }
            `}</style>
        </div>
    );
}

/** Three dots that fill in turn, so the line reads as active between stages. */
function Ellipsis() {
    return (
        <>
            {[0, 1, 2].map(i => (
                <span
                    key={i}
                    className="dot"
                    style={{ animationDelay: `${i * 0.2}s` }}
                >
                    .
                </span>
            ))}
            <style jsx>{`
                .dot {
                    animation: blink 1.4s ease-in-out infinite;
                }
                @keyframes blink {
                    0%, 60%, 100% { opacity: 0.2; }
                    30%           { opacity: 1; }
                }
            `}</style>
        </>
    );
}

/**
 * A small graph whose nodes pulse and whose edges trace, suggesting a lookup
 * rather than a spinner. Animated with SMIL so it runs on the compositor and
 * costs nothing while the page is otherwise idle — a JS-driven animation would
 * be competing with React state updates for the same twenty seconds.
 */
function ThinkingGlyph() {
    // Positions chosen so the three outer nodes sit around the centre one at
    // roughly equal distance; the eye reads it as a hub rather than a triangle.
    const nodes = [
        { cx: 20, cy: 20, r: 4.5, delay: '0s' },     // hub
        { cx: 8, cy: 9, r: 3, delay: '0.25s' },
        { cx: 33, cy: 12, r: 3, delay: '0.5s' },
        { cx: 12, cy: 32, r: 3, delay: '0.75s' },
        { cx: 31, cy: 31, r: 3, delay: '1s' },
    ];

    return (
        <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            role="img"
            aria-label="Working on your question"
            className="flex-shrink-0"
        >
            {/* Edges from the hub, drawn with a travelling dash so they read as
                signals moving inward rather than static lines. */}
            {nodes.slice(1).map((n, i) => (
                <line
                    key={i}
                    x1={nodes[0].cx}
                    y1={nodes[0].cy}
                    x2={n.cx}
                    y2={n.cy}
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    className="text-indigo-300"
                    strokeDasharray="3 4"
                >
                    <animate
                        attributeName="stroke-dashoffset"
                        from="14"
                        to="0"
                        dur="1.6s"
                        begin={`${i * 0.2}s`}
                        repeatCount="indefinite"
                    />
                </line>
            ))}

            {nodes.map((n, i) => (
                <circle
                    key={i}
                    cx={n.cx}
                    cy={n.cy}
                    r={n.r}
                    fill="currentColor"
                    className={i === 0 ? 'text-indigo-600' : 'text-indigo-400'}
                >
                    <animate
                        attributeName="opacity"
                        values="0.35;1;0.35"
                        dur="1.8s"
                        begin={n.delay}
                        repeatCount="indefinite"
                    />
                    <animate
                        attributeName="r"
                        values={`${n.r};${n.r * 1.25};${n.r}`}
                        dur="1.8s"
                        begin={n.delay}
                        repeatCount="indefinite"
                    />
                </circle>
            ))}
        </svg>
    );
}
