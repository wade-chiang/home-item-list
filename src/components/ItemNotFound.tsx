import { Link } from "react-router";

/** 網址裡的物品不存在時（id 打錯或剛被刪除）。原型沒有這個狀態，詳情頁與編輯頁共用 */
function ItemNotFound() {
  return (
    <div className="mt-10">
      <p className="text-[15px] text-ink-2">找不到這個物品</p>
      <p className="mt-2 text-[13px] text-ink-3">
        可能已經被刪除，或網址有誤。
      </p>
      <Link
        to="/items"
        className="mt-3 inline-block text-[14px] text-accent underline underline-offset-4"
      >
        回物品頁
      </Link>
    </div>
  );
}

export default ItemNotFound;
