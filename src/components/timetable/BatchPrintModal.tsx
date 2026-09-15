'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { PrinterIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/components/context/LanguageContext';

export interface BatchPrintSubclassOption {
    id: string;
    name: string;
    className?: string;
}

interface BatchPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    subClasses: BatchPrintSubclassOption[];
    onPrint: (selectedIds: string[]) => Promise<void> | void;
    isPreparing?: boolean;
}

export const BatchPrintModal: React.FC<BatchPrintModalProps> = ({
    isOpen,
    onClose,
    subClasses,
    onPrint,
    isPreparing = false,
}) => {
    const { t } = useLanguage();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSelected(new Set());
            setFilter('');
        }
    }, [isOpen]);

    const grouped = useMemo(() => {
        const term = filter.trim().toLowerCase();
        const map = new Map<string, BatchPrintSubclassOption[]>();
        subClasses
            .filter((sc) => {
                if (!term) return true;
                return (
                    sc.name.toLowerCase().includes(term) ||
                    (sc.className ?? '').toLowerCase().includes(term)
                );
            })
            .forEach((sc) => {
                const key = sc.className ?? 'Other';
                if (!map.has(key)) map.set(key, []);
                map.get(key)!.push(sc);
            });
        map.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [subClasses, filter]);

    const visibleIds = useMemo(
        () => grouped.flatMap(([, list]) => list.map((s) => s.id)),
        [grouped],
    );

    const toggle = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const toggleGroup = (ids: string[]) => {
        const allOn = ids.every((id) => selected.has(id));
        setSelected((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
            return next;
        });
    };

    const selectAllVisible = () => setSelected(new Set(visibleIds));
    const clearSelection = () => setSelected(new Set());

    const handlePrint = async () => {
        if (selected.size === 0 || isPreparing) return;
        await onPrint(Array.from(selected));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('Batch Print Timetables')} size="lg">
            <div className="space-y-3">
                <p className="text-xs text-gray-500 -mt-1">
                    {t('Pick the classes to include — one landscape page per class, fits the whole week on a single A4 page.')}
                </p>

                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                        type="search"
                        placeholder={t('Filter classes…')}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full py-2.5 pl-9 pr-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 font-medium">{selected.size} {t('selected')}</span>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={selectAllVisible}
                            className="text-blue-600 font-medium hover:underline"
                        >
                            {t('Select all')}
                        </button>
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="text-gray-600 font-medium hover:underline"
                        >
                            {t('Clear')}
                        </button>
                    </div>
                </div>

                <div className="max-h-[55vh] overflow-y-auto border rounded-md divide-y">
                    {grouped.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 italic text-center">{t('No classes match.')}</p>
                    ) : (
                        grouped.map(([groupName, items]) => {
                            const ids = items.map((s) => s.id);
                            const allOn = ids.every((id) => selected.has(id));
                            const someOn = !allOn && ids.some((id) => selected.has(id));
                            return (
                                <div key={groupName}>
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(ids)}
                                        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-left"
                                    >
                                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                            {groupName}
                                        </span>
                                        <span
                                            className={`text-xs font-medium ${allOn ? 'text-blue-600' : someOn ? 'text-blue-500' : 'text-gray-400'
                                                }`}
                                        >
                                            {allOn ? t('All selected') : someOn ? t('Some selected') : t('Select all')}
                                        </span>
                                    </button>
                                    {items.map((sc) => {
                                        const checked = selected.has(sc.id);
                                        return (
                                            <label
                                                key={sc.id}
                                                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-blue-50 active:bg-blue-100"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggle(sc.id)}
                                                    className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-900 flex-1">{sc.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="flex flex-col-reverse gap-2 pt-3 border-t sm:flex-row sm:justify-end sm:gap-3">
                    <Button
                        color="secondary"
                        onClick={onClose}
                        disabled={isPreparing}
                        className="w-full sm:w-auto"
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        color="primary"
                        onClick={handlePrint}
                        disabled={selected.size === 0 || isPreparing}
                        className="w-full sm:w-auto"
                    >
                        <PrinterIcon className="h-5 w-5 mr-1 inline" />
                        {isPreparing
                            ? t('Preparing…')
                            : selected.size > 1
                                ? `${t('Print')} ${selected.size} ${t('timetables')}`
                                : t('Print PDF')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
