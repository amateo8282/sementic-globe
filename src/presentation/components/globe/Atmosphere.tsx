"use client";

import { useRef, useMemo } from "react";
import { BackSide, Color, ShaderMaterial } from "three";
import { useFrame } from "@react-three/fiber";
import { GLOBE_RADIUS, GLOBE_GLOW } from "@/presentation/constants/globe";

/**
 * 구체 주변 대기(Fresnel glow) 효과
 * 가장자리에서 밝아지는 림 라이팅으로 행성 같은 분위기를 연출한다
 */

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform vec3 glowColor;
  uniform float intensity;
  uniform float time;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    rim = pow(rim, 2.5);

    // 미세한 시간 변화로 살아있는 느낌
    float pulse = 1.0 + sin(time * 0.8) * 0.08;
    float alpha = rim * intensity * pulse;

    gl_FragColor = vec4(glowColor, alpha);
  }
`;

export default function Atmosphere() {
  const matRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      glowColor: { value: new Color(GLOBE_GLOW) },
      intensity: { value: 0.55 },
      time: { value: 0 },
    }),
    []
  );

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.time.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS * 1.18, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
