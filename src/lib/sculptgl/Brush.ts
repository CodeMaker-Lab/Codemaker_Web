import * as THREE from 'three';
import { SculptMesh } from './Mesh';
import { HistoryManager, GeometryState } from './HistoryManager';

export type BrushType = 'brush' | 'smooth' | 'flatten' | 'drag' | 'paint' | 'crease';

export interface DragData {
    indices: number[];
    falloffs: number[];
    originalPositions: THREE.Vector3[];
    center: THREE.Vector3;
    symmetryData?: DragData;
}

export class SculptBrush {
    type: BrushType = 'brush';
    size: number = 0.5;
    intensity: number = 0.5;
    color: THREE.Color = new THREE.Color(0xff0000);
    negative: boolean = false;
    active: boolean = false;

    // Added property
    // Added property
    symmetry: boolean = false;
    history: HistoryManager | null = null;

    constructor() { }

    startStroke(mesh: SculptMesh) {
        console.log('Brush.startStroke called');
        if (this.history) {
            this.history.pushState(new GeometryState(mesh));
        } else {
            console.warn('Brush has no history manager attached');
        }
    }

    private _pushHistory(indices: number[]) {
        if (this.history) {
            const state = this.history.getCurrentState();
            if (state && 'pushVertices' in state) {
                // console.log(`Pushing ${indices.length} vertices to history`);
                (state as GeometryState).pushVertices(indices);
            } else {
                console.warn('No active state to push history to');
            }
        }
    }

    sculpt(mesh: SculptMesh, point: THREE.Vector3, normal: THREE.Vector3, symmetry: boolean = false, dragDir?: THREE.Vector3) {
        // We update internal symmetry state just in case, though usually set via UI prop
        this.symmetry = symmetry;

        this.applyStroke(mesh, point, normal, dragDir);

        if (symmetry) {
            const symPoint = new THREE.Vector3(-point.x, point.y, point.z);
            const symNormal = new THREE.Vector3(-normal.x, normal.y, normal.z);
            // Symmetry for legacy/stateless calls
            let symDragDir;
            if (dragDir) {
                symDragDir = new THREE.Vector3(-dragDir.x, dragDir.y, dragDir.z);
            }
            this.applyStroke(mesh, symPoint, symNormal, symDragDir);
        }

        mesh.update();
    }

    // --- Stateful Drag Implementation ---

    startDrag(mesh: SculptMesh, center: THREE.Vector3): DragData {
        this.startStroke(mesh);
        const mainData = this.collectDragData(mesh, center);

        if (this.symmetry) {
            const symCenter = new THREE.Vector3(-center.x, center.y, center.z);
            const symData = this.collectDragData(mesh, symCenter);

            // STRICT SYMMETRY SEPARATION (Voronoi Partition)
            // To prevent artifacts/tearing when brushes overlap (large brush size):
            // A vertex should ONLY be affected by the brush instance closest to it.
            // If Main Brush (Right) grabs a vertex on the Left, it pulls it Right.
            // But Symmetry Brush (Left) should be pulling it Left.
            // By enforcing "closest center wins", we ensure Left vertices behave consistently.

            const filterData = (data: DragData, ownCenter: THREE.Vector3, otherCenter: THREE.Vector3) => {
                const newIndices: number[] = [];
                const newFalloffs: number[] = [];
                const newOriginals: THREE.Vector3[] = [];

                for (let i = 0; i < data.indices.length; i++) {
                    const idx = data.indices[i];
                    const pos = data.originalPositions[i]; // Use original pos for distance check

                    const distOwn = pos.distanceToSquared(ownCenter);
                    const distOther = pos.distanceToSquared(otherCenter);

                    // Strictly closest. If equal, Main wins (<= vs <) or arbitrary choice.
                    // Main takes <=, Sym takes < to handle exact center line without changing ownership?
                    // actually if dists are equal (center line), it doesn't matter much as long as it's consistent.
                    // Let's iterate main first.

                    const isOwner = distOwn <= distOther; // Main logic (roughly)
                    // Wait, this function is generic. 
                    // Usage: filterData(mainData, center, symCenter) -> keep if distOwn <= distOther

                    // Actually, if I just modify arrays in place or return new ones.
                    if (distOwn <= distOther) {
                        newIndices.push(idx);
                        newFalloffs.push(data.falloffs[i]);
                        newOriginals.push(pos);
                    }
                }
                data.indices = newIndices;
                data.falloffs = newFalloffs;
                data.originalPositions = newOriginals;
            };

            // Calculate distances to decide ownership
            // note: we need to do this carefully.
            // Collect VALID indices for Main (closer to main)
            const mainIndices: number[] = [];
            const mainFalloffs: number[] = [];
            const mainOriginals: THREE.Vector3[] = [];

            for (let i = 0; i < mainData.indices.length; i++) {
                const pos = mainData.originalPositions[i];
                if (pos.distanceToSquared(center) <= pos.distanceToSquared(symCenter)) {
                    mainIndices.push(mainData.indices[i]);
                    mainFalloffs.push(mainData.falloffs[i]);
                    mainOriginals.push(pos);
                }
            }
            mainData.indices = mainIndices;
            mainData.falloffs = mainFalloffs;
            mainData.originalPositions = mainOriginals;

            // Collect VALID indices for Sym (closer to sym)
            const symIndices: number[] = [];
            const symFalloffs: number[] = [];
            const symOriginals: THREE.Vector3[] = [];

            for (let i = 0; i < symData.indices.length; i++) {
                const pos = symData.originalPositions[i];
                if (pos.distanceToSquared(symCenter) < pos.distanceToSquared(center)) {
                    symIndices.push(symData.indices[i]);
                    symFalloffs.push(symData.falloffs[i]);
                    symOriginals.push(pos);
                }
            }
            symData.indices = symIndices;
            symData.falloffs = symFalloffs;
            symData.originalPositions = symOriginals;

            mainData.symmetryData = symData;
        }



        // Push initial state of vertices involved in drag
        const allIndices = [...mainData.indices];
        if (mainData.symmetryData) {
            allIndices.push(...mainData.symmetryData.indices);
        }
        this._pushHistory(allIndices);

        return mainData;
    }

    private collectDragData(mesh: SculptMesh, center: THREE.Vector3): DragData {
        const positions = mesh.getPositions();
        const radiusSq = this.size * this.size;
        const indices: number[] = [];
        const falloffs: number[] = [];
        const originalPositions: THREE.Vector3[] = [];

        // Bounding Box Check
        const minX = center.x - this.size;
        const maxX = center.x + this.size;
        const minY = center.y - this.size;
        const maxY = center.y + this.size;
        const minZ = center.z - this.size;
        const maxZ = center.z + this.size;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            if (x < minX || x > maxX) continue;
            const y = positions.getY(i);
            if (y < minY || y > maxY) continue;
            const z = positions.getZ(i);
            if (z < minZ || z > maxZ) continue;

            const distSq = (x - center.x) ** 2 + (y - center.y) ** 2 + (z - center.z) ** 2;
            if (distSq < radiusSq) {
                const dist = Math.sqrt(distSq);
                const falloff = this.calculateFalloff(dist, this.size);

                indices.push(i);
                falloffs.push(falloff);
                originalPositions.push(new THREE.Vector3(x, y, z));
            }
        }

        return { indices, falloffs, originalPositions, center };
    }

    updateDrag(mesh: SculptMesh, data: DragData, delta: THREE.Vector3) {
        this.applyDragUpdate(mesh, data, delta);

        if (data.symmetryData) {
            const symDelta = new THREE.Vector3(-delta.x, delta.y, delta.z);
            this.applyDragUpdate(mesh, data.symmetryData, symDelta);
        }

        mesh.update();
    }

    private applyDragUpdate(mesh: SculptMesh, data: DragData, delta: THREE.Vector3) {
        const positions = mesh.getPositions();
        const sign = this.negative ? -1 : 1;

        for (let i = 0; i < data.indices.length; i++) {
            const idx = data.indices[i];
            const falloff = data.falloffs[i];
            const original = data.originalPositions[i];

            // New Pos = Original + Delta * Falloff * Intensity
            const move = delta.clone().multiplyScalar(falloff * this.intensity * sign);
            const newPos = original.clone().add(move);

            positions.setXYZ(idx, newPos.x, newPos.y, newPos.z);
        }
    }

    // --- Internal Helpers ---

    private applyStroke(mesh: SculptMesh, center: THREE.Vector3, normal: THREE.Vector3, dragDir?: THREE.Vector3) {
        const positions = mesh.getPositions();
        const colors = mesh.getColors();
        const radiusSq = this.size * this.size;
        const modifiedIndices: number[] = [];

        // Bounding Box Check
        const minX = center.x - this.size;
        const maxX = center.x + this.size;
        const minY = center.y - this.size;
        const maxY = center.y + this.size;
        const minZ = center.z - this.size;
        const maxZ = center.z + this.size;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            if (x < minX || x > maxX) continue;
            const y = positions.getY(i);
            if (y < minY || y > maxY) continue;
            const z = positions.getZ(i);
            if (z < minZ || z > maxZ) continue;

            const distSq = (x - center.x) ** 2 + (y - center.y) ** 2 + (z - center.z) ** 2;
            if (distSq < radiusSq) {
                modifiedIndices.push(i);
            }
        }

        if (modifiedIndices.length === 0) return;

        this._pushHistory(modifiedIndices);

        if (this.type === 'brush') {
            this.applyBrush(positions, modifiedIndices, center, normal);
        } else if (this.type === 'smooth') {
            this.applySmooth(mesh, modifiedIndices, center);
        } else if (this.type === 'flatten') {
            this.applyFlatten(positions, modifiedIndices, center, normal);
        } else if (this.type === 'drag' && dragDir) {
            this.applyDrag(positions, modifiedIndices, center, dragDir);
        } else if (this.type === 'paint' && colors) {
            this.applyPaint(positions, colors, modifiedIndices, center);
        } else if (this.type === 'crease') {
            this.applyCrease(positions, modifiedIndices, center, normal);
        }
    }

    private applyBrush(positions: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, indices: number[], center: THREE.Vector3, normal: THREE.Vector3) {
        const v = new THREE.Vector3();
        const direction = normal.clone().normalize();

        for (const i of indices) {
            v.fromBufferAttribute(positions, i);
            const dist = v.distanceTo(center);
            const falloff = this.calculateFalloff(dist, this.size);
            const sign = this.negative ? -1 : 1;
            const displacement = direction.clone().multiplyScalar(this.intensity * falloff * 0.02 * sign);
            v.add(displacement);
            positions.setXYZ(i, v.x, v.y, v.z);
        }
    }

    private applySmooth(mesh: SculptMesh, indices: number[], center: THREE.Vector3) {
        const positions = mesh.getPositions();
        const v = new THREE.Vector3();
        const neighborCentroid = new THREE.Vector3();
        const temp = new THREE.Vector3();

        for (const i of indices) {
            const neighbors = mesh.adjacency[i];
            if (!neighbors || neighbors.length === 0) continue;

            neighborCentroid.set(0, 0, 0);
            for (const nIdx of neighbors) {
                temp.fromBufferAttribute(positions, nIdx);
                neighborCentroid.add(temp);
            }
            neighborCentroid.divideScalar(neighbors.length);

            v.fromBufferAttribute(positions, i);
            const dist = v.distanceTo(center);
            const falloff = this.calculateFalloff(dist, this.size);

            // Laplacian Smooth: Move towards average of neighbors
            // HC-Smooth or other volume preserving methods are better but Laplacian is standard "Melting" smooth
            // To preserve volume slightly, we can mix with original? But standard smooth just averages.

            if (this.negative) {
                // Negative smooth? Usually "Contrast" or "Sharpen".
                // Move AWAY from average?
                const diff = v.clone().sub(neighborCentroid);
                v.add(diff.multiplyScalar(this.intensity * falloff * 0.5));
            } else {
                v.lerp(neighborCentroid, this.intensity * falloff * 0.5);
            }
            positions.setXYZ(i, v.x, v.y, v.z);
        }
    }

    private applyFlatten(positions: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, indices: number[], center: THREE.Vector3, normal: THREE.Vector3) {
        const v = new THREE.Vector3();
        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(normal, center);

        for (const i of indices) {
            v.fromBufferAttribute(positions, i);
            const dist = v.distanceTo(center);
            const falloff = this.calculateFalloff(dist, this.size);
            const target = new THREE.Vector3();
            plane.projectPoint(v, target);

            if (this.negative) {
                const diff = v.clone().sub(target);
                v.add(diff.multiplyScalar(this.intensity * falloff * 0.1));
            } else {
                v.lerp(target, this.intensity * falloff * 0.1);
            }
            positions.setXYZ(i, v.x, v.y, v.z);
        }
    }

    private applyDrag(positions: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, indices: number[], center: THREE.Vector3, dragDir: THREE.Vector3) {
        const v = new THREE.Vector3();

        for (const i of indices) {
            v.fromBufferAttribute(positions, i);
            const dist = v.distanceTo(center);
            const falloff = this.calculateFalloff(dist, this.size); // Re-calculate falloff based on NEW center? 
            // In old logic, center was the INTERSECTION point (moved).
            // So vertices dragged INTO the radius were affected.
            const sign = this.negative ? -1 : 1;
            v.add(dragDir.clone().multiplyScalar(falloff * this.intensity * sign));
            positions.setXYZ(i, v.x, v.y, v.z);
        }
    }

    private applyPaint(positions: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, colors: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, indices: number[], center: THREE.Vector3) {
        const v = new THREE.Vector3();
        const c = new THREE.Color();
        const targetColor = this.color;

        for (const i of indices) {
            v.fromBufferAttribute(positions, i);
            const dist = v.distanceTo(center);
            const falloff = this.calculateFalloff(dist, this.size);

            c.fromBufferAttribute(colors, i);
            const actualTarget = this.negative ? new THREE.Color(1, 1, 1) : targetColor;
            c.lerp(actualTarget, this.intensity * falloff);
            colors.setXYZ(i, c.r, c.g, c.b);
        }
    }

    private calculateFalloff(dist: number, radius: number): number {
        if (dist >= radius) return 0;
        const x = dist / radius;

        // "Drag" tool needs a smoother, more "elastic" feel to avoid steps at the edge.
        // SculptGL "Move" tool falloff: 3x^4 - 4x^3 + 1
        // This provides a "flat interval" at the center and smooth falloff to edges.
        if (this.type === 'drag') {
            const x2 = x * x;
            const x3 = x2 * x;
            const x4 = x2 * x2;
            return 3.0 * x4 - 4.0 * x3 + 1.0;
        }

        return Math.pow(1 - x * x, 3);
    }

    private applyCrease(positions: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, indices: number[], center: THREE.Vector3, normal: THREE.Vector3) {
        const v = new THREE.Vector3();
        const direction = normal.clone().normalize();
        const sign = this.negative ? 1 : -1;

        for (const i of indices) {
            v.fromBufferAttribute(positions, i);
            const dist = v.distanceTo(center);
            const falloff = this.calculateFalloff(dist, this.size);

            const toCenter = center.clone().sub(v);
            const toCenterProjected = toCenter.clone().projectOnPlane(normal);

            const pinchStrength = this.intensity * falloff * 0.3;
            v.add(toCenterProjected.multiplyScalar(pinchStrength));

            const displacement = direction.clone().multiplyScalar(this.intensity * falloff * 0.02 * sign);
            v.add(displacement);

            positions.setXYZ(i, v.x, v.y, v.z);
        }
    }
}
