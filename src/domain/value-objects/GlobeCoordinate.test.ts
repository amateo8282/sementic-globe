import { describe, it, expect } from "vitest";
import { GlobeCoordinate } from "./GlobeCoordinate";

describe("GlobeCoordinate", () => {
  it("유효한 위도/경도로 생성할 수 있다", () => {
    const coord = GlobeCoordinate.create(37.5665, 126.978);
    expect(coord.lat).toBe(37.5665);
    expect(coord.lng).toBe(126.978);
  });

  it("경계값(0, 0)으로 생성할 수 있다", () => {
    const coord = GlobeCoordinate.create(0, 0);
    expect(coord.lat).toBe(0);
    expect(coord.lng).toBe(0);
  });

  it("최대 경계값으로 생성할 수 있다", () => {
    const coord = GlobeCoordinate.create(90, 180);
    expect(coord.lat).toBe(90);
    expect(coord.lng).toBe(180);
  });

  it("최소 경계값으로 생성할 수 있다", () => {
    const coord = GlobeCoordinate.create(-90, -180);
    expect(coord.lat).toBe(-90);
    expect(coord.lng).toBe(-180);
  });

  it("위도가 범위를 벗어나면 에러를 던진다", () => {
    expect(() => GlobeCoordinate.create(91, 0)).toThrow("위도는 -90 ~ 90 범위여야 합니다");
    expect(() => GlobeCoordinate.create(-91, 0)).toThrow("위도는 -90 ~ 90 범위여야 합니다");
  });

  it("경도가 범위를 벗어나면 에러를 던진다", () => {
    expect(() => GlobeCoordinate.create(0, 181)).toThrow("경도는 -180 ~ 180 범위여야 합니다");
    expect(() => GlobeCoordinate.create(0, -181)).toThrow("경도는 -180 ~ 180 범위여야 합니다");
  });

  it("3D 직교 좌표로 변환할 수 있다", () => {
    // 적도 + 본초자오선 (0, 0) -> (1, 0, 0)
    const coord = GlobeCoordinate.create(0, 0);
    const { x, y, z } = coord.toCartesian(1);
    expect(x).toBeCloseTo(1, 5);
    expect(y).toBeCloseTo(0, 5);
    expect(z).toBeCloseTo(0, 5);
  });

  it("북극 좌표를 3D로 변환할 수 있다", () => {
    // 북극 (90, 0) -> (0, 1, 0)
    const coord = GlobeCoordinate.create(90, 0);
    const { x, y, z } = coord.toCartesian(1);
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(1, 5);
    expect(z).toBeCloseTo(0, 5);
  });

  it("반지름을 지정하여 3D로 변환할 수 있다", () => {
    const coord = GlobeCoordinate.create(0, 0);
    const { x, y, z } = coord.toCartesian(5);
    expect(x).toBeCloseTo(5, 5);
    expect(y).toBeCloseTo(0, 5);
    expect(z).toBeCloseTo(0, 5);
  });

  it("동일한 좌표를 비교할 수 있다", () => {
    const a = GlobeCoordinate.create(37.5, 126.9);
    const b = GlobeCoordinate.create(37.5, 126.9);
    expect(a.equals(b)).toBe(true);
  });

  it("다른 좌표를 비교할 수 있다", () => {
    const a = GlobeCoordinate.create(37.5, 126.9);
    const b = GlobeCoordinate.create(35.1, 129.0);
    expect(a.equals(b)).toBe(false);
  });
});
