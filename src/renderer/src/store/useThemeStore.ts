import { create } from 'zustand'

export type ThemeId = 'carbon' | 'dracula' | 'nord' | 'github-light' | 'obsidian-lumina'

export interface ThemeDefinition {
  id: ThemeId
  name: string
  category: 'dark' | 'light'
  isLight: boolean
  description: string
  colors: {
    bgMain: string
    bgSurface: string
    bgElevated: string
    bgHover: string
    borderSubtle: string
    borderActive: string
    textPrimary: string
    textSecondary: string
    textMuted: string
    accent: string
    accentBg: string
    graphBg: string
    graphGrid: string
    editorBg: string
  }
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  carbon: {
    id: 'carbon',
    name: 'Carbon Emerald (Default)',
    category: 'dark',
    isLight: false,
    description: 'Deep carbon black with high-contrast emerald accent',
    colors: {
      bgMain: '#0D0F12',
      bgSurface: '#13161B',
      bgElevated: '#1A1E24',
      bgHover: '#222832',
      borderSubtle: '#22262E',
      borderActive: '#333A46',
      textPrimary: '#F1F5F9',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      accent: '#10B981',
      accentBg: 'rgba(16, 185, 129, 0.15)',
      graphBg: '#0D0F12',
      graphGrid: '#181C24',
      editorBg: '#0D0F12'
    }
  },
  dracula: {
    id: 'dracula',
    name: 'Dracula',
    category: 'dark',
    isLight: false,
    description: 'Iconic open-source vampire theme with purple & pink vibrancy',
    colors: {
      bgMain: '#282a36',
      bgSurface: '#21222c',
      bgElevated: '#343746',
      bgHover: '#44475a',
      borderSubtle: '#44475a',
      borderActive: '#6272a4',
      textPrimary: '#f8f8f2',
      textSecondary: '#bd93f9',
      textMuted: '#6272a4',
      accent: '#bd93f9',
      accentBg: 'rgba(189, 147, 249, 0.18)',
      graphBg: '#282a36',
      graphGrid: '#383a59',
      editorBg: '#282a36'
    }
  },
  nord: {
    id: 'nord',
    name: 'Nordic Frost',
    category: 'dark',
    isLight: false,
    description: 'Arctic, north-bluish palette created for focus and readability',
    colors: {
      bgMain: '#2e3440',
      bgSurface: '#242933',
      bgElevated: '#3b4252',
      bgHover: '#434c5e',
      borderSubtle: '#3b4252',
      borderActive: '#4c566a',
      textPrimary: '#eceff4',
      textSecondary: '#88c0d0',
      textMuted: '#d8dee9',
      accent: '#88c0d0',
      accentBg: 'rgba(136, 192, 208, 0.18)',
      graphBg: '#2e3440',
      graphGrid: '#3b4252',
      editorBg: '#2e3440'
    }
  },
  'github-light': {
    id: 'github-light',
    name: 'GitHub Clean Light',
    category: 'light',
    isLight: true,
    description: 'Pristine, crisp daylight palette with cobalt and emerald markers',
    colors: {
      bgMain: '#ffffff',
      bgSurface: '#f6f8fa',
      bgElevated: '#eaeef2',
      bgHover: '#d0d7de',
      borderSubtle: '#d0d7de',
      borderActive: '#afb8c1',
      textPrimary: '#1f2328',
      textSecondary: '#57606a',
      textMuted: '#6e7781',
      accent: '#0969da',
      accentBg: 'rgba(9, 105, 218, 0.12)',
      graphBg: '#ffffff',
      graphGrid: '#eaeef2',
      editorBg: '#ffffff'
    }
  },
  'obsidian-lumina': {
    id: 'obsidian-lumina',
    name: 'Obsidian Lumina (Stitch)',
    category: 'light',
    isLight: true,
    description: 'Google Stitch design: illuminated crystalline workbench with electric blue & radiant pink',
    colors: {
      bgMain: '#f8f9ff',
      bgSurface: '#eff4ff',
      bgElevated: '#ffffff',
      bgHover: '#e5eeff',
      borderSubtle: '#d3e4fe',
      borderActive: '#2563eb',
      textPrimary: '#0b1c30',
      textSecondary: '#434655',
      textMuted: '#737686',
      accent: '#2563eb',
      accentBg: 'rgba(37, 99, 235, 0.12)',
      graphBg: '#f8f9ff',
      graphGrid: '#dce9ff',
      editorBg: '#ffffff'
    }
  }
}

export type FontId = 'inter' | 'open-sans'

export interface FontDefinition {
  id: FontId
  name: string
  family: string
  description: string
}

export const FONTS: Record<FontId, FontDefinition> = {
  inter: {
    id: 'inter',
    name: 'Inter (Default)',
    family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    description: 'Clean, modern geometric sans designed specifically for screens and code'
  },
  'open-sans': {
    id: 'open-sans',
    name: 'Google Open Sans',
    family: "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    description: 'Friendly, humanist sans-serif optimized for legibility across digital interfaces'
  }
}

interface ThemeState {
  currentTheme: ThemeId
  currentFont: FontId
  setTheme: (theme: ThemeId) => void
  setFont: (font: FontId) => void
}

const STORAGE_KEY = 'ng_active_theme'
const FONT_STORAGE_KEY = 'ng_active_font'

export const useThemeStore = create<ThemeState>((set) => {
  const initialTheme = (localStorage.getItem(STORAGE_KEY) as ThemeId) || 'carbon'
  const initialFont = (localStorage.getItem(FONT_STORAGE_KEY) as FontId) || 'inter'

  return {
    currentTheme: initialTheme,
    currentFont: initialFont,
    setTheme: (themeId) => {
      localStorage.setItem(STORAGE_KEY, themeId)
      set({ currentTheme: themeId })
      applyThemeToDom(themeId)
    },
    setFont: (fontId) => {
      localStorage.setItem(FONT_STORAGE_KEY, fontId)
      set({ currentFont: fontId })
      applyFontToDom(fontId)
    }
  }
})

export function applyFontToDom(fontId: FontId): void {
  const font = FONTS[fontId] || FONTS.inter
  const root = document.documentElement
  root.style.setProperty('--app-font', font.family)
}

export function applyThemeToDom(themeId: ThemeId): void {
  const theme = THEMES[themeId] || THEMES.carbon
  const root = document.documentElement

  root.setAttribute('data-theme', themeId)
  root.style.setProperty('--bg-main', theme.colors.bgMain)
  root.style.setProperty('--bg-surface', theme.colors.bgSurface)
  root.style.setProperty('--bg-elevated', theme.colors.bgElevated)
  root.style.setProperty('--bg-hover', theme.colors.bgHover)
  root.style.setProperty('--border-subtle', theme.colors.borderSubtle)
  root.style.setProperty('--border-active', theme.colors.borderActive)
  root.style.setProperty('--text-primary', theme.colors.textPrimary)
  root.style.setProperty('--text-secondary', theme.colors.textSecondary)
  root.style.setProperty('--text-muted', theme.colors.textMuted)
  root.style.setProperty('--theme-accent', theme.colors.accent)
  root.style.setProperty('--theme-accent-bg', theme.colors.accentBg)
  root.style.setProperty('--graph-bg', theme.colors.graphBg)
  root.style.setProperty('--graph-grid', theme.colors.graphGrid)
  root.style.setProperty('--editor-bg', theme.colors.editorBg)

  if (theme.isLight) {
    root.classList.add('light-theme')
    root.classList.remove('dark-theme')
  } else {
    root.classList.add('dark-theme')
    root.classList.remove('light-theme')
  }

  // Also ensure font is applied
  const storedFont = (localStorage.getItem(FONT_STORAGE_KEY) as FontId) || 'inter'
  applyFontToDom(storedFont)
}

