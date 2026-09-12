/**
 * 欄位下方的錯誤訊息，樣式照原型「請選擇週期」那段。
 * data-form-error 讓表單送出失敗時可以找到第一個錯誤並捲過去。
 */
function FieldError({ message }: { message: string | undefined }) {
  if (message === undefined) {
    return null;
  }
  return (
    <p
      data-form-error
      className="mt-1.5 text-[12.5px] leading-relaxed text-overdue"
    >
      {message}
    </p>
  );
}

export default FieldError;
