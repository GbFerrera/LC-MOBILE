import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#236F5D', // Verde azulado principal
    secondary: '#2d8a6b',
    tertiary: '#1a5a4a',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    onSurface: '#1C1B1F',
    onSurfaceVariant: '#757575',
    outline: '#E0E0E0',
    error: '#FF5252',
    success: '#236F5D',
    warning: '#FF9800',
    info: '#236F5D',
  },
  roundness: 12,
};

export const colors = {
  primary: '#236F5D',
  secondary: '#2d8a6b', 
  tertiary: '#1a5a4a',
  background: '#F8F9FA',
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  success: '#236F5D',
  error: '#FF5252',
  warning: '#FF9800',
  info: '#236F5D',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body1: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    lineHeight: 24,
  },
  body2: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    lineHeight: 16,
  },
};
