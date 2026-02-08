/** 글로브 3D 시각화 관련 상수 */

/** 구체 반지름 */
export const GLOBE_RADIUS = 5;

/** 줌 레벨 경계값 (카메라 거리 기준) */
export const ZOOM_FAR = 20;
export const ZOOM_MID = 12;
export const ZOOM_NEAR = 8;

/** 줌 레벨 타입 */
export type ZoomLevel = "far" | "mid" | "near";

/** 클러스터별 파티클 색상 */
export const CLUSTER_COLORS = [
  "#EC4899", // 핑크
  "#34D399", // 민트
  "#A78BFA", // 라벤더
  "#F4F4F5", // 화이트
] as const;

/** 장면 배경색 */
export const SCENE_BG = "#0A0A0F";

/** 구체 표면 색상 */
export const GLOBE_SURFACE = "#1A1A2E";

/** 구체 와이어프레임 색상 */
export const GLOBE_WIREFRAME = "#2A2A4A";

/** 카메라 초기 위치 (z축) */
export const CAMERA_INITIAL_Z = 15;

/** 카메라 줌 범위 */
export const CAMERA_MIN_DISTANCE = 6;
export const CAMERA_MAX_DISTANCE = 30;
