export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    throw new Error('Could not copy to the clipboard. Copy the address bar instead.', {
      cause: error,
    });
  }
}
