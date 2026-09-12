/** 段落標題加一條分隔線，照原型的 sectDiv() */
function SectionDivider({ title }: { title: string }) {
  return (
    <div className="mb-2.5 mt-6 flex items-center gap-2.5">
      <h2 className="whitespace-nowrap text-[13px] font-semibold tracking-wide text-ink-2">
        {title}
      </h2>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export default SectionDivider;
