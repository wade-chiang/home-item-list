type Props = {
  error: Error;
  onRetry: () => void;
};

/** 讀取資料失敗時的畫面。原型沒有這個狀態，首頁與物品頁共用 */
function LoadErrorState({ error, onRetry }: Props) {
  return (
    <div className="mt-10">
      <p className="text-[15px] text-ink-2">讀取資料失敗</p>
      <p className="mt-2 break-all font-mono text-[12.5px] text-ink-3">
        {error.message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl bg-accent px-4 py-2.5 text-[14px] font-medium text-accent-ink"
      >
        重新載入
      </button>
    </div>
  );
}

export default LoadErrorState;
