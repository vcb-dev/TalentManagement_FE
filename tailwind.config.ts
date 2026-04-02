import type { Config } from 'tailwindcss'

/** Tailwind v4: chủ yếu cấu hình trong CSS; file này phục vụ IntelliSense & shadcn. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
} satisfies Config
