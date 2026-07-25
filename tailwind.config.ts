import type { Config } from 'tailwindcss'

/** Paleta única do portal (verde institucional #064E2C). Substitui o `green` padrão do Tailwind em todo o projecto. */
const portalGreen = {
  50: '#F1F8F4',
  100: '#E7F3EB',
  200: '#CFE3D6',
  300: '#A8C4B5',
  400: '#4A7358',
  500: '#0a5e3d',
  600: '#064E2C',
  700: '#04361F',
  800: '#032a18',
  900: '#021f12',
  950: '#01140c',
}

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        green: portalGreen,
        /** Alinhar utilitários `emerald-*` ao mesmo verde (evita mistura com o verde “esmeralda” do Tailwind). */
        emerald: portalGreen,
      },
    },
  },
  plugins: [],
}
export default config













