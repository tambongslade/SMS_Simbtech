import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Role-based colors
    'bg-blue-600',
    'bg-emerald-600',
    'bg-red-600',
    'bg-violet-600',
    'hover:bg-blue-50',
    'hover:bg-emerald-50',
    'hover:bg-red-50',
    'hover:bg-violet-50',
    'hover:text-blue-600',
    'hover:text-emerald-600',
    'hover:text-red-600',
    'hover:text-violet-600',
    'bg-blue-50',
    'bg-emerald-50',
    'bg-red-50',
    'bg-violet-50',
    'text-blue-600',
    'text-emerald-600',
    'text-red-600',
    'text-violet-600',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
    },
  },
  plugins: [],
} satisfies Config;
