import { describe, expect, it } from "vitest";
import type { IsoDate } from "../shared/types.ts";
import { buildPause, nextMayFirst, pauseOptionDates } from "./pauseForm.ts";

const d = (value: string) => value as IsoDate;

describe("nextMayFirst", () => {
  it("5/1 之前是今年 5/1", () => {
    expect(nextMayFirst(d("2026-03-15"))).toBe("2026-05-01");
    expect(nextMayFirst(d("2026-04-30"))).toBe("2026-05-01");
  });

  it("5/1 當天與之後是明年 5/1（恢復日要晚於今天）", () => {
    expect(nextMayFirst(d("2026-05-01"))).toBe("2027-05-01");
    expect(nextMayFirst(d("2026-11-20"))).toBe("2027-05-01");
  });
});

describe("pauseOptionDates", () => {
  it("3 個月後是 90 天後", () => {
    expect(pauseOptionDates(d("2026-09-14")).threeMonths).toBe("2026-12-13");
  });
});

describe("buildPause", () => {
  const today = d("2026-09-14");

  it("還沒選時提示先選", () => {
    expect(buildPause(null, "", today)).toEqual({
      ok: false,
      error: "請先選一個恢復時間",
    });
  });

  it("快速選項帶出對應日期", () => {
    expect(buildPause("may", "", today)).toEqual({
      ok: true,
      pausedUntil: "2027-05-01",
    });
  });

  it("指定日期要晚於今天", () => {
    expect(buildPause("custom", "2026-09-14", today).ok).toBe(false);
    expect(buildPause("custom", "", today).ok).toBe(false);
    expect(buildPause("custom", "2026-09-15", today)).toEqual({
      ok: true,
      pausedUntil: "2026-09-15",
    });
  });
});
