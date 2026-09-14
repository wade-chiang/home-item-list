import { describe, expect, it } from "vitest";
import { fitWithin } from "./photoFile.ts";

describe("fitWithin", () => {
  it("直拍照片縮到長邊 1600，保持比例", () => {
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("橫拍照片同樣以長邊為準", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it("本來就比較小的不放大", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});
