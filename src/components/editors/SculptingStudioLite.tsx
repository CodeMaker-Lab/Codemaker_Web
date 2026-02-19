import React, { useEffect, useRef, useState } from 'react';
import {
    Save, Brush, Eraser,
    Palette, Move, Square, Hammer, MinusCircle, Divide,
    FlipHorizontal, RefreshCw, GraduationCap, ChevronRight,
    ChevronLeft, X, Home, HelpCircle, LogOut, CheckCircle2, AlertCircle, Trash2, Crown,
    Users, Rocket, Cloud
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SculptMesh } from '../../lib/sculptgl/Mesh';
import { SculptBrush, BrushType, DragData } from '../../lib/sculptgl/Brush';
import { HistoryManager } from '../../lib/sculptgl/HistoryManager';

// --- TIPOS ---
interface SculptingStudioLiteProps {
    onBack: () => void;
}

const tutorialSteps = [
    {
        title: "Flujo de Esculpido",
        content: "Bienvenido al estudio de escultura. Este tutorial te guiará por el proceso habitual para crear modelos increíbles.",
        image: null
    },
    {
        title: "1. Dar Forma General",
        content: "Comienza usando la herramienta 'Arrastrar' con un tamaño grande. Esto te permite estirar y mover la arcilla digital para definir la silueta básica de tu objeto.",
        tool: "drag"
    },
    {
        title: "2. Definir Volúmenes",
        content: "Usa el 'Pincel' estándar para añadir volumen y masa muscular o estructural. Construye las formas principales sobre tu silueta.",
        tool: "brush"
    },
    {
        title: "3. Marcar Zonas y Detalles",
        content: "Utiliza 'Pliegue' para definir cortes profundos o crestas afiladas. Alterna con 'Aplanar' para crear superficies duras o pulidas.",
        tool: "crease"
    },
    {
        title: "4. Refinar y Suavizar",
        content: "Usa 'Suavizar' (o presiona Shift mientras esculpes) para eliminar irregularidades y mezclar las formas. No abuses, o perderás detalle.",
        tool: "smooth"
    },
    {
        title: "5. Pintar y Acabado",
        content: "Finalmente, selecciona 'Pintar' para dar color a tu creación. ¡Diviértete!",
        tool: "paint"
    }
];

// --- COMPONENTES AUXILIARES ---

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

// No longer need placeholders as they are imported above

// --- COMPONENTE PRINCIPAL ---

const SculptingStudioLite: React.FC<SculptingStudioLiteProps> = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [brushType, setBrushType] = useState<BrushType>('brush');
    const [brushSize, setBrushSize] = useState(0.5);
    const [brushIntensity, setBrushIntensity] = useState(0.5);
    const [brushColor] = useState('#ff0000');
    const [symmetryEnabled, setSymmetryEnabled] = useState(true);
    const [negativeMode, setNegativeMode] = useState(false);

    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [showHelp, setShowHelp] = useState(false);
    const [projectName, setProjectName] = useState("Escultura Lite");
    const [isPremiumOpen, setIsPremiumOpen] = useState(false);

    const showAlert = (message: string, type: 'success' | 'warning' | 'error' = 'warning') => {
        setNotification({ message, type });
    };

    const handleLiteMessage = (customMsg?: string) => {
        showAlert(customMsg || "Esta función está desactivada en la versión Demo.");
    };

    const handleExit = () => {
        window.location.href = '/';
    };

    const engineRef = useRef<{
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        renderer: THREE.WebGLRenderer;
        mesh: SculptMesh;
        brush: SculptBrush;
        cursor: THREE.Mesh;
        symmetryLine: THREE.Line;
        controls: OrbitControls;
        raycaster: THREE.Raycaster;
        pointer: THREE.Vector2;
        history: HistoryManager;
        isSculpting: boolean;
        dragInfo: {
            active: boolean;
            startPoint: THREE.Vector3;
            plane: THREE.Plane;
            data: DragData | null;
        };
    } | null>(null);

    const handleHome = () => {
        if (engineRef.current) {
            const { camera, controls } = engineRef.current;
            camera.position.set(0, 0, 3);
            camera.lookAt(0, 0, 0);
            controls.target.set(0, 0, 0);
            controls.update();
        }
    };

    const resetSphere = () => {
        if (engineRef.current) {
            const engine = engineRef.current;
            engine.scene.remove(engine.mesh.mesh);
            const newMesh = new SculptMesh();
            engine.mesh = newMesh;
            engine.scene.add(newMesh.mesh);
            showAlert("Esfera reiniciada.", "success");
        }
    };

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#1a1a1a');

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 5, 5);
        scene.add(dirLight);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 3;

        const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        containerRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };

        const mesh = new SculptMesh();
        scene.add(mesh.mesh);

        const brush = new SculptBrush();
        const history = new HistoryManager();
        brush.history = history;

        const cursorGeometry = new THREE.RingGeometry(0.9, 1, 32);
        const cursorMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            depthTest: false
        });
        const cursor = new THREE.Mesh(cursorGeometry, cursorMaterial);
        cursor.renderOrder = 999;
        cursor.visible = false;
        scene.add(cursor);

        const curve = new THREE.EllipseCurve(0, 0, 1.05, 1.05, 0, 2 * Math.PI, false, 0);
        const points = curve.getPoints(64);
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.5 });
        const symmetryLine = new THREE.Line(lineGeometry, lineMaterial);
        symmetryLine.rotation.y = Math.PI / 2;
        scene.add(symmetryLine);

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();

        engineRef.current = {
            scene, camera, renderer, mesh, brush, cursor, symmetryLine, controls, raycaster, pointer, history,
            isSculpting: false,
            dragInfo: { active: false, startPoint: new THREE.Vector3(), plane: new THREE.Plane(), data: null }
        };

        const onPointerMove = (event: PointerEvent) => {
            if (!engineRef.current) return;
            const { renderer, camera, raycaster, pointer, mesh, brush, cursor, isSculpting, dragInfo } = engineRef.current;

            const rect = renderer.domElement.getBoundingClientRect();
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            if (dragInfo.active && dragInfo.data) {
                raycaster.setFromCamera(pointer, camera);
                const target = new THREE.Vector3();
                if (raycaster.ray.intersectPlane(dragInfo.plane, target)) {
                    const delta = target.clone().sub(dragInfo.startPoint);
                    brush.updateDrag(mesh, dragInfo.data, delta);
                    cursor.visible = true;
                    cursor.position.copy(target);
                    cursor.lookAt(target.clone().add(dragInfo.plane.normal));
                }
                return;
            }

            raycaster.setFromCamera(pointer, camera);
            const intersects = raycaster.intersectObject(mesh.mesh);

            if (intersects.length > 0) {
                const intersect = intersects[0];
                cursor.visible = true;
                cursor.position.copy(intersect.point);
                cursor.lookAt(intersect.point.clone().add(intersect.face!.normal));
                const scale = brush.size;
                cursor.scale.set(scale, scale, scale);
                cursor.position.add(intersect.face!.normal.clone().multiplyScalar(0.01));

                if (isSculpting && brush.type !== 'drag') {
                    brush.sculpt(mesh, intersect.point, intersect.face!.normal, (brush as any).symmetry);
                }
            } else {
                cursor.visible = false;
            }
        };

        const onPointerDown = (event: PointerEvent) => {
            if (!engineRef.current || event.button !== 0) return;
            const { raycaster, pointer, camera, mesh, brush, dragInfo } = engineRef.current;
            raycaster.setFromCamera(pointer, camera);
            const intersects = raycaster.intersectObject(mesh.mesh);

            if (intersects.length > 0) {
                const intersect = intersects[0];
                engineRef.current.isSculpting = true;
                engineRef.current.controls.enabled = false;

                if (brush.type === 'drag') {
                    const center = intersect.point;
                    const data = brush.startDrag(mesh, center);
                    const normal = new THREE.Vector3().subVectors(camera.position, center).normalize();
                    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, center);
                    dragInfo.active = true;
                    dragInfo.data = data;
                    dragInfo.startPoint.copy(center);
                    dragInfo.plane.copy(plane);
                } else {
                    brush.startStroke(mesh);
                    onPointerMove(event);
                }
            }
        };

        const onPointerUp = () => {
            if (!engineRef.current) return;
            engineRef.current.isSculpting = false;
            engineRef.current.controls.enabled = true;
            engineRef.current.dragInfo.active = false;
            engineRef.current.dragInfo.data = null;
        };

        const onResize = () => {
            if (!engineRef.current) return;
            const { camera, renderer } = engineRef.current;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        renderer.domElement.addEventListener('pointermove', onPointerMove);
        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('resize', onResize);

        const animate = () => {
            if (!engineRef.current) return;
            requestAnimationFrame(animate);
            engineRef.current.controls.update();
            engineRef.current.renderer.render(engineRef.current.scene, engineRef.current.camera);
        };
        animate();

        return () => {
            if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
            renderer.dispose();
            controls.dispose();
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('resize', onResize);
            engineRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (engineRef.current) {
            engineRef.current.brush.type = brushType;
            engineRef.current.brush.size = brushSize;
            engineRef.current.brush.intensity = brushIntensity;
            engineRef.current.brush.color = new THREE.Color(brushColor);
            engineRef.current.brush.negative = negativeMode;
            (engineRef.current.brush as any).symmetry = symmetryEnabled;
            engineRef.current.symmetryLine.visible = symmetryEnabled;
        }
    }, [brushType, brushSize, brushIntensity, brushColor, symmetryEnabled, negativeMode]);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: '#111', display: 'flex', flexDirection: 'column' }}>

            {/* HEADER LITE */}
            <header style={{
                position: 'absolute', top: '16px', left: '16px', right: '16px', height: '56px',
                backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', display: 'flex',
                alignItems: 'center', padding: '0 16px', gap: '16px', zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: 'auto', cursor: 'pointer' }} onClick={handleExit}>
                    <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(192,64,0,0.2)', border: '1px solid rgba(192,64,0,0.3)', display: 'flex' }}>
                        <Hammer size={20} color="#ff9f43" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'white' }}>Codemaker</span>
                            <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#000', backgroundColor: '#ff9f43', padding: '1px 5px', borderRadius: '4px' }}>DEMO</span>
                        </div>
                        <span style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.5px' }}>Sculpting Studio</span>
                    </div>
                </div>

                <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                        value={projectName} onChange={(e) => setProjectName(e.target.value)}
                        style={{ background: 'transparent', color: 'white', border: 'none', textAlign: 'center', outline: 'none', fontSize: '14px', width: '180px' }}
                    />
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                        <button onClick={() => handleLiteMessage()} style={{ background: 'none', border: 'none', color: '#666', padding: '6px', cursor: 'not-allowed' }} title="Guardar"><Save size={16} /></button>
                        <button onClick={() => window.location.reload()} style={{ background: 'none', border: 'none', color: '#9ca3af', padding: '6px', cursor: 'pointer' }} title="Recargar"><RefreshCw size={16} /></button>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <button onClick={() => setIsPremiumOpen(true)} style={{ background: 'none', border: 'none', color: '#fbbf24', padding: '8px', cursor: 'pointer' }} title="Premium"><Crown size={20} /></button>
                    <button onClick={() => setShowHelp(true)} style={{ background: 'none', border: 'none', color: '#9ca3af', padding: '8px', cursor: 'pointer' }} title="Ayuda"><HelpCircle size={20} /></button>
                    <button onClick={handleExit} style={{ background: 'none', border: 'none', color: '#9ca3af', padding: '8px', cursor: 'pointer' }} title="Salir"><LogOut size={20} /></button>
                </div>
            </header>

            {/* MAIN WORKSPACE */}
            <div style={{ flex: 1, position: 'relative' }} ref={containerRef}>

                {/* Home & Reset Panel */}
                <div style={{ position: 'absolute', top: '88px', left: '16px', zIndex: 10, width: '256px', backgroundColor: 'rgba(17,17,17,0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px', display: 'flex', gap: '8px' }}>
                    <button onClick={handleHome} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', color: '#9ca3af', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} title="Vista Inicio">
                        <Home size={16} /> <span style={{ fontSize: '12px', fontWeight: 500 }}>Inicio</span>
                    </button>
                    <button onClick={resetSphere} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', color: '#f87171', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} title="Reiniciar Escena">
                        <Trash2 size={16} /> <span style={{ fontSize: '12px', fontWeight: 500 }}>Reiniciar</span>
                    </button>
                </div>

                {/* Tools Panel */}
                <div style={{ position: 'absolute', top: '152px', left: '16px', width: '256px', backgroundColor: 'rgba(17,17,17,0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px' }}>
                    <h3 style={{ color: 'white', fontSize: '14px', fontWeight: 500, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Palette size={18} color="#007AFB" /> Herramientas
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            {[
                                { id: 'brush', label: 'Pincel', icon: Brush },
                                { id: 'smooth', label: 'Suavizar', icon: Eraser },
                                { id: 'flatten', label: 'Aplanar', icon: Square },
                                { id: 'crease', label: 'Pliegue', icon: Divide },
                                { id: 'drag', label: 'Arrastrar', icon: Move },
                                { id: 'paint', label: 'Pintar', icon: Palette },
                            ].map((tool) => {
                                const isEnabled = tool.id === 'brush';
                                return (
                                    <button
                                        key={tool.id}
                                        onClick={() => {
                                            if (!isEnabled) {
                                                handleLiteMessage("Esta herramienta solo está disponible en la versión completa.");
                                                return;
                                            }
                                            setBrushType(tool.id as BrushType);
                                        }}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '8px', transition: '0.2s', border: 'none',
                                            cursor: isEnabled ? 'pointer' : 'not-allowed',
                                            backgroundColor: brushType === tool.id ? '#007AFB' : 'rgba(255,255,255,0.05)',
                                            color: brushType === tool.id ? 'white' : (isEnabled ? '#9ca3af' : '#555'),
                                            opacity: isEnabled ? 1 : 0.5,
                                            filter: isEnabled ? 'none' : 'grayscale(1)'
                                        }}
                                        title={isEnabled ? tool.label : "Solo disponible en Premium"}
                                    >
                                        <tool.icon size={20} />
                                        <span style={{ fontSize: '10px', marginTop: '4px' }}>{tool.label}</span>
                                    </button>
                                )
                            })}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af' }}>
                                <span>Tamaño</span>
                                <span>{brushSize.toFixed(2)}</span>
                            </div>
                            <input
                                type="range" min="0.1" max="2.0" step="0.05" value={brushSize}
                                onChange={(e) => setBrushSize(parseFloat(e.target.value))}
                                style={{ width: '100%', accentColor: '#007AFB' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af' }}>
                                <span>Intensidad</span>
                                <span>{brushIntensity.toFixed(2)}</span>
                            </div>
                            <input
                                type="range" min="0.1" max="1.0" step="0.1" value={brushIntensity}
                                onChange={(e) => setBrushIntensity(parseFloat(e.target.value))}
                                style={{ width: '100%', accentColor: '#007AFB' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <button
                                onClick={() => setSymmetryEnabled(!symmetryEnabled)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px', borderRadius: '8px', border: symmetryEnabled ? '1px solid rgba(0,122,251,0.5)' : 'none', backgroundColor: symmetryEnabled ? 'rgba(0,122,251,0.2)' : 'rgba(255,255,255,0.05)', color: symmetryEnabled ? '#007AFB' : '#9ca3af', cursor: 'pointer' }}
                            >
                                <FlipHorizontal size={16} /> <span style={{ fontSize: '12px' }}>Simetría</span>
                            </button>
                            <button
                                onClick={() => setNegativeMode(!negativeMode)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px', borderRadius: '8px', border: negativeMode ? '1px solid rgba(239,68,68,0.5)' : 'none', backgroundColor: negativeMode ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', color: negativeMode ? '#ef4444' : '#9ca3af', cursor: 'pointer' }}
                            >
                                <MinusCircle size={16} /> <span style={{ fontSize: '12px' }}>Negativo</span>
                            </button>
                        </div>

                        <button
                            onClick={() => { setShowTutorial(true); setTutorialStep(0); }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px', borderRadius: '8px', border: '1px solid rgba(0,122,251,0.3)', backgroundColor: 'rgba(0,122,251,0.1)', color: '#007AFB', cursor: 'pointer', marginTop: '8px' }}
                        >
                            <GraduationCap size={16} /> <span style={{ fontSize: '12px' }}>Tutorial</span>
                        </button>
                    </div>
                </div>

                {/* Help Modal */}
                {showHelp && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowHelp(false)}>
                        <div style={{ maxWidth: '400px', width: '100%', backgroundColor: '#1e1e1e', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '24px' }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Hammer size={24} color="#007AFB" /> Ayuda de Esculpido
                            </h3>
                            <div style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <p>Clic izquierdo para esculpir. Clic derecho para girar la cámara. Rueda para zoom.</p>
                                <p><strong style={{ color: 'white' }}>Simetría:</strong> Refleja tus trazos en el eje opuesto.</p>
                                <p><strong style={{ color: 'white' }}>Negativo:</strong> En lugar de añadir volumen, la herramienta lo restará (excavar).</p>
                                <p>En la versión Lite de Codemaker 3D, solo la herramienta <strong>Pincel</strong> está disponible para modelar formas básicas.</p>
                            </div>
                            <button onClick={() => setShowHelp(false)} style={{ width: '100%', marginTop: '24px', padding: '12px', backgroundColor: '#007AFB', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Entendido</button>
                        </div>
                    </div>
                )}

                {/* Tutorial Modal */}
                {showTutorial && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                        <div style={{ maxWidth: '400px', width: '100%', backgroundColor: '#1e1e1e', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                            <div style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <GraduationCap size={24} color="#007AFB" /> {tutorialSteps[tutorialStep].title}
                                    </h3>
                                    <button onClick={() => setShowTutorial(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={20} /></button>
                                </div>
                                <p style={{ color: '#ccc', lineHeight: '1.6', fontSize: '14px' }}>{tutorialSteps[tutorialStep].content}</p>
                            </div>
                            <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {tutorialSteps.map((_, i) => (
                                        <div key={i} style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: i === tutorialStep ? '#007AFB' : 'rgba(255,255,255,0.1)' }} />
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => setTutorialStep(Math.max(0, tutorialStep - 1))} disabled={tutorialStep === 0} style={{ padding: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: 'white', opacity: tutorialStep === 0 ? 0.3 : 1, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
                                    {tutorialStep < tutorialSteps.length - 1 ? (
                                        <button onClick={() => setTutorialStep(tutorialStep + 1)} style={{ padding: '8px 16px', backgroundColor: '#007AFB', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>Siguiente <ChevronRight size={16} /></button>
                                    ) : (
                                        <button onClick={() => setShowTutorial(false)} style={{ padding: '8px 16px', backgroundColor: '#16a34a', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Finalizar</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Premium Modal */}
            {isPremiumOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} onClick={() => setIsPremiumOpen(false)}>
                    <div style={{ backgroundColor: '#111', borderRadius: '24px', padding: '32px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', width: '90%', maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setIsPremiumOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}>
                            <X size={24} />
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '20px', backgroundColor: 'rgba(251, 191, 36, 0.1)', marginBottom: '16px' }}>
                                <Crown size={32} style={{ color: '#fbbf24' }} />
                            </div>
                            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: 'white' }}>Funciones Premium</h2>
                            <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>Desbloquea todo el potencial de Codemaker para tu centro</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                            {[
                                { icon: <Users size={16} />, text: "Crear clases y gestionar alumnos" },
                                { icon: <Rocket size={16} />, text: "Gamificación y evaluación" },
                                { icon: <Cloud size={16} />, text: "Guardar en la nube" },
                                { icon: <Brush size={16} />, text: "Pinceles avanzados (Suavizar, Aplanar, etc.)" },
                                { icon: <Palette size={16} />, text: "Pincel de colorear y texturas" },
                            ].map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                                    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left'
                                }}>
                                    <div style={{ color: '#60a5fa', minWidth: '24px', display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
                                    <span style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.4' }}>{item.text}</span>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => setIsPremiumOpen(false)} style={{ width: '100%', marginTop: '24px', padding: '14px', background: '#fbbf24', color: 'black', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'filter 0.2s', fontSize: '14px' }} onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'} onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}>
                            Entendido
                        </button>
                    </div>
                </div>
            )}

            {/* Notification */}
            {notification && (
                <LiteNotification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}} />
        </div>
    );
};

export default SculptingStudioLite;
