import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)"
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)"
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)"
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)"
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          border: "var(--sidebar-border)"
        }
      },
      borderRadius: {
        DEFAULT: "0px",
        none: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        full: "0px"
      },
      fontSize: {
        "xs":   ["0.75rem",  { lineHeight: "1.125rem" }],
        "sm":   ["0.875rem", { lineHeight: "1.375rem" }],
        "base": ["1rem",     { lineHeight: "1.625rem" }],
        "lg":   ["1.125rem", { lineHeight: "1.75rem"  }],
        "xl":   ["1.25rem",  { lineHeight: "1.875rem" }],
        "2xl":  ["1.5rem",   { lineHeight: "2rem"     }],
        "3xl":  ["1.875rem", { lineHeight: "2.25rem"  }],
        "4xl":  ["2.25rem",  { lineHeight: "2.5rem"   }],
        "5xl":  ["3rem",     { lineHeight: "1.15"     }],
        "6xl":  ["3.75rem",  { lineHeight: "1.1"      }],
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"]
      },
      animation: {
        "glow": "glow 2s ease-in-out infinite alternate"
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px hsl(221 83% 53% / 0.3)" },
          "100%": { boxShadow: "0 0 20px hsl(221 83% 53% / 0.5)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
