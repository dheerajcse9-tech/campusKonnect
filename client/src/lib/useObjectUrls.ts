import { useEffect, useMemo } from 'react';

/** Object URLs for local files, revoked automatically when the files change or unmount. */
export function useObjectUrls(files: File[]): string[] {
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => urls.forEach((url) => URL.revokeObjectURL(url)), [urls]);
  return urls;
}
