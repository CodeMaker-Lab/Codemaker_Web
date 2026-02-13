import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
    OrbitControls,
    TransformControls,
    Grid,
    PerspectiveCamera,
    OrthographicCamera,
    Outlines,
    ContactShadows
} from '@react-three/drei';
import { SUBTRACTION, ADDITION, Brush, Evaluator } from 'three-bvh-csg';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
    Box,
    Circle,
    Cylinder,
    Triangle,
    Square,
    Move,
    RotateCw,
    Scaling,
    Trash2,
    Image as ImageIcon,
    Palette,
    Plus,
    Tag,
    Settings2,
    List,
    Save,
    RefreshCw,
    HelpCircle,
    LogOut,
    MousePointer2,
    X,
    CheckCircle2,
    AlertCircle,
    Copy,
    Combine,
    ArrowDownToLine,
    Target,
    Maximize,
    ChevronRight,
    Cone,
    Pyramid,
    Torus,
    Backpack,
    Home,
    Grid2X2,
    Boxes,
    Scan,
    Eraser,
    Magnet,
    ChevronUp,
    ChevronDown
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

/**
 * ModelingStudioLite - Versión con PARIDAD DE UI TOTAL (Refined v5).
 * 
 * Requisitos:
 * npm install three @react-three/fiber @react-three/drei lucide-react uuid
 */

// --- TIPOS ---
type ShapeType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'prism' | 'torus' | 'sculpt_sphere' | 'custom' | 'plane' | 'capsule';
type TransformMode = 'translate' | 'rotate' | 'scale';

interface ISceneObject {
    id: string;
    type: ShapeType;
    name: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    color: string;
    originalColor?: string;
    originalTexture?: string;
    texture?: string;
    geometry?: THREE.BufferGeometry;
    composition?: {
        operation: 'UNION' | 'SUBTRACT' | 'INTERSECT';
        components: ISceneObject[];
        center: [number, number, number];
    };
    physics?: any;
    script?: string;
}

// --- CONSTANTES ---
const PRESET_COLORS = [
    '#007AFB', '#FF3B30', '#34C759', '#FF9500', '#AF52DE',
    '#FFD60A', '#8E8E93', '#000000', '#FFFFFF'
];

const BASIC_MODELS: { type: ShapeType; label: string }[] = [
    { type: 'box', label: 'Cubo' },
    { type: 'sphere', label: 'Esfera' },
    { type: 'cylinder', label: 'Cilindro' },
    { type: 'cone', label: 'Cono' },
    { type: 'pyramid', label: 'Pirámide' },
    { type: 'prism', label: 'Tejado' },
    { type: 'torus', label: 'Toroide' },
    { type: 'plane', label: 'Plano' },
    { type: 'capsule', label: 'Cápsula' },
];

const TEXTURES = [
    { name: 'Madera', url: '/textures/wood.jpg' },
    { name: 'Piedra', url: '/textures/stone.jpg' },
    { name: 'Metal', url: '/textures/metal.jpg' },
    { name: 'Tela', url: '/textures/fabric.jpg' },
];

// Helper: Geometry Factory
const createMeshFromObject = (obj: ISceneObject): THREE.Mesh => {
    let geometry: THREE.BufferGeometry;

    if (obj.geometry) {
        geometry = obj.geometry;
    } else {
        switch (obj.type) {
            case 'box': geometry = new THREE.BoxGeometry(1, 1, 1); break;
            case 'sphere': geometry = new THREE.SphereGeometry(0.5, 32, 32); break;
            case 'cylinder': geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); break;
            case 'cone': geometry = new THREE.ConeGeometry(0.5, 1, 32); break;
            case 'pyramid': geometry = new THREE.ConeGeometry(0.5, 1, 4); break;
            case 'torus': geometry = new THREE.TorusGeometry(0.4, 0.2, 16, 32); break;
            case 'plane': geometry = new THREE.PlaneGeometry(1, 1); break;
            case 'capsule': geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8); break;
            default: geometry = new THREE.BoxGeometry(1, 1, 1);
        }
    }

    const material = new THREE.MeshStandardMaterial({
        color: obj.color,
        roughness: 0.5,
        metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...obj.position);
    mesh.rotation.set(...obj.rotation);
    mesh.scale.set(...obj.scale);
    mesh.updateMatrixWorld();

    return mesh;
};

// --- COMPONENTES AUXILIARES ---

const ShapePreview: React.FC<{ type: ShapeType; color?: string }> = ({ type, color }) => {
    const finalColor = color || '#007AFB';
    return (
        <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
            <Canvas gl={{ alpha: true, antialias: true }} camera={{ position: [2, 2, 2], fov: 40 }}>
                <directionalLight position={[5, 10, 5]} intensity={2} />
                <ambientLight intensity={0.5} />
                <mesh rotation={type === 'prism' ? [-Math.PI / 2, 0, 0] : type === 'torus' ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
                    {type === 'box' && <boxGeometry args={[1.4, 1.4, 1.4]} />}
                    {type === 'sphere' && <sphereGeometry args={[0.8, 32, 32]} />}
                    {type === 'cylinder' && <cylinderGeometry args={[0.7, 0.7, 1.4, 32]} />}
                    {type === 'cone' && <coneGeometry args={[0.7, 1.4, 32]} />}
                    {type === 'pyramid' && <coneGeometry args={[0.8, 1.4, 4, 1, false, Math.PI / 4]} />}
                    {type === 'prism' && <cylinderGeometry args={[0.5, 0.5, 1, 3]} />}
                    {type === 'torus' && <torusGeometry args={[0.6, 0.3, 16, 32]} />}
                    <meshStandardMaterial color={finalColor} roughness={0.4} metalness={0.2} />
                </mesh>
            </Canvas>
        </div>
    );
};

const LiteNotification: React.FC<{ message: string; type: 'success' | 'warning' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const colors = {
        success: '#16a34a',
        warning: '#d97706',
        error: '#dc2626'
    };

    return (
        <div style={{
            position: 'fixed', top: '80px', right: '16px', zIndex: 1000,
            backgroundColor: colors[type], color: 'white', padding: '12px 16px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            animation: 'slideIn 0.3s ease-out', fontFamily: 'sans-serif'
        }}>
            {type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{message}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}><X size={14} /></button>
        </div>
    );
};

const SceneObject: React.FC<{
    object: ISceneObject,
    isSelected: boolean,
    onRef: (id: string, ref: THREE.Group | null) => void,
    onSelect: (id: string, shift: boolean) => void,
    onDragStart: (id: string, event: any) => void
}> = ({ object, isSelected, onRef, onSelect, onDragStart }) => {
    const isHole = object.color === '#ffffff4d';
    const groupRef = useRef<THREE.Group>(null);

    useEffect(() => {
        onRef(object.id, groupRef.current);
        return () => onRef(object.id, null);
    }, [object.id, onRef]);

    return (
        <group
            ref={groupRef}
            position={object.position}
            rotation={object.rotation}
            scale={object.scale}
            onPointerDown={(e) => {
                e.stopPropagation();
                onSelect(object.id, e.shiftKey);
                onDragStart(object.id, e);
            }}
            userData={{ isSelectable: true, id: object.id }}
        >
            <mesh castShadow receiveShadow geometry={object.geometry}>
                {!object.geometry && (
                    <>
                        {object.type === 'box' && <boxGeometry args={[1, 1, 1]} />}
                        {object.type === 'sphere' && <sphereGeometry args={[0.5, 48, 48]} />}
                        {object.type === 'cylinder' && <cylinderGeometry args={[0.5, 0.5, 1, 48]} />}
                        {object.type === 'cone' && <coneGeometry args={[0.5, 1, 48]} />}
                        {object.type === 'pyramid' && <coneGeometry args={[0.707, 1, 4, 1, false, Math.PI / 4]} />}
                        {object.type === 'prism' && <cylinderGeometry args={[0.5, 0.5, 1, 3]} />}
                        {object.type === 'torus' && <torusGeometry args={[0.4, 0.2, 24, 48]} />}
                        {object.type === 'plane' && <planeGeometry args={[1, 1]} />}
                        {object.type === 'capsule' && <capsuleGeometry args={[0.5, 1, 4, 8]} />}
                    </>
                )}

                <meshStandardMaterial
                    color={isHole ? '#ffffff' : object.color}
                    transparent={isHole}
                    opacity={isHole ? 0.3 : 1}
                    roughness={0.7}
                    flatShading={['box', 'prism', 'pyramid'].includes(object.type)}
                />

                {isSelected && (
                    <Outlines thickness={3} color="#FF6600" screenspace={false} />
                )}
            </mesh>
        </group>
    );
};

const DragManager: React.FC<{
    dragRef: React.MutableRefObject<{ id: string | null, plane: THREE.Plane, offset: THREE.Vector3 }>,
    objectRefs: React.MutableRefObject<{ [id: string]: THREE.Group | null }>,
    onUpdate: (id: string, pos: [number, number, number]) => void
}> = ({ dragRef, objectRefs, onUpdate }) => {
    const { raycaster, mouse, camera } = useThree();

    useFrame(() => {
        if (dragRef.current.id) {
            const id = dragRef.current.id;
            const group = objectRefs.current[id];
            if (!group) return;

            raycaster.setFromCamera(mouse, camera);
            const intersectPoint = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(dragRef.current.plane, intersectPoint)) {
                const newPos = intersectPoint.sub(dragRef.current.offset);
                group.position.copy(newPos);
            }
        }
    });

    return null;
};

// --- COMPONENTE PRINCIPAL ---

const ModelingStudioLite: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
    const [objects, setObjects] = useState<ISceneObject[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [transformMode, setTransformMode] = useState<TransformMode>('translate');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [activeRightTab, setActiveRightTab] = useState<'inspector' | 'objects' | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
    const [isOrtho, setIsOrtho] = useState(false);
    const [selectionMode, setSelectionMode] = useState<'cursor' | 'box'>('cursor');
    const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);

    const orbitControlsRef = useRef<any>(null);
    const cameraRef = useRef<THREE.Camera>(null);
    const objectRefs = useRef<{ [id: string]: THREE.Group | null }>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const dragBoxRef = useRef<{ start: { x: number, y: number } | null }>({ start: null });
    const dragObjectRef = useRef<{ id: string | null, plane: THREE.Plane, offset: THREE.Vector3 }>({
        id: null,
        plane: new THREE.Plane(),
        offset: new THREE.Vector3()
    });

    const selectedObjects = useMemo(() => objects.filter(o => selectedIds.includes(o.id)), [objects, selectedIds]);
    const firstSelected = selectedObjects[0];

    const showAlert = (message: string, type: 'success' | 'warning' | 'error' = 'warning') => {
        setNotification({ message, type });
    };

    const handleLiteMessage = (customMsg?: string) => {
        showAlert(customMsg || "Esta función está desactivada en la versión Lite.");
    };

    const addObject = (type: ShapeType) => {
        const disabledTypes: ShapeType[] = ['prism', 'torus'];
        if (disabledTypes.includes(type)) {
            handleLiteMessage("Esta figura no está disponible en la versión Lite.");
            return;
        }

        const newObj: ISceneObject = {
            id: uuidv4(),
            type,
            name: `${type.charAt(0).toUpperCase()}${type.slice(1)} ${objects.length + 1}`,
            position: [0, 0.5, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            color: '#007AFB'
        };
        setObjects(prev => [...prev, newObj]);
        setSelectedIds([newObj.id]);
        setActiveMenu(null);
    };

    const deleteSelected = () => {
        if (selectedIds.length === 0) return;
        setObjects(prev => prev.filter(o => !selectedIds.includes(o.id)));
        setSelectedIds([]);
    };

    const duplicateSelected = () => {
        if (selectedIds.length === 0) return;
        const newOnes: ISceneObject[] = selectedObjects.map(o => ({
            ...o,
            id: uuidv4(),
            name: `${o.name} copia`,
            position: [o.position[0] + 0.5, o.position[1], o.position[2] + 0.5]
        }));
        setObjects(prev => [...prev, ...newOnes]);
        setSelectedIds(newOnes.map(o => o.id));
    };

    const updateObject = (id: string, changes: Partial<ISceneObject>) => {
        setObjects(prev => prev.map(o => o.id === id ? { ...o, ...changes } : o));
    };

    const updateMultiple = (ids: string[], changes: Partial<ISceneObject>) => {
        setObjects(prev => prev.map(o => ids.includes(o.id) ? { ...o, ...changes } : o));
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                deleteSelected();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, deleteSelected]);

    const handleResetCamera = () => {
        if (orbitControlsRef.current) {
            orbitControlsRef.current.reset();
            setIsOrtho(false);
        }
    };

    const handleResetScene = () => {
        if (window.confirm("¿Estás seguro de que quieres reiniciar la escena? Se borrarán todos los objetos.")) {
            setObjects([]);
            setSelectedIds([]);
            showAlert("Escena reiniciada", "success");
        }
    };

    const performBooleanOperation = () => {
        if (selectedIds.length !== 2) return;

        const obj1 = objects.find(o => o.id === selectedIds[0]);
        const obj2 = objects.find(o => o.id === selectedIds[1]);
        if (!obj1 || !obj2) return;

        const isHole1 = obj1.color === '#ffffff4d';
        const isHole2 = obj2.color === '#ffffff4d';

        let targetObj = obj1;
        let brushObj = obj2;
        let operation = ADDITION;

        if (isHole1 && !isHole2) {
            targetObj = obj2;
            brushObj = obj1;
            operation = SUBTRACTION;
        } else if (!isHole1 && isHole2) {
            targetObj = obj1;
            brushObj = obj2;
            operation = SUBTRACTION;
        }

        // Create Meshes
        const targetMesh = createMeshFromObject(targetObj);
        const brushMesh = createMeshFromObject(brushObj);

        // Convert to CSG Brushes
        const targetEval = new Brush(targetMesh.geometry, targetMesh.material as THREE.Material);
        targetEval.position.copy(targetMesh.position);
        targetEval.rotation.copy(targetMesh.rotation);
        targetEval.scale.copy(targetMesh.scale);
        targetEval.updateMatrixWorld();

        const brushEval = new Brush(brushMesh.geometry, brushMesh.material as THREE.Material);
        brushEval.position.copy(brushMesh.position);
        brushEval.rotation.copy(brushMesh.rotation);
        brushEval.scale.copy(brushMesh.scale);
        brushEval.updateMatrixWorld();

        // Evaluate
        const evaluator = new Evaluator();
        const result = evaluator.evaluate(targetEval, brushEval, operation);

        // Process Result
        let resultGeometry = result.geometry;
        resultGeometry = BufferGeometryUtils.mergeVertices(resultGeometry);
        resultGeometry.computeVertexNormals();

        resultGeometry.computeBoundingBox();
        const center = new THREE.Vector3();
        if (resultGeometry.boundingBox) {
            resultGeometry.boundingBox.getCenter(center);
            resultGeometry.translate(-center.x, -center.y, -center.z);
        }

        const newId = uuidv4();
        const newObject: ISceneObject = {
            id: newId,
            type: 'custom',
            name: operation === SUBTRACTION ? 'Corte' : 'Unión',
            position: [center.x, center.y, center.z],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            color: targetObj.color,
            texture: targetObj.texture,
            geometry: resultGeometry,
            composition: {
                operation: operation === SUBTRACTION ? 'SUBTRACT' : 'UNION',
                components: [obj1, obj2],
                center: [center.x, center.y, center.z]
            }
        };

        setObjects(prev => [...prev.filter(o => o.id !== obj1.id && o.id !== obj2.id), newObject]);
        setSelectedIds([newId]);
    };

    const ungroupObject = (id: string) => {
        const obj = objects.find(o => o.id === id);
        if (!obj || !obj.composition) return;

        const restoredObjects = obj.composition.components.map(comp => ({
            ...comp,
            id: uuidv4()
        }));

        setObjects(prev => [...prev.filter(o => o.id !== id), ...restoredObjects]);
        setSelectedIds(restoredObjects.map(o => o.id));
    };

    const handleObjectSelect = useCallback((id: string, shift: boolean) => {
        if (shift) {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else {
            setSelectedIds([id]);
            setTransformMode('translate');
        }
        setActiveRightTab('inspector');
    }, []);

    const setView = (type: 'top' | 'front' | 'side') => {
        if (!cameraRef.current || !orbitControlsRef.current) return;
        setIsOrtho(true);
        const controls = orbitControlsRef.current;
        const dist = 10;
        if (type === 'top') cameraRef.current.position.set(0, dist, 0);
        else if (type === 'front') cameraRef.current.position.set(0, 0, dist);
        else if (type === 'side') cameraRef.current.position.set(dist, 0, 0);
        cameraRef.current.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();
    };

    const getShapeIcon = (type: ShapeType) => {
        switch (type) {
            case 'box': return <Box size={18} />;
            case 'sphere': return <Circle size={18} />;
            case 'cylinder': return <Cylinder size={18} />;
            case 'cone': return <Cone size={18} />;
            case 'pyramid': return <Pyramid size={18} />;
            case 'prism': return <Triangle size={18} />;
            case 'torus': return <Torus size={18} />;
            case 'plane': return <Square size={18} />;
            case 'capsule': return <Boxes size={18} />;
            default: return <Box size={18} />;
        }
    };

    const setObjRef = useCallback((id: string, ref: THREE.Group | null) => {
        if (ref) objectRefs.current[id] = ref;
        else delete objectRefs.current[id];
    }, []);

    // Selection Logic for Cursor and Box
    const handleCanvasPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return; // Only left click

        if (selectionMode === 'box') {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const start = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            dragBoxRef.current.start = start;
            setSelectionBox({ start, end: start });
        }
    };

    const handleDragStart = (id: string, e: any) => {
        if (selectionMode !== 'cursor') return;

        const group = objectRefs.current[id];
        if (!group || !cameraRef.current) return;

        // Create a plane at the object's position facing the camera's Z axis
        const planePadding = new THREE.Vector3(0, 0, 1).applyQuaternion(cameraRef.current.quaternion);
        dragObjectRef.current.plane.setFromNormalAndCoplanarPoint(
            planePadding,
            group.position
        );

        // Calculate initial offset
        const intersectPoint = new THREE.Vector3();
        e.ray.intersectPlane(dragObjectRef.current.plane, intersectPoint);
        dragObjectRef.current.offset.copy(intersectPoint).sub(group.position);
        dragObjectRef.current.id = id;

        if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
    };

    const handleCanvasPointerMove = (e: React.PointerEvent) => {
        if (selectionMode === 'box' && dragBoxRef.current.start) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            setSelectionBox({ start: dragBoxRef.current.start, end: { x: e.clientX - rect.left, y: e.clientY - rect.top } });
        }
    };

    const handleCanvasPointerUp = (e: React.PointerEvent) => {
        if (dragObjectRef.current.id) {
            const id = dragObjectRef.current.id;
            const group = objectRefs.current[id];
            if (group) {
                updateObject(id, { position: [group.position.x, group.position.y, group.position.z] });
            }
            dragObjectRef.current.id = null;
            if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
        }

        if (selectionMode === 'box' && dragBoxRef.current.start) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const start = dragBoxRef.current.start;
            const end = { x: e.clientX - rect.left, y: e.clientY - rect.top };

            if (cameraRef.current) {
                const minX = Math.min(start.x, end.x);
                const maxX = Math.max(start.x, end.x);
                const minY = Math.min(start.y, end.y);
                const maxY = Math.max(start.y, end.y);

                const foundIds: string[] = [];
                objects.forEach(obj => {
                    const group = objectRefs.current[obj.id];
                    if (!group) return;

                    const vector = new THREE.Vector3();
                    group.getWorldPosition(vector);
                    vector.project(cameraRef.current!);

                    const x = (vector.x + 1) * rect.width / 2;
                    const y = (-vector.y + 1) * rect.height / 2;

                    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                        foundIds.push(obj.id);
                    }
                });

                if (foundIds.length > 0) {
                    if (e.shiftKey) {
                        setSelectedIds(prev => Array.from(new Set([...prev, ...foundIds])));
                    } else {
                        setSelectedIds(foundIds);
                    }
                    setActiveRightTab('inspector');
                } else if (!e.shiftKey) {
                    setSelectedIds([]);
                }
            }

            dragBoxRef.current.start = null;
            setSelectionBox(null);
            if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
        }
    };
    return (
        <div
            ref={containerRef}
            className="modeling-lite-container"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            style={{ position: 'relative', width: '100%', height: '100vh', backgroundColor: '#111111', color: 'white', fontFamily: 'sans-serif', overflow: 'hidden' }}
        >
            {/* --- 3D VIEW --- */}
            <Canvas
                shadows
                onPointerMissed={() => {
                    if (selectionMode === 'cursor') setSelectedIds([]);
                }}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
            >
                <DragManager
                    dragRef={dragObjectRef}
                    objectRefs={objectRefs}
                    onUpdate={(id, pos) => updateObject(id, { position: pos })}
                />

                {isOrtho ? (
                    <OrthographicCamera ref={cameraRef as any} makeDefault position={[5, 5, 5]} zoom={50} />
                ) : (
                    <PerspectiveCamera ref={cameraRef as any} makeDefault position={[5, 5, 5]} />
                )}

                <OrbitControls
                    ref={orbitControlsRef}
                    makeDefault
                    dampingFactor={0.05}
                    enabled={selectionMode !== 'box'}
                />

                <ambientLight intensity={0.5} />
                <directionalLight
                    position={[10, 10, 5]}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                    shadow-bias={-0.0001}
                />

                <Grid infiniteGrid cellColor="#333" sectionColor="#444" fadeDistance={50} sectionSize={1} cellSize={0.1} />
                <ContactShadows opacity={0.4} scale={20} blur={2.4} far={10} color="#000000" />

                {objects.map(obj => (
                    <SceneObject
                        key={obj.id}
                        object={obj}
                        isSelected={selectedIds.includes(obj.id)}
                        onRef={setObjRef}
                        onSelect={handleObjectSelect}
                        onDragStart={handleDragStart}
                    />
                ))}

                {selectedIds.length === 1 && objectRefs.current[selectedIds[0]] && (
                    <TransformControls
                        mode={transformMode}
                        object={objectRefs.current[selectedIds[0]]!}
                        onMouseDown={() => { if (orbitControlsRef.current) orbitControlsRef.current.enabled = false; }}
                        onMouseUp={() => {
                            if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
                            const o = objectRefs.current[selectedIds[0]];
                            if (o) {
                                updateObject(selectedIds[0], {
                                    position: [o.position.x, o.position.y, o.position.z],
                                    rotation: [o.rotation.x, o.rotation.y, o.rotation.z],
                                    scale: [o.scale.x, o.scale.y, o.scale.z]
                                });
                            }
                        }}
                    />
                )}
            </Canvas>

            {/* Selection Box Overlay */}
            {selectionBox && (
                <div style={{
                    position: 'absolute',
                    left: Math.min(selectionBox.start.x, selectionBox.end.x),
                    top: Math.min(selectionBox.start.y, selectionBox.end.y),
                    width: Math.max(1, Math.abs(selectionBox.start.x - selectionBox.end.x)),
                    height: Math.max(1, Math.abs(selectionBox.start.y - selectionBox.end.y)),
                    border: '1px solid #FF6600',
                    backgroundColor: 'rgba(255, 102, 0, 0.1)',
                    pointerEvents: 'none',
                    zIndex: 1000
                }} />
            )}

            {/* --- NOTIFICATIONS --- */}
            {notification && (
                <LiteNotification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            {/* --- UI OVERLAY --- */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <header style={{
                    position: 'absolute', top: '16px', left: '16px', right: '16px', height: '56px',
                    backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', display: 'flex',
                    alignItems: 'center', padding: '0 16px', gap: '16px', zIndex: 100, pointerEvents: 'auto'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: 'auto', cursor: 'pointer' }} onClick={onExit}>
                        <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex' }}>
                            <Box size={20} color="#60a5fa" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#d1d5db' }}>Codemaker 3D</span>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#60a5fa', textTransform: 'uppercase' }}>Modelado Lite</span>
                        </div>
                    </div>

                    <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                            readOnly value="Proyecto de Prueba" onFocus={() => handleLiteMessage()}
                            style={{ background: 'transparent', color: 'white', border: 'none', textAlign: 'center', outline: 'none', fontSize: '14px', width: '180px' }}
                        />
                        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                            <button onClick={() => handleLiteMessage()} style={{ background: 'none', border: 'none', color: '#666', padding: '6px', cursor: 'not-allowed' }} title="Guardar"><Save size={16} /></button>
                            <button onClick={() => window.location.reload()} style={{ background: 'none', border: 'none', color: '#9ca3af', padding: '6px', cursor: 'pointer' }} title="Recargar"><RefreshCw size={16} /></button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                        <button onClick={() => setActiveRightTab('inspector')} style={{ background: 'none', border: 'none', color: '#9ca3af', padding: '8px', cursor: 'pointer' }}><HelpCircle size={20} /></button>
                        <button onClick={onExit} style={{ background: 'none', border: 'none', color: '#9ca3af', padding: '8px', cursor: 'pointer' }}><LogOut size={20} /></button>
                    </div>
                </header>

                {/* LEFT SIDEBAR (TOOLS) */}
                <div style={{ position: 'absolute', left: '16px', top: '88px', display: 'flex', flexDirection: 'column', gap: '16px', pointerEvents: 'auto', zIndex: 90 }}>
                    {/* ADD MENU */}
                    <div style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', padding: '6px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'add' ? null : 'add'); }}
                                style={{
                                    width: '40px', height: '40px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    backgroundColor: activeMenu === 'add' ? '#005bb8' : '#007AFB', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                                title="Añadir Modelo 3D"
                            >
                                <Plus size={20} />
                            </button>

                            {activeMenu === 'add' && (
                                <div style={{
                                    position: 'absolute', top: 0, left: '48px', width: '220px', backgroundColor: '#1e1e1e',
                                    borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', overflow: 'hidden'
                                }}>
                                    <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 'bold', color: '#666', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                                        FORMAS BÁSICAS
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', padding: '8px', background: 'rgba(0,0,0,0.2)' }}>
                                        {BASIC_MODELS.map(m => (
                                            <button
                                                key={m.type} onClick={() => addObject(m.type)}
                                                style={{
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px 4px',
                                                    background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', borderRadius: '8px'
                                                }}
                                            >
                                                <ShapePreview type={m.type} />
                                                <span style={{ fontSize: '10px', marginTop: '4px' }}>{m.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => handleLiteMessage()} style={{ width: '100%', padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: '#444', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'not-allowed' }}>
                                        MOCHILA <ChevronRight size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CAMERA TOOLS */}
                    <div style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', padding: '6px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button onClick={handleResetCamera} style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', background: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Vista Inicio"><Home size={20} /></button>
                        <button onClick={handleResetScene} style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', background: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Reiniciar Escena"><Trash2 size={20} /></button>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <button onClick={() => setView('side')} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>X</button>
                            <button onClick={() => setView('top')} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>Y</button>
                            <button onClick={() => setView('front')} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.5)', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>Z</button>
                        </div>
                        <button onClick={() => setIsOrtho(!isOrtho)} style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', background: isOrtho ? 'rgba(255,255,255,0.1)' : 'none', color: isOrtho ? '#3b82f6' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Perspectiva/Orto">{isOrtho ? <Boxes size={20} /> : <Grid2X2 size={20} />}</button>
                    </div>

                    {/* SELECTION MODES */}
                    <div style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', padding: '6px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button onClick={() => setSelectionMode('cursor')} style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', background: selectionMode === 'cursor' ? 'rgba(255,255,255,0.1)' : 'none', color: selectionMode === 'cursor' ? '#3b82f6' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Selección Cursor"><MousePointer2 size={20} /></button>
                        <button onClick={() => setSelectionMode('box')} style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', background: selectionMode === 'box' ? 'rgba(255,255,255,0.1)' : 'none', color: selectionMode === 'box' ? '#3b82f6' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Caja de Selección"><Scan size={20} /></button>
                    </div>

                    {/* SNAP TOOL */}
                    <div style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', padding: '6px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button onClick={() => handleLiteMessage()} style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', background: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Snap (Imán)"><Magnet size={20} /></button>
                    </div>

                    {/* SCENE CONFIG TOOL */}
                    <div style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', padding: '6px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'scene' ? null : 'scene'); }}
                                style={{
                                    width: '40px', height: '40px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    backgroundColor: activeMenu === 'scene' ? 'rgba(255,255,255,0.1)' : 'transparent', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                                title="Configuración de Escena"
                            >
                                <ImageIcon size={20} />
                            </button>

                            {activeMenu === 'scene' && (
                                <div style={{
                                    position: 'absolute', top: 0, left: '48px', width: '220px', backgroundColor: '#1e1e1e',
                                    borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', padding: '12px'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {['Rejilla', 'Ejes', 'Sombras'].map(label => (
                                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '12px', color: '#888' }}>{label}</span>
                                                <input type="checkbox" checked={true} readOnly onClick={() => handleLiteMessage()} style={{ cursor: 'pointer' }} />
                                            </div>
                                        ))}
                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                                            <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>ILUMINACIÓN</div>
                                            <input type="range" min="0" max="100" value="70" readOnly onClick={() => handleLiteMessage()} style={{ width: '100%', cursor: 'pointer' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT TABS */}
                <div style={{ position: 'absolute', right: '16px', top: '88px', display: 'flex', flexDirection: 'column', gap: '16px', pointerEvents: 'auto', zIndex: 90 }}>
                    <div style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', padding: '6px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button
                            onClick={() => setActiveRightTab(activeRightTab === 'objects' ? null : 'objects')}
                            style={{
                                width: '38px', height: '38px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                backgroundColor: activeRightTab === 'objects' ? '#007AFB' : 'transparent', color: activeRightTab === 'objects' ? 'white' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setActiveRightTab(activeRightTab === 'inspector' ? null : 'inspector')}
                            style={{
                                width: '38px', height: '38px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                backgroundColor: activeRightTab === 'inspector' ? '#007AFB' : 'transparent', color: activeRightTab === 'inspector' ? 'white' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <Settings2 size={18} />
                        </button>
                    </div>
                </div>

                {/* PANELES DERECHOS */}
                {activeRightTab === 'objects' && (
                    <div className="custom-scrollbar" style={{ position: 'absolute', right: '72px', top: '88px', width: '280px', maxHeight: '70vh', backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(12px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', pointerEvents: 'auto' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#888' }}>OBJETOS EN ESCENA</span>
                            <span style={{ fontSize: '10px', color: '#666', background: 'black', padding: '2px 6px', borderRadius: '10px' }}>{objects.length}</span>
                        </div>
                        <div style={{ padding: '8px' }}>
                            {objects.map(obj => (
                                <button
                                    key={obj.id}
                                    onClick={() => setSelectedIds([obj.id])}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px',
                                        background: selectedIds.includes(obj.id) ? 'rgba(0,122,251,0.1)' : 'transparent',
                                        border: selectedIds.includes(obj.id) ? '1px solid rgba(0,122,251,0.3)' : '1px solid transparent',
                                        borderRadius: '8px', color: '#ccc', cursor: 'pointer', textAlign: 'left', marginBottom: '4px'
                                    }}
                                >
                                    <div style={{ width: '28px', height: '28px', background: selectedIds.includes(obj.id) ? '#007AFB' : 'rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {getShapeIcon(obj.type)}
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{obj.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeRightTab === 'inspector' && (
                    <div className="custom-scrollbar" style={{ position: 'absolute', right: '72px', top: '88px', width: '280px', maxHeight: '80vh', backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(12px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', pointerEvents: 'auto' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#888' }}>
                                {selectedIds.length > 1 ? `${selectedIds.length} OBJETOS` : 'INSPECTOR'}
                            </span>
                            {selectedIds.length > 0 && <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => duplicateSelected()} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px' }}><Copy size={14} /></button>
                                <button onClick={() => deleteSelected()} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
                            </div>}
                        </div>
                        {selectedIds.length > 0 ? (
                            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                {selectedIds.length === 1 && firstSelected && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '10px', color: '#666', fontWeight: 'bold' }}>NOMBRE</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px' }}>
                                            <Tag size={14} color="#666" />
                                            <input value={firstSelected.name} onChange={(e) => updateObject(firstSelected.id, { name: e.target.value })} style={{ background: 'none', border: 'none', color: 'white', fontSize: '12px', outline: 'none', width: '100%' }} />
                                        </div>
                                        <button onClick={() => handleLiteMessage()} style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ccc', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}><Backpack size={14} /> Guardar en Mochila</button>
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ fontSize: '10px', color: '#666', fontWeight: 'bold' }}>TRANSFORMACIÓN</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                                        <button onClick={() => setTransformMode('translate')} style={{ padding: '8px', background: transformMode === 'translate' ? 'rgba(0,122,251,0.2)' : 'rgba(255,255,255,0.05)', border: transformMode === 'translate' ? '1px solid #007AFB' : '1px solid transparent', borderRadius: '10px', color: transformMode === 'translate' ? '#007AFB' : '#666', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}><Move size={16} /> <span style={{ fontSize: '8px' }}>Mover</span></button>
                                        <button onClick={() => setTransformMode('rotate')} style={{ padding: '8px', background: transformMode === 'rotate' ? 'rgba(0,122,251,0.2)' : 'rgba(255,255,255,0.05)', border: transformMode === 'rotate' ? '1px solid #007AFB' : '1px solid transparent', borderRadius: '10px', color: transformMode === 'rotate' ? '#007AFB' : '#666', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}><RotateCw size={16} /><span style={{ fontSize: '8px' }}>Rotar</span></button>
                                        <button onClick={() => setTransformMode('scale')} style={{ padding: '8px', background: transformMode === 'scale' ? 'rgba(0,122,251,0.2)' : 'rgba(255,255,255,0.05)', border: transformMode === 'scale' ? '1px solid #007AFB' : '1px solid transparent', borderRadius: '10px', color: transformMode === 'scale' ? '#007AFB' : '#666', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}><Maximize size={16} /><span style={{ fontSize: '8px' }}>Escalar</span></button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <button onClick={() => selectedIds.forEach(id => updateObject(id, { position: [objects.find(o => o.id === id)!.position[0], 0, objects.find(o => o.id === id)!.position[2]] }))} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px', borderRadius: '8px', color: '#888', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }} title="Bajar al suelo"><ArrowDownToLine size={12} /> Bajar</button>
                                        <button onClick={() => selectedIds.forEach(id => updateObject(id, { position: [0, 0, 0] }))} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px', borderRadius: '8px', color: '#888', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }} title="Mover al origen"><Target size={12} /> Origen</button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ fontSize: '10px', color: '#666', fontWeight: 'bold' }}>BOOLEANOS</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <button
                                            onClick={() => {
                                                const first = objects.find(o => o.id === selectedIds[0]);
                                                const isHole = first?.color === '#ffffff4d';
                                                updateMultiple(selectedIds, { color: isHole ? (first?.originalColor || '#007AFB') : '#ffffff4d', originalColor: isHole ? undefined : first?.color });
                                            }}
                                            style={{ background: objects.find(o => o.id === selectedIds[0])?.color === '#ffffff4d' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', border: objects.find(o => o.id === selectedIds[0])?.color === '#ffffff4d' ? '1px solid white' : '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '8px', color: '#ccc', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                                        >
                                            <Eraser size={14} /> Hueco
                                        </button>
                                        <button
                                            onClick={() => performBooleanOperation()}
                                            disabled={selectedIds.length !== 2}
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '8px', color: selectedIds.length === 2 ? '#ccc' : '#444', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: selectedIds.length === 2 ? 'pointer' : 'not-allowed' }}
                                        >
                                            <Combine size={14} /> Unir/Restar
                                        </button>
                                        {selectedIds.length === 1 && firstSelected?.composition && (
                                            <button
                                                onClick={() => ungroupObject(selectedIds[0])}
                                                style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '8px', color: '#ccc', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                                            >
                                                <X size={14} /> Separar
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <label style={{ fontSize: '10px', color: '#666', fontWeight: 'bold' }}>APARIENCIA</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#666' }}><Palette size={12} /> COLOR</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                        {PRESET_COLORS.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => updateMultiple(selectedIds, { color: c })}
                                                style={{
                                                    width: '100%', aspectRatio: '1/1', background: c,
                                                    border: selectedIds.length === 1 && firstSelected?.color === c ? '2px solid white' : 'none',
                                                    borderRadius: '6px', cursor: 'pointer'
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#666', marginTop: '8px' }}><ImageIcon size={12} /> TEXTURA</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                        {TEXTURES.map(t => (
                                            <div
                                                key={t.name}
                                                onClick={() => handleLiteMessage()}
                                                style={{
                                                    width: '100%',
                                                    aspectRatio: '1/1',
                                                    backgroundImage: `url(${t.url})`,
                                                    backgroundSize: 'cover',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    position: 'relative'
                                                }}
                                                title={t.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#444', gap: '12px' }}>
                                <MousePointer2 size={32} />
                                <span style={{ fontSize: '12px', textAlign: 'center' }}>Selecciona uno o varios objetos para ver sus propiedades</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* BOTTOM STATUS */}
            <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 24px', fontSize: '12px', color: '#9ca3af', pointerEvents: 'auto' }}>
                {selectionMode === 'box' ? "Modo Caja de Selección activa: Arrastra para encerrar objetos." : selectedIds.length > 0 ? `${selectedIds.length} objeto${selectedIds.length > 1 ? 's' : ''} seleccionado${selectedIds.length > 1 ? 's' : ''}.` : "Haz clic en una figura para seleccionarla (Shift para múltiple)."}
            </div>

            {/* ESTILOS GLOBALES */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                    canvas { touch-action: none; }
                `}} />
        </div>
    );
};

export default ModelingStudioLite;
