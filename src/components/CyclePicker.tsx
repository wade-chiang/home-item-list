import { CYCLE_PRESETS } from "./cyclePresets.ts";
import { chipClass, INPUT_CLASS } from "./formStyles.ts";

export type CycleValue = {
  /** 輸入框的原始值，送出時才驗證 */
  cycle: string;
  customCycle: boolean;
};

type Props = CycleValue & {
  onChange: (next: CycleValue) => void;
};

/**
 * 週期選項：快速選項＋自訂天數。新增物品與換好了面板共用，照原型的 PRE 與 chip()。
 * 選自訂時保留目前的天數，方便在原本的值上修改（照原型）。
 */
function CyclePicker({ cycle, customCycle, onChange }: Props) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {CYCLE_PRESETS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() =>
              onChange({ cycle: String(days), customCycle: false })
            }
            className={chipClass(!customCycle && cycle === String(days), true)}
          >
            {days} 天
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange({ cycle, customCycle: true })}
          className={chipClass(customCycle)}
        >
          自訂
        </button>
      </div>
      {customCycle && (
        <input
          type="number"
          inputMode="numeric"
          aria-label="自訂週期天數"
          value={cycle}
          onChange={(event) =>
            onChange({ cycle: event.target.value, customCycle: true })
          }
          placeholder="天數"
          className={`${INPUT_CLASS} mt-2`}
        />
      )}
    </>
  );
}

export default CyclePicker;
