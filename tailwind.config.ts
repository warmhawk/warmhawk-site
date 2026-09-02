import type { Config } from 'tailwindcss';

// "Warm Signal" palette — exact hex values from the source design artifact
// (KS-LLC/build-sas-products-ideas/1. WarmHawk B2B/warmhawk-full-prototype.html
// `:root`), not an approximation of it. Previous values here were a
// close-but-not-identical hand reinterpretation; corrected to match 1:1,
// including the `amber` accent that didn't exist as a token at all before.
// The prototype's footer uses `--cream-2` (light), not a dark block — its
// own CSS confirms this (`footer{background:var(--cream-2)...}`), so the
// `footer` tokens below are corrected to match rather than kept as the
// previous dark-green palette, which had no source in the artifact.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#F3EEE1',
          elevated: '#EAE1CB',
        },
        paper: '#FBF8F1',
        ink: {
          DEFAULT: '#251D14',
          muted: '#5A4E3F',
        },
        rust: {
          DEFAULT: '#B94B27',
          hover: '#8F3A1E',
          // The compare-table "us" column highlight (artifact: .compare-row .us{background:#FBF3EA}).
          tint: '#FBF3EA',
        },
        'rust-fg': '#FBF8F1',
        amber: '#DE9E38',
        slate: {
          DEFAULT: '#25322B',
          deep: '#1A2420',
          soft: '#B9C3BA',
        },
        border: '#D9CDAF',
        'border-dark': '#3B4A41',
        footer: {
          bg: '#EAE1CB',
          border: '#D9CDAF',
          ink: '#251D14',
        },
        // Exact artifact badge pairs (.badge-green/.badge-amber/.badge-red/.badge-gray) —
        // solid pastel background + a distinct darker text color, not an
        // opacity-derived tint of one color like the previous pass/fail/
        // pending values here.
        pass: { DEFAULT: '#3B6B2E', tint: '#E4EEDE' },
        fail: { DEFAULT: '#A02E1E', tint: '#F7DFDA' },
        pending: { DEFAULT: '#8A5A11', tint: '#FBEBD1' },
        unconfigured: { DEFAULT: '#6B5F4C', tint: '#EAE5D8' },
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        wrap: '1120px',
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
};

export default config;
