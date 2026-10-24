export const moduleOrder = ['listening', 'reading', 'writing'] as const;
export type CambridgeSection = typeof moduleOrder[number];
export const defaultDurations: Record<CambridgeSection, number> = { listening: 30, reading: 60, writing: 60 };
export function validDurations(value: unknown): value is Record<CambridgeSection, number> {
    return !!value && typeof value === 'object' && !Array.isArray(value) && moduleOrder.every(m => Number.isInteger((value as Record<string, unknown>)[m]) && Number((value as Record<string, unknown>)[m]) >= 1 && Number((value as Record<string, unknown>)[m]) <= 240);
}
// Speaking has its own room, while the existing written attempt engine keeps three modules.
export const testModuleOrder = [...moduleOrder, 'speaking'] as const;
export type TestSection = typeof testModuleOrder[number];
export const testDefaultDurations: Record<TestSection, number> = {...defaultDurations,speaking:15};
export function validTestDurations(value:unknown):boolean {
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).every(([k,v])=>testModuleOrder.includes(k as TestSection)&&Number.isInteger(v)&&Number(v)>=1&&Number(v)<=240);
}
