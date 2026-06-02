/*
  Turns an image File the user picked into a downscaled JPEG data URL.
  Profile photos are stored inside the profile's JSON blob, so we shrink them
  (max edge ~1280px, JPEG) to keep that row from ballooning. Small images are
  passed through untouched.
*/
export async function fileToDataUrl(
  file: File,
  maxDim = 1280,
  quality = 0.82,
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not load image"));
    el.src = dataUrl;
  });

  const longest = Math.max(img.width, img.height);
  const scale = Math.min(1, maxDim / longest);
  // Already small enough — keep the original bytes.
  if (scale === 1 && file.size < 300_000) return dataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
