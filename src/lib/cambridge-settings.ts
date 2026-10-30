export const moduleOrder = ['listening', 'reading', 'writing'] as const;
export const objectiveModules = ['listening', 'reading'] as const;
export const testModuleOrder = ['listening', 'reading', 'writing', 'speaking'] as const;
export type CambridgeSection = typeof testModuleOrder[number];
export const defaultDurations: Record<CambridgeSection, number> = { listening: 30, reading: 60, writing: 60, speaking: 15 };
export function validDurations(value: unknown): value is Partial<Record<CambridgeSection, number>> {
 if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
 return Object.entries(value).every(([k,v]) => testModuleOrder.includes(k as CambridgeSection) && Number.isInteger(v) && v >= 1 && v <= 240);
}
export function selectedModules(modules: string[], selection: string) {
 return moduleOrder.filter(m => modules.includes(m) && (selection === 'full' || selection === m));
}
