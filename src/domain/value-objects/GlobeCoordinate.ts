/**
 * 구체 위의 좌표를 나타내는 값 객체
 * lat(위도): -90 ~ 90, lng(경도): -180 ~ 180
 */
export class GlobeCoordinate {
  private constructor(
    public readonly lat: number,
    public readonly lng: number
  ) {}

  static create(lat: number, lng: number): GlobeCoordinate {
    if (lat < -90 || lat > 90) {
      throw new Error(`위도는 -90 ~ 90 범위여야 합니다: ${lat}`);
    }
    if (lng < -180 || lng > 180) {
      throw new Error(`경도는 -180 ~ 180 범위여야 합니다: ${lng}`);
    }
    return new GlobeCoordinate(lat, lng);
  }

  /** 구면 좌표(lat, lng)를 3D 직교 좌표(x, y, z)로 변환 */
  toCartesian(radius: number = 1): { x: number; y: number; z: number } {
    const latRad = (this.lat * Math.PI) / 180;
    const lngRad = (this.lng * Math.PI) / 180;
    return {
      x: radius * Math.cos(latRad) * Math.cos(lngRad),
      y: radius * Math.sin(latRad),
      z: radius * Math.cos(latRad) * Math.sin(lngRad),
    };
  }

  equals(other: GlobeCoordinate): boolean {
    return this.lat === other.lat && this.lng === other.lng;
  }
}
