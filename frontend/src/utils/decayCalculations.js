// Client-side decay calculation utilities.
// Mirrors backend/src/services/skillService.js#calculateCurrentStrength (what /api/skills returns):
//   strength = max(FLOOR, initialProficiency * 0.5^((days / halfLife) * adaptiveDecayMultiplier))

const DAY_MS = 1000 * 60 * 60 * 24;
export const FLOOR = 10;

export const daysSince = (isoDate, now = new Date()) =>
    Math.max(0, (now - new Date(isoDate)) / DAY_MS);

/** Strength of a skill `offsetDays` from now (negative = past, positive = projection). */
export const strengthAt = (skill, offsetDays = 0, now = new Date()) => {
    const initial = Number(skill.initialProficiency) || 50;
    const halfLife = Number(skill.halfLife) || 7;
    const mult = Number(skill.adaptiveDecayMultiplier) || 1;
    const idle = daysSince(skill.lastPracticedAt, now) + offsetDays;
    if (idle <= 0) return Math.max(FLOOR, Math.min(100, initial));
    return Math.max(FLOOR, Math.min(100, initial * Math.pow(0.5, (idle / halfLife) * mult)));
};

/** Array of {day, value} from `from` to `to` days relative to now. */
export const decaySeries = (skill, from = 0, to = 14, step = 1, now = new Date()) => {
    const out = [];
    for (let d = from; d <= to; d += step) out.push({ day: d, value: strengthAt(skill, d, now) });
    return out;
};

/** Days until strength crosses `threshold` (null if already below or never). */
export const daysUntil = (skill, threshold, now = new Date()) => {
    const current = strengthAt(skill, 0, now);
    if (current <= threshold) return null;
    const halfLife = Number(skill.halfLife) || 7;
    const mult = Number(skill.adaptiveDecayMultiplier) || 1;
    // solve current * 0.5^((t/halfLife)*mult) = threshold
    return (halfLife / mult) * Math.log2(current / threshold);
};

/** Retention bands, shared by every page.
 *  Matched to the backend so the same skill never reads "Strong" on one page
 *  and "Fading" on another: knowledgeService treats >= 70 as strong, and
 *  SkillList has always drawn the weak line at 40. */
export const AT_RISK = 40;
export const MASTERED = 70;

export const bandOf = (strength) => {
    if (strength >= MASTERED) return 'strong';
    if (strength >= AT_RISK) return 'fading';
    return 'weak';
};

export const bandLabel = { strong: 'Strong', fading: 'Fading', weak: 'At risk' };

export const bandColor = {
    strong: 'var(--strong)',
    fading: 'var(--fading)',
    weak: 'var(--weak)',
};
