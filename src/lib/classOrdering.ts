// Shared ordering for school classes so every dropdown/list shows them in
// academic order: Form 1 → Form 2 → … → Form 5 → Lower Sixth → Upper Sixth.
//
// Class names in this system are Anglophone Cameroon style ("Form 1" … "Form 5",
// "Lower Sixth", "Upper Sixth"). We rank by parsing the name (the optional `level`
// field is not consistently populated across endpoints), falling back to a
// numeric-aware locale compare for anything unrecognised.

export interface ClassLike {
    id?: number | string;
    name?: string;
    level?: number | string;
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
