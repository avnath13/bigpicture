/** Trigger a client-side download of a generated text file. */
export function downloadTextFile(
  filename: string,
  mimeType: string,
  contents: string,
): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
