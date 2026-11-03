// app/+native-intent.tsx
// Rewrites the incoming system path. When another app opens a calendar file
// with Luchot (Android VIEW intent -> content:// or file:// URI), route it to
// the import screen; everything else passes through unchanged.

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    if (path.startsWith('content://') || path.startsWith('file://')) {
      return `/importIcs?uri=${encodeURIComponent(path)}`;
    }
    return path;
  } catch {
    return '/';
  }
}
