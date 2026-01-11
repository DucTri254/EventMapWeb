import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2d5016',
          light: '#4a7c2a',
          dark: '#1a3009',
        },
        secondary: {
          DEFAULT: '#f0f0f0',
          light: '#f5f5f5',
          dark: '#e0e0e0',
        },
      },
    },
  },
  plugins: [],
}
export default config
