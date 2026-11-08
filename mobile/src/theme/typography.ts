import { Platform, TextStyle } from 'react-native';

export const typography = {
  h1: {
    fontFamily: Platform.select({ ios: 'Iowan Old Style', android: 'serif', default: 'serif' }),
    fontWeight: '600' as TextStyle['fontWeight'],
    fontSize: 24,
    letterSpacing: 0.2,
  },
  h2: {
    fontFamily: Platform.select({ ios: 'Iowan Old Style', android: 'serif', default: 'serif' }),
    fontWeight: '600' as TextStyle['fontWeight'],
    fontSize: 20,
    letterSpacing: 0.2,
  },
  h3: {
    fontFamily: Platform.select({ ios: 'Iowan Old Style', android: 'serif', default: 'serif' }),
    fontWeight: '600' as TextStyle['fontWeight'],
    fontSize: 17,
    letterSpacing: 0.15,
  },
  body: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
    fontSize: 15,
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
    fontSize: 15,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 22,
  },
  caption: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
    fontSize: 13,
    lineHeight: 18,
  },
  small: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
    fontSize: 12,
    lineHeight: 16,
  },
  hud: {
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  button: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
    fontSize: 16,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
};
