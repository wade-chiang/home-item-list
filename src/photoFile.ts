// 上傳前把照片縮小並轉成 JPEG（CLAUDE.md「照片存 JPEG，不是 WebP」、P2-4）。
// 用瀏覽器的 canvas 處理，不是資料存取，所以不放 src/repo/；P3 換成相機外掛時再看要不要沿用。

/** 長邊上限：手機直拍 3–5MB，縮到這個尺寸轉 JPEG 後約 200KB */
export const MAX_LONG_EDGE = 1600;

/** JPEG 品質 */
export const JPEG_QUALITY = 0.8;

/** 等比例縮到長邊不超過 max；本來就比較小的不放大 */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= max) {
    return { width, height };
  }
  const scale = max / longEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/** 瀏覽器讀不了這張照片（例如格式不支援）時丟出 */
export class PhotoDecodeError extends Error {
  constructor() {
    super("讀不到這張照片，可能是格式不支援，請換一張或改用拍照");
    this.name = "PhotoDecodeError";
  }
}

/**
 * 讀進使用者選的照片，縮小並轉成 JPEG。
 *
 * 未實測、要用手機確認的兩點：
 * - iPhone 的 HEIC：瀏覽器解碼不了時會丟出 PhotoDecodeError（iOS 從 <input type="file"> 選照片時通常會先轉成 JPEG）
 * - 直拍照片的方向：imageOrientation: "from-image" 會依照片裡的 EXIF 轉正
 */
export async function toCompressedJpeg(file: Blob): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoDecodeError();
  }

  const size = fitWithin(bitmap.width, bitmap.height, MAX_LONG_EDGE);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (context === null) {
    bitmap.close();
    throw new PhotoDecodeError();
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (blob === null) {
    throw new PhotoDecodeError();
  }
  // 檔名只給 PocketBase 參考，它會自己加上亂數後綴
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
