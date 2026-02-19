import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class SculptMesh {
    geometry: THREE.BufferGeometry;
    material: THREE.MeshStandardMaterial;
    mesh: THREE.Mesh;
    adjacency: number[][] = [];

    constructor(geometry?: THREE.BufferGeometry) {
        this.geometry = geometry || new THREE.SphereGeometry(1, 128, 128);

        // FIX: Remove UVs to allow welding seams (prevents cracking at longitude line)
        this.geometry.deleteAttribute('uv');

        // FIX: Always merge vertices to weld the UV seam of the sphere
        // This ensures a watertight topology for sculpting
        this.geometry = BufferGeometryUtils.mergeVertices(this.geometry);

        this.material = new THREE.MeshStandardMaterial({
            color: 0xffffff, // White base to show vertex colors
            roughness: 0.5,
            metalness: 0.1,
            flatShading: false,
            vertexColors: true,
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);

        // Initialize colors if missing
        if (!this.geometry.attributes.color) {
            const count = this.geometry.attributes.position.count;
            const colors = new Float32Array(count * 3);
            // Default to clay color
            const clayColor = new THREE.Color(0xe0aa7e);
            for (let i = 0; i < count; i++) {
                colors[i * 3] = clayColor.r;
                colors[i * 3 + 1] = clayColor.g;
                colors[i * 3 + 2] = clayColor.b;
            }
            this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        }

        this.computeAdjacency();
    }

    getPositions() {
        return this.geometry.attributes.position;
    }

    getNormals() {
        return this.geometry.attributes.normal;
    }

    getColors() {
        return this.geometry.attributes.color;
    }

    update() {
        this.geometry.attributes.position.needsUpdate = true;
        if (this.geometry.attributes.color) {
            this.geometry.attributes.color.needsUpdate = true;
        }
        this.geometry.computeVertexNormals();

        // Critical for raycasting: update bounding volumes as mesh deforms
        this.geometry.computeBoundingSphere();
        this.geometry.computeBoundingBox();
    }

    private computeAdjacency() {
        const index = this.geometry.index;
        if (!index) return;

        const count = this.geometry.attributes.position.count;
        this.adjacency = new Array(count).fill(null).map(() => []);

        const array = index.array;
        for (let i = 0; i < array.length; i += 3) {
            const a = array[i];
            const b = array[i + 1];
            const c = array[i + 2];

            this.adjacency[a].push(b, c);
            this.adjacency[b].push(a, c);
            this.adjacency[c].push(a, b);
        }

        // Deduplicate
        for (let i = 0; i < count; i++) {
            this.adjacency[i] = Array.from(new Set(this.adjacency[i]));
        }
    }
}
