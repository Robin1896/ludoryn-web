"use client";

import { useEffect } from "react";
import React from "react";
import { useBox } from "@react-three/cannon";
import * as THREE from "three";
import DiceMesh, { DICE_SIZE } from "./DiceMesh";

interface Props {
  startPos: [number, number, number];
  startRotation: [number, number, number, number]; // quaternion xyzw
  impulse?: [number, number, number];
  torque: [number, number, number];
  onSettled: (value: number) => void;
  children?: React.ReactNode;
}

export default function PhysicsDie({ startPos, startRotation, impulse, torque, onSettled, children }: Props) {
  const euler = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion(startRotation[0], startRotation[1], startRotation[2], startRotation[3])
  );

  const [ref, api] = useBox<THREE.Group>(() => ({
    mass: 1,
    position: startPos,
    rotation: [euler.x, euler.y, euler.z],
    args: [DICE_SIZE, DICE_SIZE, DICE_SIZE],
    restitution: 0.1,
    friction: 0.8,
    linearDamping: 0.4,
    angularDamping: 0.5,
  }));

  useEffect(() => {
    if (impulse && (impulse[0] !== 0 || impulse[1] !== 0 || impulse[2] !== 0)) {
      api.applyImpulse(impulse, [0, 0, 0]);
    }
    api.angularVelocity.set(torque[0], torque[1], torque[2]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <group ref={ref}>
      {children ?? <DiceMesh />}
    </group>
  );
}
