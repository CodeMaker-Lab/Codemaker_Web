
import { SculptMesh } from './Mesh';

export interface HistoryState {
    undo(): void;
    redo(): void;
    createRedo(): HistoryState;
}

export class HistoryManager {
    static STACK_LENGTH = 15;

    private undos: HistoryState[] = [];
    private redos: HistoryState[] = [];

    pushState(state: HistoryState) {
        this.undos.push(state);
        if (this.undos.length > HistoryManager.STACK_LENGTH) {
            this.undos.shift();
        }
        this.redos = []; // Clear redo stack on new action
    }

    getCurrentState(): HistoryState | undefined {
        return this.undos[this.undos.length - 1];
    }

    undo() {
        if (this.undos.length === 0) return;

        const state = this.undos.pop();
        if (state) {
            const redoState = state.createRedo();
            this.redos.push(redoState);
            state.undo();
        }
    }

    redo() {
        if (this.redos.length === 0) return;

        const state = this.redos.pop();
        if (state) {
            // When redoing, we might need to push a new undo state?
            // Actually, typical implementation:
            // Redo executes the action. It might need to save 'Undo' state again if the action is destructive?
            // But usually RedoState.redo() just restores the "New" values.
            // AND we push the *original* state back to 'undos' so we can undo again?
            // Wait.
            // SculptGL logic:
            // undo(): createRedo(), push to redos, state.undo().
            // redo(): state.redo(), push to undos?
            // Yes.

            state.redo();
            // We need to construct the corresponding Undo state to push back to undos?
            // In SculptGL:
            // redo() { var state = redos.pop(); state.redo(); ... }
            // But where does it go back to undos?
            // "this._redos.pop()"
            // It doesn't seem to push back to undos in the snippet I saw?
            // Wait. "this._curUndoIndex++".
            // SculptGL uses a single array for undos and an index pointer.
            // My implementation uses two arrays (stacks).
            // If I pop from Undos and push to Redos.
            // When I Redo, I pop from Redos and push to Undos.
            // I need to ensure the state object is reusable or re-created.
            // SculptGL's `createRedo` creates a NEW state object.
            // So:
            // Undo: Pop UndoState. Create RedoState (snapshotting current). Execute Undo. Push RedoState to Redos.
            // Redo: Pop RedoState. Create UndoState (snapshotting current? No, RedoState has the 'new' vals).
            // Actually, simpler:
            // GeometryState stores OldVals.
            // RedoGeometryState stores NewVals.
            // Undo: restores OldVals.
            // Redo: restores NewVals.
            // When Redoing: restore NewVals. Then create an UndoState (with OldVals - wait, getting complicated).
            // Better:
            // Use Single Stack + Pointer? Or Two Stacks where objects transform?
            // Let's stick to SculptGL's "CreateRedo" pattern.
            // Undo: 
            //   State (Undoable) -> createRedo (captures "Current" i.e. NewVals)
            //   Push Redoable to RedoStack.
            //   State.undo() (restores OldVals).
            // Redo:
            //   State (Redoable) -> createUndo (captures "Current" i.e. OldVals)?
            //   Push Undoable to UndoStack.
            //   State.redo() (restores NewVals).

            const undoState = state.createRedo(); // This effectively creates the reverse
            this.undos.push(undoState);
            state.redo();
        }
    }
}

export class GeometryState implements HistoryState {
    private mesh: SculptMesh;
    private addedIndices: Set<number> = new Set();
    private indices: number[] = [];
    private oldValues: number[] = []; // x,y,z flattened
    private oldColors: number[] = []; // r,g,b flattened (optional)

    constructor(mesh: SculptMesh) {
        this.mesh = mesh;
    }

    // Called during stroke to save original values of vertices being touched
    pushVertices(indices: number[]) {
        const positions = this.mesh.getPositions();
        const colors = this.mesh.getColors(); // Might be undefined or null? Check wrapper.
        // SculptMesh always ensures colors exist in constructor? Yes.
        // But safe to check.

        for (let i = 0; i < indices.length; i++) {
            const idx = indices[i];
            if (this.addedIndices.has(idx)) continue;

            this.addedIndices.add(idx);
            this.indices.push(idx);
            this.oldValues.push(
                positions.getX(idx),
                positions.getY(idx),
                positions.getZ(idx)
            );

            if (colors) {
                this.oldColors.push(
                    colors.getX(idx),
                    colors.getY(idx),
                    colors.getZ(idx)
                );
            }
        }
    }

    createRedo(): HistoryState {
        // Create a state that contains the CURRENT values (which are the "New" values)
        // so that 'redo' can restore them.
        const redoState = new GeometryState(this.mesh);

        // We manually populate redoState with the same indices but CURRENT position values
        const positions = this.mesh.getPositions();
        const colors = this.mesh.getColors();

        for (let i = 0; i < this.indices.length; i++) {
            const idx = this.indices[i];
            redoState.addedIndices.add(idx);
            redoState.indices.push(idx);
            redoState.oldValues.push(
                positions.getX(idx),
                positions.getY(idx),
                positions.getZ(idx)
            );
            if (colors) {
                redoState.oldColors.push(
                    colors.getX(idx),
                    colors.getY(idx),
                    colors.getZ(idx)
                );
            }
        }

        return redoState;
    }

    undo() {
        console.log(`GeometryState.undo() restoring ${this.indices.length} vertices`);
        // Restore old values
        const positions = this.mesh.getPositions();
        const colors = this.mesh.getColors();

        const hasColors = colors && this.oldColors.length > 0;

        for (let i = 0; i < this.indices.length; i++) {
            const idx = this.indices[i];
            const base = i * 3;
            positions.setXYZ(idx, this.oldValues[base], this.oldValues[base + 1], this.oldValues[base + 2]);

            if (hasColors && colors) {
                colors.setXYZ(idx, this.oldColors[base], this.oldColors[base + 1], this.oldColors[base + 2]);
            }
        }
        this.mesh.update();
    }

    redo() {
        // Same logic: restore stored values (which appear as "oldValues" in this RedoState object)
        this.undo();
    }
}
