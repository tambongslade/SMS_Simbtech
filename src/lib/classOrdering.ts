// Shared ordering for school classes so every dropdown/list shows them in
// academic order: Form 1 → Form 2 → … → Form 5 → Lower Sixth → Upper Sixth.
//
// Class names in this system are Anglophone Cameroon style ("Form 1" … "Form 5",
// "Lower Sixth", "Upper Sixth"). We rank by parsing the name (the optional `level`
// field is not consistently populated across endpoints), falling back to a
// numeric-aware locale compare for anything unrecognised.

export interface ClassLike {
    id?: number | string | null;
    name?: string | null;
    level?: number | string | null;
}

// Lower rank sorts first. Unrecognised names sort last (Infinity) but keep a
// stable alphabetical order among themselves via the fallback compare.
const classRank = (name: string): number => {
    const n = (name || '').trim().toLowerCase();

    // "Form 1" … "Form 5" (also tolerates "Form1").
    const formMatch = n.match(/form\s*(\d+)/);
    if (formMatch) return parseInt(formMatch[1], 10);

    // Sixth forms come after Form 5.
    if (n.includes('six')) {
        if (n.includes('lower')) return 6;
        if (n.includes('upper')) return 7;
        return 6.5; // bare "Sixth" — between the two
    }

    return Number.POSITIVE_INFINITY;
};

export const compareClasses = (a: ClassLike, b: ClassLike): number => {
    const ra = classRank(a?.name ?? '');
    const rb = classRank(b?.name ?? '');
    if (ra !== rb) return ra - rb;
    // Same rank (or both unrecognised): stable, numeric-aware alphabetical order.
    return (a?.name ?? '').localeCompare(b?.name ?? '', undefined, { numeric: true });
};

// Returns a new, academically-ordered array; never mutates the input.
export const sortClassesByLevel = <T extends ClassLike>(classes: T[] | null | undefined): T[] =>
    [...(classes ?? [])].sort(compareClasses);

// Subclasses (streams) carry a bare name ("A", "North") plus their parent class,
// so rank on the parent class name when we have it and fall back to the subclass
// name itself. Within a class, order by the SSIC stream hierarchy.
export interface SubClassLike extends ClassLike {
    className?: string | null;
    class?: { name?: string | null } | null;
}

// SSIC stream hierarchy: N → MN → M → MS → S → W. Variants seen in seed data
// ("NN" between N and MN, "MW" between S and W) slot in on the same axis.
// Unknown stream codes sort last but stay stable amongst themselves.
const STREAM_RANK: Record<string, number> = {
    N: 1,
    NN: 1.5,
    MN: 2,
    M: 3,
    MS: 4,
    S: 5,
    MW: 5.5,
    W: 6,
};

// Extract the stream code — the last whitespace-separated token in the name,
// uppercased. "FORM 1 MN" → "MN"; "MN" → "MN"; "" → "".
const streamCode = (name: string | null | undefined): string => {
    const parts = (name ?? '').trim().split(/\s+/);
    return (parts[parts.length - 1] || '').toUpperCase();
};

const streamRank = (name: string | null | undefined): number => {
    const code = streamCode(name);
    return STREAM_RANK[code] ?? Number.POSITIVE_INFINITY;
};

export const compareSubClasses = (a: SubClassLike, b: SubClassLike): number => {
    const parent = (s: SubClassLike) => s?.className ?? s?.class?.name ?? s?.name ?? '';
    const byClass = compareClasses({ name: parent(a) }, { name: parent(b) });
    if (byClass !== 0) return byClass;
    const ra = streamRank(a?.name);
    const rb = streamRank(b?.name);
    if (ra !== rb) return ra - rb;
    return (a?.name ?? '').localeCompare(b?.name ?? '', undefined, { numeric: true });
};

// Returns a new, academically-ordered array; never mutates the input.
export const sortSubClassesByLevel = <T extends SubClassLike>(subClasses: T[] | null | undefined): T[] =>
    [...(subClasses ?? [])].sort(compareSubClasses);
