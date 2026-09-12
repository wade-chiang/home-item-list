import { Link } from "react-router";
import PageHeader from "../components/PageHeader.tsx";

function NotFoundPage() {
  return (
    <>
      <PageHeader title="找不到這個頁面" />
      <main data-page="not-found" className="flex-1 px-4 pb-44">
        <p className="mt-4 text-[14px] text-ink-2">這個網址沒有對應的畫面。</p>
        <Link
          to="/"
          className="mt-3 inline-block text-[14px] text-accent underline underline-offset-4"
        >
          回首頁
        </Link>
      </main>
    </>
  );
}

export default NotFoundPage;
