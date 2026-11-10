"use client";

import { Edges, OrbitControls, PointerLockControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import * as THREE from "three";
import type { Room, Vec2 } from "@/domain/document";
import { bounds, centroid, pointInPolygon } from "@/geometry/polygon";
import { buildWallBoxes, doorThresholds } from "@/geometry/walls3d";
import { activeLayout, selectedRoomId, useEditorStore } from "@/store/editorStore";
import { Furniture3D } from "./Furniture3D";

const M = 1 / 1000;
const EYE_HEIGHT = 1.6;
const CUTAWAY_HEIGHT = 1000;

type CameraMode = "orbit" | "walk";

function shapeFrom(points: Vec2[]): THREE.Shape {
  // 평면 (x, y) → 3D (x, 0, y): -y로 만든 뒤 X축으로 -90° 돌린다
  return new THREE.Shape(points.map((p) => new THREE.Vector2(p.x * M, -p.y * M)));
}

function Floor({ room }: { room: Room }) {
  const shape = useMemo(() => shapeFrom(room.points), [room.points]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={room.floorColor} roughness={0.95} />
    </mesh>
  );
}

function Threshold({ points, color }: { points: Vec2[]; color: string }) {
  const shape = useMemo(() => shapeFrom(points), [points]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

function House({ cutaway }: { cutaway: boolean }) {
  const doc = useEditorStore((s) => s.doc);
  const selection = useEditorStore((s) => s.selection);
  const walls = useMemo(() => buildWallBoxes(doc), [doc]);
  const thresholds = useMemo(() => doorThresholds(doc), [doc]);
  const items = activeLayout(doc).items;
  const limit = cutaway ? CUTAWAY_HEIGHT : Infinity;

  return (
    <>
      {doc.floorplan.rooms.map((r) => (
        <Floor key={r.id} room={r} />
      ))}
      {thresholds.map((t) => (
        <Threshold key={t.id} points={t.points} color={t.color} />
      ))}
      {walls.map((w, i) => {
        const top = Math.min(w.top, limit);
        if (top - w.bottom < 1) return null;
        return (
          <mesh
            key={i}
            position={[w.center.x * M, ((w.bottom + top) / 2) * M, w.center.y * M]}
            rotation={[0, -w.angle, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w.length * M, (top - w.bottom) * M, w.thickness * M]} />
            <meshStandardMaterial color="#f5f5f4" roughness={0.9} />
            <Edges color="#a8a29e" threshold={15} />
          </mesh>
        );
      })}
      {items.map((item) => (
        <Furniture3D
          key={item.id}
          item={item}
          selected={selection?.kind === "furniture" && selection.itemId === item.id}
          onSelect={(e) => {
            e.stopPropagation();
            const s = useEditorStore.getState();
            if (s.mode !== "furniture") s.setMode("furniture");
            s.select({ kind: "furniture", itemId: item.id });
          }}
        />
      ))}
    </>
  );
}

/** 집 전체가 보이도록 궤도 카메라를 맞춘다 (처음, 그리고 시점 초기화를 누를 때) */
function OrbitRig({ resetKey }: { resetKey: number }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  // 카메라는 three가 직접 바꾸는 객체라 렌더 값이 아닌 get()으로 꺼내 쓴다
  const get = useThree((s) => s.get);

  useEffect(() => {
    const { doc } = useEditorStore.getState();
    const pts = doc.floorplan.rooms.flatMap((r) => r.points);
    const b = pts.length ? bounds(pts) : { minX: -3000, minY: -3000, maxX: 3000, maxY: 3000 };
    const cx = ((b.minX + b.maxX) / 2) * M;
    const cz = ((b.minY + b.maxY) / 2) * M;
    const size = Math.max(b.maxX - b.minX, b.maxY - b.minY) * M;
    const { camera } = get();
    camera.position.set(cx + size * 0.25, size * 1.25, cz + size * 0.7);
    controls.current?.target.set(cx, 0, cz);
    controls.current?.update();
  }, [resetKey, get]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      maxPolarAngle={Math.PI / 2 - 0.05}
      minDistance={0.5}
      maxDistance={80}
    />
  );
}

/** 1인칭 걷기: 클릭하면 마우스가 잠기고 WASD로 이동 */
function WalkRig({ start, onLockChange }: { start: Vec2; onLockChange: (v: boolean) => void }) {
  // 카메라는 three가 직접 바꾸는 객체라 렌더 값이 아닌 get()으로 꺼내 쓴다
  const get = useThree((s) => s.get);
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const { camera } = get();
    camera.position.set(start.x * M, EYE_HEIGHT, start.y * M);
    camera.lookAt(start.x * M, EYE_HEIGHT, start.y * M - 1);
  }, [get, start.x, start.y]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.code);
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame(({ camera }, dt) => {
    const k = keys.current;
    const forward =
      Number(k.has("KeyW") || k.has("ArrowUp")) - Number(k.has("KeyS") || k.has("ArrowDown"));
    const right =
      Number(k.has("KeyD") || k.has("ArrowRight")) - Number(k.has("KeyA") || k.has("ArrowLeft"));
    if (!forward && !right) return;
    const speed = (k.has("ShiftLeft") || k.has("ShiftRight") ? 3 : 1.4) * Math.min(dt, 0.05);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const side = new THREE.Vector3().crossVectors(dir, camera.up).normalize();
    camera.position.addScaledVector(dir, forward * speed);
    camera.position.addScaledVector(side, right * speed);
    camera.position.y = EYE_HEIGHT;
  });

  return (
    <PointerLockControls onLock={() => onLockChange(true)} onUnlock={() => onLockChange(false)} />
  );
}

function walkStart(): Vec2 {
  const { doc, selection } = useEditorStore.getState();
  const rooms = doc.floorplan.rooms;
  const id = selectedRoomId(selection);
  const room = rooms.find((r) => r.id === id) ?? rooms[0];
  if (!room) return { x: 0, y: 0 };
  // 방 아래쪽 끝 가까이에서 위(-y)를 바라보며 시작해 방 전체가 눈에 들어오게
  const c = centroid(room.points);
  const b = bounds(room.points);
  const back = { x: c.x, y: c.y + (b.maxY - c.y) * 0.8 };
  if (pointInPolygon(back, room.points)) return back;
  return pointInPolygon(c, room.points) ? c : room.points[0];
}

export default function Scene3D() {
  const [cameraMode, setCameraMode] = useState<CameraMode>("orbit");
  const [cutaway, setCutaway] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [locked, setLocked] = useState(false);
  const [start, setStart] = useState<Vec2>({ x: 0, y: 0 });
  const fitRequest = useEditorStore((s) => s.fitRequest);
  const hasRooms = useEditorStore((s) => s.doc.floorplan.rooms.length > 0);

  const enterWalk = () => {
    setStart(walkStart());
    // 방향키가 선택된 가구를 움직이지 않도록 선택을 푼다
    useEditorStore.getState().select(null);
    setCameraMode("walk");
  };

  return (
    <div className="relative h-full w-full bg-stone-100" data-scene3d>
      <Canvas
        // 톤 매핑을 끄고 지정한 색을 그대로 쓴다 (기본 ACES는 파스텔 색을 어둡게 만듦)
        flat
        shadows
        dpr={[1, 2]}
        camera={{ fov: 55, near: 0.05, far: 300, position: [6, 8, 10] }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onPointerMissed={() => {
          if (cameraMode === "orbit") useEditorStore.getState().select(null);
        }}
      >
        <color attach="background" args={["#f5f5f4"]} />
        <hemisphereLight args={["#ffffff", "#e7e5e4", 1.7]} />
        <directionalLight
          position={[8, 14, 6]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />
        <ambientLight intensity={0.6} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial color="#e7e5e4" roughness={1} />
        </mesh>
        <House cutaway={cutaway && cameraMode === "orbit"} />
        {cameraMode === "orbit" ? (
          <OrbitRig resetKey={resetKey + fitRequest} />
        ) : (
          <WalkRig start={start} onLockChange={setLocked} />
        )}
      </Canvas>

      <div className="absolute top-3 left-3 flex gap-1 rounded-lg bg-white/95 p-1 text-sm shadow-sm ring-1 ring-neutral-200">
        <button
          type="button"
          onClick={() => setCameraMode("orbit")}
          aria-pressed={cameraMode === "orbit"}
          className={`rounded-md px-2.5 py-1 ${cameraMode === "orbit" ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}
        >
          둘러보기
        </button>
        <button
          type="button"
          onClick={enterWalk}
          disabled={!hasRooms}
          aria-pressed={cameraMode === "walk"}
          className={`rounded-md px-2.5 py-1 disabled:opacity-40 ${cameraMode === "walk" ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}
        >
          걸어 보기
        </button>
        {cameraMode === "orbit" && (
          <>
            <span className="mx-1 w-px bg-neutral-200" />
            <button
              type="button"
              onClick={() => setCutaway((v) => !v)}
              aria-pressed={cutaway}
              className={`rounded-md px-2.5 py-1 ${cutaway ? "bg-blue-50 text-blue-700" : "hover:bg-neutral-100"}`}
            >
              벽 낮추기
            </button>
            <button
              type="button"
              onClick={() => setResetKey((k) => k + 1)}
              className="rounded-md px-2.5 py-1 hover:bg-neutral-100"
            >
              시점 초기화
            </button>
          </>
        )}
      </div>

      {cameraMode === "walk" && !locked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-lg bg-black/70 px-4 py-3 text-center text-sm leading-relaxed text-white">
            화면을 클릭하면 걷기 시작
            <br />
            WASD·방향키 이동 · Shift 빠르게 · 마우스로 둘러보기 · Esc 멈춤
          </p>
        </div>
      )}
      {cameraMode === "orbit" && (
        <p className="pointer-events-none absolute bottom-3 left-3 text-[11px] text-neutral-500">
          드래그 회전 · 오른쪽 드래그 이동 · 휠 확대 · 가구 클릭하면 선택
        </p>
      )}
    </div>
  );
}
