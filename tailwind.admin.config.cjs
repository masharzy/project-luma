// Admin-only Tailwind. Utilities are scoped under .admin-app and read the --adm-* tokens,
// so light, dark and system themes work without extra classes. Preflight stays off.
const v = name => `var(--adm-${name})`;
module.exports = {
  content: [
    './src/components/admin/**/*.{ts,tsx}',
    './src/app/(management)/admin/**/*.{ts,tsx}',
  ],
  important: '.admin-app',
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        bg: v('bg'), surface: v('surface'), raised: v('raised'), soft: v('soft'), line: v('line'),
        ink: v('text'), muted: v('muted'), accent: v('accent'), 'accent-solid': v('accent-solid'), 'accent-soft': v('accent-soft'),
        'on-solid': v('on-solid'), ok: v('success'), 'ok-soft': v('success-soft'), warn: v('warning'), 'warn-soft': v('warning-soft'),
        info: v('info'), 'info-soft': v('info-soft'),
      },
      borderRadius: { card: '14px' },
      boxShadow: { card: '0 1px 0 rgb(255 255 255 / .04) inset, 0 8px 24px -12px rgb(0 0 0 / .5)' },
    },
  },
};
