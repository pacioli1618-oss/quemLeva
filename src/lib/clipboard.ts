/**
 * Copies text. Uses the Clipboard API, with a fallback for in-app browsers (WhatsApp, Instagram)
 * that block it. Returns false if neither works, so the screen can tell the person to copy by hand.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const isCopied = document.execCommand('copy');
      area.remove();
      return isCopied;
    } catch {
      return false;
    }
  }
}
