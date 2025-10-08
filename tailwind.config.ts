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
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Fira Code', 'SF Mono', 'Consolas', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // WhatsApp specific colors
        "message-outbound": "hsl(var(--message-outbound))",
        "message-inbound": "hsl(var(--message-inbound))", 
        "message-text-outbound": "hsl(var(--message-text-outbound))",
        "message-text-inbound": "hsl(var(--message-text-inbound))",
        chat: {
          background: "hsl(var(--chat-background))",
          header: "hsl(var(--chat-header))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          header: "hsl(var(--sidebar-header))",
        },
        // Gold SaaS theme colors
        gold: {
          primary: "hsl(var(--gold-primary))",
          accent: "hsl(var(--gold-accent))",
          dark: "hsl(var(--gold-dark))",
          light: "hsl(var(--gold-light))",
        },
        neutral: {
          900: "hsl(var(--neutral-900))",
          800: "hsl(var(--neutral-800))",
          700: "hsl(var(--neutral-700))",
          600: "hsl(var(--neutral-600))",
          500: "hsl(var(--neutral-500))",
          400: "hsl(var(--neutral-400))",
          300: "hsl(var(--neutral-300))",
          200: "hsl(var(--neutral-200))",
          100: "hsl(var(--neutral-100))",
        },
        surface: {
          primary: "hsl(var(--surface-primary))",
          secondary: "hsl(var(--surface-secondary))",
          sidebar: "hsl(var(--surface-sidebar))",
          elevated: "hsl(var(--surface-elevated))",
        },
        success: {
          modern: "hsl(var(--success-modern))",
        },
        warning: {
          modern: "hsl(var(--warning-modern))",
        },
        error: {
          modern: "hsl(var(--error-modern))",
        },
        info: {
          modern: "hsl(var(--info-modern))",
        },
      },
      boxShadow: {
        'gold-sm': '0 2px 8px rgba(212, 175, 55, 0.15)',
        'gold-md': '0 4px 16px rgba(212, 175, 55, 0.2)',
        'gold-lg': '0 8px 24px rgba(212, 175, 55, 0.25)',
        'gold-xl': '0 12px 32px rgba(212, 175, 55, 0.3)',
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'elevation-2': '0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12)',
        'elevation-3': '0 10px 20px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.10)',
        'elevation-4': '0 15px 25px rgba(0, 0, 0, 0.15), 0 5px 10px rgba(0, 0, 0, 0.05)',
      },
      fontSize: {
        'display-lg': ['56px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-md': ['48px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-sm': ['40px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.01em' }],
        'heading-xl': ['32px', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-lg': ['28px', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-md': ['24px', { lineHeight: '1.4', fontWeight: '600' }],
        'heading-sm': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-xs': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-subtle": "var(--gradient-subtle)",
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
          backgroundColor: 'hsl(var(--primary))',
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
