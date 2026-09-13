import { ChevronLeft } from "lucide-react";
import { useGoBack } from "../navigation.ts";

type Props = {
  title: string;
  /** 有值時顯示返回鍵。沒有上一頁紀錄（直接輸入網址進來）時，返回鍵改去這個網址 */
  backTo?: string;
};

function PageHeader({ title, backTo }: Props) {
  const goBack = useGoBack();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-ground px-4 pb-2.5 pt-3.5">
      {backTo !== undefined && (
        <button
          type="button"
          onClick={() => goBack(backTo)}
          aria-label="返回"
          className="-ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-2"
        >
          <ChevronLeft size={22} strokeWidth={1.75} aria-hidden />
        </button>
      )}
      <h1 className="min-w-0 flex-1 truncate text-[18px] font-semibold">
        {title}
      </h1>
    </header>
  );
}

export default PageHeader;
