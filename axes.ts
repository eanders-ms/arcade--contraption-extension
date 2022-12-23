namespace contraption.Axes {

    export function FromVerts(verts: Vertex[]): Vector[] {
        const axes: Vector[] = [];

        for (let i = 0; i < verts.length; ++i) {
            const j = (i + 1) % verts.length;
            const normal = Vector.NormalizeToRef(new Vector(
                verts[j].y - verts[i].y,
                verts[i].x - verts[j].x
            ));
            //const gradient = (normal.y === 0) ? Infinity : (normal.x / normal.y);
            axes.push(normal);
        }

        return axes;
    }

    export function RotateInPlace(axes: Vector[], angle: number): void {
        if (angle === 0) return;

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        for (let i = 0; i < axes.length; ++i) {
            const axis = axes[i];
            const xx = axis.x * cos - axis.y * sin;
            axis.y = axis.x * sin + axis.y * cos;
            axis.x = xx;
        }
    }
}
