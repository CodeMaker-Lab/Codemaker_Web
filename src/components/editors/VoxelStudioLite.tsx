import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    MousePointer2,
    Box,
    ArrowLeft,
    Trash2,
    Hammer,
    Eraser,
    Palette,
    Home,
    Save,
    RefreshCw,
    HelpCircle,
    LogOut,
    CheckCircle2,
    AlertCircle,
    X
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

/**
 * VoxelStudioLite - Una versión independiente y autocontenida del editor de Vóxeles.
 * 
 * Requisitos de instalación en el proyecto de destino:
 * npm install three lucide-react uuid
 * 
 * Nota: Los estilos están inyectados en línea para no depender de Tailwind ni CSS externo.
 */

// --- TIPOS E INTERFACES ---
interface VoxelData {
    id: string;
    position: [number, number, number];
    color: string;
}

type ToolMode = 'build' | 'delete' | 'paint';

// --- CONSTANTES ---
const DEFAULT_COLOR = '#007AFB';
const COLORS = [
    '#007AFB', // Blue
    '#ef4444', // Red
    '#22c55e', // Green
    '#eab308', // Yellow
    '#ec4899', // Pink
    '#8b5cf6', // Purple
    '#f97316', // Orange
    '#007AFB80', // Transparent Blue (Windows/Water)
    '#ffffff', // White
    '#333333'  // Black
];

const INITIAL_VOXEL: VoxelData = {
    id: uuidv4(),
    position: [0, 0.5, 0],
    color: DEFAULT_COLOR
};

// --- ESTILOS EN LÍNEA ---
const STYLES = {
    container: {
        position: 'relative' as const,
        width: '100%',
        height: '100vh',
        backgroundColor: '#111111',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: 'white',
        overflow: 'hidden',
    },
    header: {
        position: 'absolute' as const,
        top: '16px',
        left: '16px',
        right: '16px',
        height: '56px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '16px',
        zIndex: 50,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'auto' as const,
    },
    brand: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginRight: 'auto',
        cursor: 'pointer',
        userSelect: 'none' as const,
    },
    chipVoxel: {
        padding: '6px',
        borderRadius: '8px',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolbar: {
        position: 'absolute' as const,
        left: '16px',
        top: '80px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '16px',
        zIndex: 40,
        pointerEvents: 'auto' as const,
    },
    buttonGroup: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
    },
    btn: (active: boolean, color: string = '#007AFB') => ({
        width: '44px',
        height: '44px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backgroundColor: active ? color : 'transparent',
        color: active ? 'white' : '#9ca3af',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
    }),
    colorPicker: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '12px',
    },
    colorCircle: (color: string, selected: boolean) => ({
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: color,
        border: selected ? '2px solid white' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'transform 0.2s',
    }),
    indicator: {
        position: 'absolute' as const,
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: '9999px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '8px 24px',
        fontSize: '14px',
        color: '#d1d5db',
        zIndex: 40,
        whiteSpace: 'nowrap' as const,
    },
    notification: (type: string) => ({
        position: 'fixed' as const,
        top: '80px',
        right: '16px',
        zIndex: 100,
        backgroundColor: type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#d97706',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        animation: 'slideIn 0.3s ease-out',
    }),
    modalOverlay: {
        position: 'absolute' as const,
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        pointerEvents: 'auto' as const,
    },
    modal: {
        backgroundColor: '#1e1e1e',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        maxWidth: '512px',
        width: '100%',
        padding: '32px',
        position: 'relative' as const,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    }
};

// --- COMPONENTES AUXILIARES LOCALES ---

const LiteNotification: React.FC<{ message: string; type: 'success' | 'warning' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div style={STYLES.notification(type)}>
            {type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{message}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={14} /></button>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---

const VoxelStudioLite: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
    // UI State
    const [voxels, setVoxels] = useState<VoxelData[]>([INITIAL_VOXEL]);
    const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
    const [activeTool, setActiveTool] = useState<ToolMode>('build');
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

    const handleExit = () => {
        if (onExit) {
            onExit();
        } else {
            window.location.href = '/';
        }
    };

    // Three.js Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const raycasterRef = useRef(new THREE.Raycaster());
    const mouseRef = useRef(new THREE.Vector2());

    const showAlert = (message: string, type: 'success' | 'warning' | 'error' = 'warning') => {
        setNotification({ message, type });
    };

    const handleLiteMessage = () => {
        showAlert("Función desactivada en la versión Lite.");
    };

    // Inicialización de la Escena
    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#111111');
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(
            75,
            containerRef.current.clientWidth / containerRef.current.clientHeight,
            0.1,
            1000
        );
        camera.position.set(5, 5, 5);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controlsRef.current = controls;

        const gridHelper = new THREE.GridHelper(50, 50, '#333333', '#222222');
        scene.add(gridHelper);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7);
        scene.add(directionalLight);

        const animate = () => {
            requestAnimationFrame(animate);
            if (controlsRef.current) controlsRef.current.update();
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        const animId = requestAnimationFrame(animate);

        const handleResize = () => {
            if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
            cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', handleResize);
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
            }
            controls.dispose();
        };
    }, []);

    // Manejo de Interacción y Cursor
    useEffect(() => {
        const checkIntersection = (event: PointerEvent) => {
            if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return false;

            const rect = rendererRef.current.domElement.getBoundingClientRect();
            mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

            const voxelMeshes: THREE.Object3D[] = [];
            sceneRef.current.traverse((child) => {
                if (child.userData.isVoxel && child instanceof THREE.Mesh) {
                    voxelMeshes.push(child);
                }
            });

            const intersects = raycasterRef.current.intersectObjects(voxelMeshes, false);
            return intersects.length > 0;
        };

        const handlePointerDown = (event: PointerEvent) => {
            if (!controlsRef.current || !cameraRef.current || !sceneRef.current || !rendererRef.current) return;

            if (event.button === 0) { // Izquierdo
                const rect = rendererRef.current.domElement.getBoundingClientRect();
                mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

                raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

                const voxelMeshes: THREE.Object3D[] = [];
                sceneRef.current.traverse((child) => {
                    if (child.userData.isVoxel && child instanceof THREE.Mesh) voxelMeshes.push(child);
                });

                const intersects = raycasterRef.current.intersectObjects(voxelMeshes, false);

                if (intersects.length > 0) {
                    controlsRef.current.enabled = false;
                    const intersect = intersects[0];
                    const object = intersect.object;

                    if (activeTool === 'build' && intersect.face) {
                        const normal = intersect.face.normal;
                        const pos = object.position.clone().add(normal);

                        // Check if exists
                        const exists = voxels.some(v =>
                            Math.abs(v.position[0] - pos.x) < 0.1 &&
                            Math.abs(v.position[1] - pos.y) < 0.1 &&
                            Math.abs(v.position[2] - pos.z) < 0.1
                        );
                        if (!exists) {
                            setVoxels(prev => [...prev, { id: uuidv4(), position: [pos.x, pos.y, pos.z], color: selectedColor }]);
                        }
                    } else if (activeTool === 'delete') {
                        if (voxels.length > 1) {
                            setVoxels(prev => prev.filter(v => v.id !== object.userData.id));
                        } else {
                            showAlert("No puedes borrar el último cubo.");
                        }
                    } else if (activeTool === 'paint') {
                        setVoxels(prev => prev.map(v => v.id === object.userData.id ? { ...v, color: selectedColor } : v));
                    }
                }
            }
        };

        const handlePointerUp = () => {
            if (controlsRef.current) controlsRef.current.enabled = true;
        };

        const handlePointerMove = (event: PointerEvent) => {
            if (!rendererRef.current) return;
            const hit = checkIntersection(event);
            rendererRef.current.domElement.style.cursor = hit ? 'crosshair' : 'grab';
        };

        const canvas = rendererRef.current?.domElement;
        if (canvas) {
            canvas.addEventListener('pointerdown', handlePointerDown);
            window.addEventListener('pointerup', handlePointerUp);
            canvas.addEventListener('pointermove', handlePointerMove);
        }

        return () => {
            if (canvas) {
                canvas.removeEventListener('pointerdown', handlePointerDown);
                window.removeEventListener('pointerup', handlePointerUp);
                canvas.removeEventListener('pointermove', handlePointerMove);
            }
        };
    }, [voxels, activeTool, selectedColor]);

    // Renderizar Vóxeles
    useEffect(() => {
        if (!sceneRef.current) return;
        const scene = sceneRef.current;

        // Cleanup
        const toCleanup: THREE.Object3D[] = [];
        scene.traverse((child) => {
            if (child.userData.isVoxel && child instanceof THREE.Mesh) {
                toCleanup.push(child);
            }
        });
        toCleanup.forEach(child => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
            scene.remove(child);
        });

        // Create
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const edgesGeom = new THREE.EdgesGeometry(geometry);

        voxels.forEach(voxel => {
            const isTransparent = voxel.color.length > 7;
            const hexColor = isTransparent ? voxel.color.substring(0, 7) : voxel.color;

            const material = new THREE.MeshStandardMaterial({
                color: hexColor,
                transparent: isTransparent,
                opacity: isTransparent ? 0.6 : 1.0,
                roughness: 0.2,
                metalness: 0.1
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(...voxel.position);
            mesh.userData = { isVoxel: true, id: voxel.id };

            const line = new THREE.LineSegments(edgesGeom, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2, transparent: isTransparent, opacity: isTransparent ? 0.3 : 1.0 }));
            line.userData = { isVoxel: true };
            mesh.add(line);
            scene.add(mesh);
        });
    }, [voxels]);

    const handleHome = () => {
        if (cameraRef.current && controlsRef.current) {
            cameraRef.current.position.set(5, 5, 5);
            cameraRef.current.lookAt(0, 0, 0);
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
        }
    };

    const handleClearAll = () => {
        if (window.confirm("¿Estás seguro de que quieres reiniciar la escena?")) {
            setVoxels([INITIAL_VOXEL]);
            showAlert("Escena reiniciada", "success");
        }
    };

    return (
        <div style={STYLES.container}>
            <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

            {/* Notification UI */}
            {notification && (
                <LiteNotification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            {/* HEADER */}
            <header style={STYLES.header}>
                <div style={STYLES.brand} onClick={handleExit}>
                    <div style={STYLES.chipVoxel}>
                        <Box size={20} style={{ color: '#4ade80' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                        <h1 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#d1d5db' }}>Codemaker 3D</h1>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#4ade80' }}>Voxel Lite</span>
                    </div>
                </div>

                <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <input
                        type="text"
                        defaultValue="Proyecto de Prueba"
                        onFocus={handleLiteMessage}
                        readOnly
                        style={{ background: 'transparent', color: 'white', fontWeight: 500, fontSize: '14px', border: '1px solid transparent', borderRadius: '4px', padding: '6px 8px', width: '192px', textAlign: 'center', outline: 'none', cursor: 'default' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '4px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <button onClick={handleLiteMessage} style={{ ...STYLES.btn(false), opacity: 0.5, cursor: 'not-allowed' }} title="Guardar (Desactivado)">
                                <Save size={16} />
                            </button>
                            <button onClick={() => window.location.reload()} style={STYLES.btn(false)} title="Recargar">
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <button onClick={() => setIsHelpOpen(true)} style={STYLES.btn(false)} title="Ayuda">
                        <HelpCircle size={20} />
                    </button>
                    <button onClick={handleExit} style={{ ...STYLES.btn(false), color: '#9ca3af' }} title="Salir">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* TOOLBAR */}
            <div style={STYLES.toolbar}>
                <div style={STYLES.buttonGroup}>
                    <button onClick={handleHome} style={STYLES.btn(false)} title="Vista Inicio">
                        <Home size={20} />
                    </button>
                </div>

                <div style={STYLES.buttonGroup}>
                    <button
                        onClick={() => setActiveTool('build')}
                        style={STYLES.btn(activeTool === 'build')}
                        title="Construir"
                    >
                        <Hammer size={20} />
                    </button>
                    <button
                        onClick={() => setActiveTool('paint')}
                        style={STYLES.btn(activeTool === 'paint')}
                        title="Pintar"
                    >
                        <Palette size={20} />
                    </button>
                    <button
                        onClick={() => setActiveTool('delete')}
                        style={STYLES.btn(activeTool === 'delete', '#ef4444')}
                        title="Borrar"
                    >
                        <Eraser size={20} />
                    </button>
                </div>

                {(activeTool === 'build' || activeTool === 'paint') && (
                    <div style={STYLES.colorPicker}>
                        <button
                            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
                            style={{
                                width: '32px', height: '32px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)',
                                cursor: 'pointer', backgroundColor: selectedColor, transition: 'transform 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        />
                        {isPaletteOpen && COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => { setSelectedColor(color); setIsPaletteOpen(false); }}
                                style={{
                                    ...STYLES.colorCircle(color, selectedColor === color),
                                    boxSizing: 'border-box'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            />
                        ))}
                    </div>
                )}

                <div style={STYLES.buttonGroup}>
                    <button onClick={handleClearAll} style={{ ...STYLES.btn(false), color: '#f87171' }} title="Reiniciar Escena">
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* INSTRUCTIONS */}
            <div style={STYLES.indicator}>
                {activeTool === 'build' && "🔨 Haz clic para añadir cubos. Arrastra el fondo para rotar."}
                {activeTool === 'delete' && "❌ Haz clic en cubos para eliminar."}
                {activeTool === 'paint' && "🎨 Haz clic en cubos para cambiar color."}
            </div>

            {/* HELP MODAL */}
            {isHelpOpen && (
                <div style={STYLES.modalOverlay}>
                    <div style={STYLES.modal}>
                        <button onClick={() => setIsHelpOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}>
                            <X size={24} />
                        </button>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80' }}>
                            <Box /> Guía de Voxel Lite
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: '#d1d5db' }}>
                            <section>
                                <h3 style={{ color: 'white', fontWeight: 'bold', marginBottom: '8px', marginTop: 0 }}>Controles del Ratón</h3>
                                <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.6' }}>
                                    <li><strong>Clic Izquierdo:</strong> Usar herramienta activa.</li>
                                    <li><strong>Clic Izquierdo (Fondo):</strong> Rotar vista.</li>
                                    <li><strong>Clic Derecho:</strong> Desplazar vista.</li>
                                    <li><strong>Rueda:</strong> Zoom.</li>
                                </ul>
                            </section>
                            <section>
                                <h3 style={{ color: 'white', fontWeight: 'bold', marginBottom: '8px', marginTop: 0 }}>Herramientas</h3>
                                <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.6' }}>
                                    <li><strong>Martillo:</strong> Añadir cubos sobre caras existentes.</li>
                                    <li><strong>Paleta:</strong> Cambiar el color de los cubos.</li>
                                    <li><strong>Goma:</strong> Eliminar cubos.</li>
                                </ul>
                            </section>
                        </div>
                        <button
                            onClick={() => setIsHelpOpen(false)}
                            style={{
                                width: '100%', marginTop: '32px', padding: '12px 0', backgroundColor: '#16a34a', border: 'none',
                                color: 'white', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s', fontSize: '16px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                        >
                            ¡Entendido!
                        </button>
                    </div>
                </div>
            )}

            {/* Estilos Globales para Animaciones */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                canvas { display: block; }
            `}} />
        </div>
    );
};

export default VoxelStudioLite;
