'use client';

import { useEffect, useRef, useState } from 'react';
import { apiService } from '@/lib/apiService';
import ThinkingIndicator from '@/components/ai/ThinkingIndicator';
import {
    SparklesIcon,
    PaperAirplaneIcon,
    ExclamationTriangleIcon,
    CodeBracketIcon,
    BoltIcon,
    CpuChipIcon,
} from '@heroicons/react/24/outline';

interface AskResult {
    question: string;
    answer: string;
    source: 'fast-intent' | 'generated-sql';
    rows: Record<string, unknown>[];
    rowCount: number;
    sql?: string;
    tables?: string[];
    tookMs: number;
    truncated: boolean;
}

interface Entry {
    id: number;
    question: string;
    result?: AskResult;
    error?: string;
    detail?: string;
    pending?: boolean;
}

// Shown as one-tap buttons. Every one of these is answered by a hand-written
// query rather than the model, so they return in milliseconds — worth putting
// in front of the user, since the generated path takes around 25 seconds.
const SUGGESTIONS = [
    'How many students are there?',
    'How many students are in FORM 1?',
    'How many students are owing school fees?',
    'How much have we collected?',
    'How many students in each class?',
    'Gender breakdown',
    'How many teachers do we have?',
];

export default function AskAssistant() {
    const [question, setQuestion] = useState('');
    const [entries, setEntries] = useState<Entry[]>([]);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<{ configured: boolean; modelAvailable: boolean; model: string } | null>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const nextId = useRef(1);

    useEffect(() => {
        apiService
            .get<{ data: { configured: boolean; modelAvailable: boolean; model: string } }>('/ai/status')
            .then(r => setStatus(r.data))
            .catch(() => setStatus(null));
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [entries]);

    async function submit(text: string) {
        const q = text.trim();
        if (!q || busy) return;

        const id = nextId.current++;
        setEntries(prev => [...prev, { id, question: q, pending: true }]);
        setQuestion('');
        setBusy(true);

        try {
            const res = await apiService.post<{ data: AskResult }>('/ai/ask', { question: q });
            setEntries(prev => prev.map(e => (e.id === id ? { id, question: q, result: res.data } : e)));
        } catch (err: unknown) {
            // The API returns 422 with a `detail` explaining why a question could
            // not be answered — a guard refusal, or the database rejecting a
            // hallucinated column. Surfacing it is the difference between "the
            // assistant is broken" and "ask that a different way".
            const e = err as { message?: string; data?: { error?: string; detail?: string } };
            setEntries(prev =>
                prev.map(x =>
                    x.id === id
                        ? { id, question: q, error: e?.data?.error ?? e?.message ?? 'Something went wrong.', detail: e?.data?.detail }
                        : x
                )
            );
        } finally {
            setBusy(false);
        }
    }

    const unavailable = status && (!status.configured || !status.modelAvailable);

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto p-4 sm:p-6">
            <header className="mb-4">
                <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
                    <SparklesIcon className="w-7 h-7 text-indigo-600" />
                    Ask about your school
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                    Questions are answered from live school data. The assistant can only read —
                    it cannot change any record.
                </p>
            </header>

            {unavailable && (
                <div className="mb-4 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                    <span>
                        {!status?.configured
                            ? 'The assistant has no read-only database connection configured.'
                            : `The language model (${status?.model}) is not reachable. Common questions will still work.`}
                    </span>
                </div>
            )}

            {entries.length === 0 && (
                <div className="mb-4">
                    <p className="mb-2 text-sm font-medium text-gray-700">Try one of these:</p>
                    <div className="flex flex-wrap gap-2">
                        {SUGGESTIONS.map(s => (
                            <button
                                key={s}
                                onClick={() => submit(s)}
                                disabled={busy}
                                className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 space-y-4 overflow-y-auto">
                {entries.map(entry => (
                    <div key={entry.id} className="space-y-2">
                        <div className="flex justify-end">
                            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2 text-white">
                                {entry.question}
                            </div>
                        </div>

                        <div className="flex justify-start">
                            <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-4 py-3 shadow-sm">
                                {entry.pending && <ThinkingIndicator />}

                                {entry.error && (
                                    <div className="text-sm">
                                        <p className="font-medium text-red-700">{entry.error}</p>
                                        {entry.detail && (
                                            <p className="mt-1 whitespace-pre-wrap break-words text-xs text-gray-500">
                                                {entry.detail}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {entry.result && (
                                    <>
                                        <p className="text-gray-900">{entry.result.answer}</p>

                                        {entry.result.rowCount > 1 && (
                                            <div className="mt-3 overflow-x-auto">
                                                <table className="min-w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-gray-200 text-left text-gray-500">
                                                            {Object.keys(entry.result.rows[0] ?? {}).map(col => (
                                                                <th key={col} className="px-2 py-1 font-medium capitalize">
                                                                    {col.replace(/_/g, ' ')}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {entry.result.rows.map((row, i) => (
                                                            <tr key={i} className="border-b border-gray-100 last:border-0">
                                                                {Object.values(row).map((v, j) => (
                                                                    <td key={j} className="px-2 py-1 text-gray-800">
                                                                        {typeof v === 'number' ? v.toLocaleString() : String(v ?? '')}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {entry.result.truncated && (
                                                    <p className="mt-1 text-xs text-amber-700">
                                                        Showing the first {entry.result.rowCount} rows only.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                            <span className="inline-flex items-center gap-1">
                                                {entry.result.source === 'fast-intent' ? (
                                                    <><BoltIcon className="w-3.5 h-3.5 text-emerald-600" /> direct query</>
                                                ) : (
                                                    <><CpuChipIcon className="w-3.5 h-3.5 text-indigo-600" /> generated</>
                                                )}
                                            </span>
                                            <span>{entry.result.tookMs.toLocaleString()} ms</span>
                                            {entry.result.sql && (
                                                <details className="w-full">
                                                    <summary className="inline-flex cursor-pointer items-center gap-1 hover:text-gray-700">
                                                        <CodeBracketIcon className="w-3.5 h-3.5" /> show the query
                                                    </summary>
                                                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-2 text-[11px] text-gray-700">
                                                        {entry.result.sql}
                                                    </pre>
                                                </details>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>

            <form
                onSubmit={e => { e.preventDefault(); submit(question); }}
                className="mt-4 flex gap-2"
            >
                <input
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="e.g. How many students are owing school fees?"
                    disabled={busy}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
                />
                <button
                    type="submit"
                    disabled={busy || !question.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-white transition hover:bg-indigo-700 disabled:opacity-40"
                >
                    <PaperAirplaneIcon className="w-4 h-4" />
                    Ask
                </button>
            </form>
        </div>
    );
}
