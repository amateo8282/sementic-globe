import { describe, it, expect } from "vitest";
import { Epoch } from "./Epoch";

describe("Epoch", () => {
  const validProps = {
    id: "epoch-1",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-01-02"),
    messageCount: 100,
  };

  it("유효한 속성으로 생성할 수 있다", () => {
    const epoch = Epoch.create(validProps);
    expect(epoch.id).toBe("epoch-1");
    expect(epoch.messageCount).toBe(100);
  });

  it("빈 ID로 생성하면 에러를 던진다", () => {
    expect(() => Epoch.create({ ...validProps, id: "" })).toThrow(
      "에포크 ID는 비어있을 수 없습니다"
    );
  });

  it("종료일이 시작일 이전이면 에러를 던진다", () => {
    expect(() =>
      Epoch.create({
        ...validProps,
        startDate: new Date("2024-01-02"),
        endDate: new Date("2024-01-01"),
      })
    ).toThrow("종료 날짜는 시작 날짜 이후여야 합니다");
  });

  it("종료일이 시작일과 같으면 에러를 던진다", () => {
    const sameDate = new Date("2024-01-01");
    expect(() =>
      Epoch.create({
        ...validProps,
        startDate: sameDate,
        endDate: sameDate,
      })
    ).toThrow("종료 날짜는 시작 날짜 이후여야 합니다");
  });

  it("음수 메시지 수로 생성하면 에러를 던진다", () => {
    expect(() => Epoch.create({ ...validProps, messageCount: -1 })).toThrow(
      "메시지 수는 0 이상이어야 합니다"
    );
  });

  it("활성 상태를 확인할 수 있다 (범위 내)", () => {
    const epoch = Epoch.create(validProps);
    const during = new Date("2024-01-01T12:00:00");
    expect(epoch.isActive(during)).toBe(true);
  });

  it("활성 상태를 확인할 수 있다 (범위 외)", () => {
    const epoch = Epoch.create(validProps);
    const after = new Date("2024-01-03");
    expect(epoch.isActive(after)).toBe(false);
  });

  it("시작일에 활성 상태이다", () => {
    const epoch = Epoch.create(validProps);
    expect(epoch.isActive(validProps.startDate)).toBe(true);
  });

  it("종료일에 활성 상태이다", () => {
    const epoch = Epoch.create(validProps);
    expect(epoch.isActive(validProps.endDate)).toBe(true);
  });
});
