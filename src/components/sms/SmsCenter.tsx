'use client';

// Text messages (SMS) to parents — Super Manager and Manager.
// The server checks the Orange bundle, queues the messages and sends them in the background (5 per second);
// this page composes, previews the audience and shows what was sent.

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import apiService from '@/lib/apiService';
import { Button } from '@/components/ui';

type Status = {
  configured: boolean;
  balance: { units: number; expiresAt: string | null } | null;
  balanceError: string | null;
  maxBatch: number;
  maxChars: number;
};
type SubClass = { id: number; name: string };
type Recipient = { phone: string; name: string; userId?: number; students?: string[] };
type HistoryRow = {
  id: number; batchId: string; phone: string; recipientName: string | null; body: string; segments: number;
  status: 'QUEUED' | 'SENT' | 'FAILED'; error: string | null; createdAt: string; sentAt: string | null;
};

// Same counting the server does: plain letters 160 per SMS (153 when split); accents like ê, ç, ô switch to 70 (67).
const GSM7 = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM7_EXT = '^{}\\[~]|€';
function parts(text: string): { parts: number; length: number; unicode: boolean } {
  let len = 0;
  for (const ch of text) {
    if (GSM7.includes(ch)) len += 1;
    else if (GSM7_EXT.includes(ch)) len += 2;
    else { const n = [...text].length; return { parts: n === 0 ? 0 : n <= 70 ? 1 : Math.ceil(n / 67), length: n, unicode: true }; }
  }
  return { parts: len === 0 ? 0 : len <= 160 ? 1 : Math.ceil(len / 153), length: len, unicode: false };
}

const TEMPLATES: { label: string; text: string }[] = [
  { label: 'Fees reminder', text: 'Dear parent, this is a reminder that your child\'s school fees are not yet fully paid. Please settle the balance at the bursar\'s office. Thank you. SSIC' },
  { label: 'Absence alert', text: 'Dear parent, your child was absent from school today. Please contact the school office. SSIC' },
  { label: 'Meeting', text: 'Dear parent, you are invited to a parents\' meeting at the school. Please come on time. SSIC' },
  { label: 'Results ready', text: 'Dear parent, your child\'s results are now available. Please check the SSIC platform or come to the school. SSIC' },
];

const normalizeNumbers = (raw: string): string[] => raw.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);

export default function SmsCenter() {
  const [status, setStatus] = useState<Status | null>(null);
  const [subClasses, setSubClasses] = useState<SubClass[]>([]);
  const [mode, setMode] = useState<'class' | 'all' | 'numbers'>('class');
  const [subClassId, setSubClassId] = useState('');
  const [numbers, setNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [noPhone, setNoPhone] = useState<{ name: string; student: string }[]>([]);
  const [loadedFor, setLoadedFor] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const loadStatus = useCallback(async () => {
    try { setStatus((await apiService.get<{ data: Status }>('/sms/status')).data); }
    catch { setStatus(null); }
  }, []);
  const loadHistory = useCallback(async () => {
    try { setHistory((await apiService.get<{ data: HistoryRow[] }>('/sms/history?limit=200', { silent: true })).data || []); }
    catch { /* keep what is shown */ }
  }, []);

  useEffect(() => {
    loadStatus();
    loadHistory();
    apiService.get<{ data: SubClass[] }>('/classes/sub-classes?limit=200').then((r) => setSubClasses(r.data || [])).catch(() => setSubClasses([]));
  }, [loadStatus, loadHistory]);

  // While messages are being sent, keep the list fresh.
  const sendingNow = history.some((h) => h.status === 'QUEUED');
  useEffect(() => {
    if (!sendingNow) return;
    const t = setInterval(() => { loadHistory(); loadStatus(); }, 4000);
    return () => clearInterval(t);
  }, [sendingNow, loadHistory, loadStatus]);

  const audienceKey = `${mode}:${subClassId}`;
  const loadRecipients = async () => {
    setLoading(true);
    try {
      const body = mode === 'class' ? { subClassId: Number(subClassId) } : {};
      const r = await apiService.post<{ data: { students: number; recipients: Recipient[]; withoutValidPhone: { name: string; student: string }[] } }>('/sms/recipients', body);
      setRecipients(r.data.recipients);
      setNoPhone(r.data.withoutValidPhone);
      setLoadedFor(audienceKey);
    } finally { setLoading(false); }
  };

  const typed = useMemo(() => normalizeNumbers(numbers), [numbers]);
  const list: Recipient[] = mode === 'numbers' ? typed.map((p) => ({ phone: p, name: '' })) : (loadedFor === audienceKey ? recipients : []);
  const count = parts(message);
  const totalSms = list.length * count.parts;
  const balanceUnits = status?.balance?.units;

  const send = async () => {
    if (!list.length || !message.trim()) return;
    const ok = window.confirm(`Send this message to ${list.length} number${list.length === 1 ? '' : 's'}?\nIt will use about ${totalSms} SMS from the bundle.`);
    if (!ok) return;
    setSending(true);
    try {
      const r = await apiService.post<{ data: { queued: number; invalid: { phone: string }[]; duplicates: number } }>('/sms/send', {
        recipients: list.map((x) => ({ phone: x.phone, name: x.name || undefined, userId: x.userId })),
        message: message.trim(),
        purpose: mode === 'numbers' ? 'MANUAL' : 'PARENTS',
      });
      const d = r.data;
      toast.success(`${d.queued} message${d.queued === 1 ? '' : 's'} queued` + (d.invalid.length ? ` · ${d.invalid.length} invalid number${d.invalid.length === 1 ? '' : 's'} skipped` : '') + (d.duplicates ? ` · ${d.duplicates} already sent this text a moment ago` : ''), { duration: 6000 });
      setMessage('');
      await loadHistory();
    } catch { /* apiService already showed the reason */ }
    finally { setSending(false); }
  };

  const retry = async (batchId: string) => {
    try { await apiService.post(`/sms/batches/${batchId}/retry`, {}); toast.success('Sending the failed ones again'); loadHistory(); } catch { /* shown */ }
  };

  const failedBatches = [...new Set(history.filter((h) => h.status === 'FAILED').map((h) => h.batchId))];
  const badge = (s: HistoryRow['status']) =>
    s === 'SENT' ? 'bg-green-100 text-green-800' : s === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800';

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Text Messages (SMS)</h1>
        <p className="text-sm text-gray-600 mt-0.5">Send an SMS to parents. Messages are sent through the school&apos;s Orange SMS bundle.</p>
      </div>

      {status && !status.configured && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Sending is not set up yet. Once the Orange SMS account details are added to the server, this page can send. You can still prepare a message and check the recipients.
        </div>
      )}
      {status?.configured && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm flex flex-wrap items-center gap-x-6 gap-y-1">
          {status.balance
            ? <span><b>{status.balance.units.toLocaleString()}</b> SMS left in the bundle{status.balance.expiresAt ? ` · valid until ${new Date(status.balance.expiresAt).toLocaleDateString()}` : ''}</span>
            : <span className="text-gray-500">{status.balanceError ? `Could not read the bundle (${status.balanceError})` : 'Reading the bundle…'}</span>}
          {balanceUnits !== undefined && balanceUnits < 50 && <span className="text-red-600 font-medium">Low balance — buy a new bundle on the Orange developer site.</span>}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Who gets it</label>
          <div className="flex flex-wrap gap-2">
            {([['class', 'Parents of a class'], ['all', 'All parents'], ['numbers', 'Specific numbers']] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setMode(k)}
                className={`px-3 py-2 rounded-lg text-sm border min-h-[44px] ${mode === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>{label}</button>
            ))}
          </div>
        </div>

        {mode === 'class' && (
          <select value={subClassId} onChange={(e) => setSubClassId(e.target.value)} className="block w-full sm:w-80 rounded-md border border-gray-300 px-3 py-2 text-base bg-white">
            <option value="">Choose a class…</option>
            {subClasses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {mode === 'numbers' && (
          <div>
            <textarea value={numbers} onChange={(e) => setNumbers(e.target.value)} rows={3} placeholder="6 71 23 45 67, 699 12 34 56"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base" />
            <p className="text-xs text-gray-500 mt-1">Separate numbers with commas, spaces or new lines. Cameroon numbers only (+237).</p>
          </div>
        )}
        {mode !== 'numbers' && (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={loadRecipients} disabled={loading || (mode === 'class' && !subClassId)}>
              {loading ? 'Loading…' : 'Show recipients'}
            </Button>
            {loadedFor === audienceKey && (
              <span className="text-sm text-gray-700"><b>{recipients.length}</b> phone number{recipients.length === 1 ? '' : 's'}
                {noPhone.length > 0 && <span className="text-amber-700"> · {noPhone.length} student{noPhone.length === 1 ? '' : 's'} with no usable parent number</span>}</span>
            )}
          </div>
        )}
        {mode !== 'numbers' && loadedFor === audienceKey && recipients.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-blue-700">See the list</summary>
            <ul className="mt-2 max-h-48 overflow-auto divide-y divide-gray-100 border border-gray-100 rounded">
              {recipients.map((r) => (
                <li key={r.phone} className="px-3 py-1.5 flex flex-wrap justify-between gap-2"><span>{r.name} <span className="text-gray-400">({(r.students || []).join(', ')})</span></span><span className="text-gray-500">+{r.phone}</span></li>
              ))}
            </ul>
          </details>
        )}

        <div>
          <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
            <label className="block text-sm font-medium text-gray-700">Message</label>
            <div className="flex flex-wrap gap-1">
              {TEMPLATES.map((t) => (
                <button key={t.label} type="button" onClick={() => setMessage(t.text)} className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">{t.label}</button>
              ))}
            </div>
          </div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={status?.maxChars || 640}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base" placeholder="Write your message…" />
          <p className="text-xs text-gray-500 mt-1">
            {count.length} characters · {count.parts} SMS per recipient
            {count.unicode && <span className="text-amber-700"> · accents like ê, ç, ô make each SMS shorter (70 characters). Avoid them to save credit.</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={send} disabled={sending || !status?.configured || !list.length || !message.trim()}>
            {sending ? 'Queuing…' : `Send to ${list.length} number${list.length === 1 ? '' : 's'}`}
          </Button>
          {list.length > 0 && message.trim() && <span className="text-sm text-gray-600">Uses about <b>{totalSms}</b> SMS{balanceUnits !== undefined && totalSms > balanceUnits ? <span className="text-red-600"> — more than the {balanceUnits} left</span> : ''}</span>}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-2 p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Sent messages</h2>
          <div className="flex gap-2">
            {failedBatches.slice(0, 1).map((b) => <Button key={b} variant="outline" onClick={() => retry(b)}>Retry failed</Button>)}
            <Button variant="outline" onClick={loadHistory}>Refresh</Button>
          </div>
        </div>
        {history.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">Nothing sent yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {history.map((h) => (
              <li key={h.id} className="p-3 sm:p-4 flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge(h.status)}`}>{h.status === 'SENT' ? 'Sent' : h.status === 'FAILED' ? 'Failed' : 'Sending…'}</span>
                  <span className="font-medium text-gray-900">{h.recipientName || `+${h.phone}`}</span>
                  {h.recipientName && <span className="text-gray-500">+{h.phone}</span>}
                  <span className="text-gray-400 ml-auto text-xs">{new Date(h.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{h.body}</p>
                {h.error && <p className="text-xs text-red-600">{h.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
