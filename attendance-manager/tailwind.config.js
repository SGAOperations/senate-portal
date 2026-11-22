/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Every folder that can contain Tailwind class names. Add new UI folders here,
    // or their styles will be purged from the production CSS.
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/providers/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#C8102E',
          dark: '#A8102E',
        },
        vote: {
          yes: '#bbf7d0',
          no: '#fecaca',
          abstain: '#e5e7eb',
          'no-confidence': '#fde68a',
          f1: '#bfdbfe',
          f2: '#ddd6fe',
          f3: '#fbcfe8',
          f4: '#99f6e4',
          f5: '#fed7aa',
        },
      },
    },
  },
  plugins: [],
};
