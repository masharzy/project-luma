export const moduleOrder = ['listening', 'reading', 'writing'] as const;
export type CambridgeSection = typeof moduleOrder[number];
export const defaultDurations: Record<CambridgeSection, number> = { listening: 30, reading: 60, writing: 60 };
export function validDurations(value: unknown): value is Record<CambridgeSection, number> {
    return !!value && typeof value === 'object' && !Array.isArray(value) && moduleOrder.every(m => Number.isInteger((value as Record<string, unknown>)[m]) && Number((value as Record<string, unknown>)[m]) >= 1 && Number((value as Record<string, unknown>)[m]) <= 240);
}
