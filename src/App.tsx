// 暫時的畫面：只用來確認 Tailwind 與主題色有生效。P1-10 建路由骨架時換掉。
function App() {
  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-ground px-4 py-6">
      <h1 className="text-[18px] font-semibold text-ink">換了沒</h1>
      <p className="mt-2 font-mono text-[13px] text-ink-3">P1-1 骨架</p>
      <div className="mt-4 rounded-2xl border border-line bg-surface p-4 shadow-card">
        <span className="rounded-full bg-overdue-soft px-2 py-0.5 text-[12px] text-overdue">
          逾期
        </span>
      </div>
    </main>
  )
}

export default App
