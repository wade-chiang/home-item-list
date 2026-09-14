// 把備份檔存到使用者的裝置（P2-13）。存檔獨立成這一個函式（P2-13 確認）：
// 網頁版用瀏覽器下載；P3 包成 Capacitor app 後，WebView 預設不處理下載（未實測），
// 要改用檔案系統或分享外掛，那時只換掉這個函式。

export function saveBackupFile(
  filename: string,
  bytes: Uint8Array<ArrayBuffer>,
): void {
  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/zip" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // 下載是非同步開始的，太早釋放網址部分瀏覽器會下載失敗；一分鐘後再釋放
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
