/** 一個物品都沒有時的畫面。原型沒有這個狀態，首頁與物品頁共用 */
function EmptyItemsState() {
  return (
    <div className="mt-10 text-center">
      <p className="text-[15px] text-ink-2">還沒有任何物品</p>
      <p className="mt-2 text-[13px] text-ink-3">
        點右下角的 ＋ 新增第一樣要管理的耗材
      </p>
    </div>
  );
}

export default EmptyItemsState;
