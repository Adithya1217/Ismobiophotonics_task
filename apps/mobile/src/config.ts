// Android emulator reaches the host machine at 10.0.2.2. Override with EXPO_PUBLIC_API_URL for Render.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000/api';
