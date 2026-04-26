import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          border: "hsl(var(--sidebar-border))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
