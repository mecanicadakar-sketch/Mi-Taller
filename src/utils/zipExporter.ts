import JSZip from 'jszip';

export async function downloadProjectZip() {
  try {
    // Try fetching pre-generated zip first
    const response = await fetch('/proyecto-mitaller.zip');
    if (response.ok && response.headers.get('content-type')?.includes('zip')) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'proyecto-mitaller.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
  } catch (err) {
    console.warn('Pre-generated ZIP fetch failed, falling back to dynamic bundle', err);
  }

  // Fallback: download via direct anchor
  const link = document.createElement('a');
  link.href = '/proyecto-mitaller.zip';
  link.download = 'proyecto-mitaller.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
