/**
 * Thème global de l'application Sign-It - Design épuré noir & blanc
 */
export const theme = {
  colors: {
    // Palette noir & blanc
    background: '#FFFFFF',
    backgroundSecondary: '#F8F9FA',
    card: '#FFFFFF',
    
    // Noir et nuances
    black: '#000000',
    gray900: '#1A1A1A',
    gray800: '#2E2E2E',
    gray700: '#4A4A4A',
    gray600: '#6B6B6B',
    gray500: '#8E8E8E',
    gray400: '#B0B0B0',
    gray300: '#D1D1D1',
    gray200: '#E5E5E5',
    gray100: '#F5F5F5',
    white: '#FFFFFF',
    
    // Couleurs fonctionnelles
    primary: '#000000',
    primaryLight: '#2E2E2E',
    success: '#000000',
    error: '#000000',
    warning: '#000000',
    
    // Texte
    text: '#000000',
    textSecondary: '#6B6B6B',
    textTertiary: '#B0B0B0',
    
    // Bordures
    border: '#E5E5E5',
    borderDark: '#D1D1D1',
    
    disabled: '#D1D1D1',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
  },
  typography: {
    h1: {
      fontSize: 36,
      fontWeight: '700' as const,
      lineHeight: 44,
      color: '#000000',
    },
    h2: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
      color: '#000000',
    },
    h3: {
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 30,
      color: '#000000',
    },
    h4: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 26,
      color: '#000000',
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      color: '#000000',
    },
    bodyMedium: {
      fontSize: 16,
      fontWeight: '500' as const,
      lineHeight: 24,
      color: '#000000',
    },
    small: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
      color: '#6B6B6B',
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      color: '#B0B0B0',
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

export type Theme = typeof theme;
