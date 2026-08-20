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
// name itself. Within a class, order alphabetically/numerically.
export interface SubClassLike extends ClassLike {
    className?: string | null;
    class?: { name?: string | null } | null;
}

export const compareSubClasses = (a: SubClassLike, b: SubClassLike): number => {
    const parent = (s: SubClassLike) => s?.className ?? s?.class?.name ?? s?.name ?? '';
    const byClass = compareClasses({ name: parent(a) }, { name: parent(b) });
    if (byClass !== 0) return byClass;
    return (a?.name ?? '').localeCompare(b?.name ?? '', undefined, { numeric: true });
};

// Returns a new, academically-ordered array; never mutates the input.
export const sortSubClassesByLevel = <T extends SubClassLike>(subClasses: T[] | null | undefined): T[] =>
    [...(subClasses ?? [])].sort(compareSubClasses);
