import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Bricolage Grotesque', 'ui-sans-serif', 'sans-serif', 'system-ui'],
        serif: ['Castoro', 'ui-serif', 'serif'],
        mono: ['Sometype Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        // Chart colors
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },
        // Message colors
        "message-outbound": "var(--message-outbound)",
        "message-inbound": "var(--message-inbound)", 
        "message-text-outbound": "var(--message-text-outbound)",
        "message-text-inbound": "var(--message-text-inbound)",
        chat: {
          background: "var(--chat-background)",
          header: "var(--chat-header)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      boxShadow: {
        '2xs': 'var(--shadow-2xs)',
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'DEFAULT': 'var(--shadow)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'message': 'var(--shadow-message)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
      },
      transitionTimingFunction: {
        smooth: "var(--transition-smooth)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
            opacity: "0"
          },
          to: {
            height: "var(--radix-accordion-content-height)",
            opacity: "1"
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
            opacity: "1"
          },
          to: {
            height: "0",
            opacity: "0"
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "fade-out": {
          "0%": {
            opacity: "1",
            transform: "translateY(0)"
          },
          "100%": {
            opacity: "0",
            transform: "translateY(10px)"
          }
        },
        "scale-in": {
          "0%": {
            transform: "scale(0.95)",
            opacity: "0"
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1"
          }
        },
        "scale-out": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(0.95)", opacity: "0" }
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" }
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" }
        },
        "slide-in-from-left": {
          "0%": { 
            opacity: "0", 
            transform: "translateX(-20px)"
          },
          "100%": { 
            opacity: "1", 
            transform: "translateX(0)"
          }
        },
        "slide-down": {
          "0%": {
            opacity: "0",
            transform: "translateY(-10px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "slide-out-to-right": {
          "0%": { 
            transform: "translateX(0) scale(1)", 
            opacity: "1", 
            width: "auto" 
          },
          "100%": { 
            transform: "translateX(100%) scale(0.8)", 
            opacity: "0", 
            width: "0" 
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "slide-in-from-left": "slide-in-from-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-down": "slide-down 0.2s ease-out",
        "slide-out-to-right": "slide-out-to-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "enter": "fade-in 0.3s ease-out, scale-in 0.2s ease-out",
        "exit": "fade-out 0.3s ease-out, scale-out 0.2s ease-out"
      },
    },
  },
  plugins: [require("tailwindcss-animate"), function({ addUtilities }) {
    addUtilities({
      '.story-link': {
        position: 'relative',
        display: 'inline-block',
        '&:after': {
          content: "''",
          position: 'absolute',
          width: '100%',
          transform: 'scaleX(0)',
          height: '2px',
          bottom: '0',
          left: '0',
          backgroundColor: 'var(--primary)',
          transformOrigin: 'bottom right',
          transition: 'transform 0.3s ease-out'
        },
        '&:hover:after': {
          transform: 'scaleX(1)',
          transformOrigin: 'bottom left'
        }
      },
      '.hover-scale': {
        transition: 'transform 200ms ease-in-out',
        '&:hover': {
          transform: 'scale(1.05)'
        }
      }
    })
  }],
} satisfies Config;
