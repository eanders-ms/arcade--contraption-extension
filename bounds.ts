namespace contraption {
    export class Bounds {
        min: Vector;
        max: Vector;

        constructor(min?: Vector, max?: Vector) {
            this.min = Vector.Clone(min || new Vector());
            this.max = Vector.Clone(max || new Vector());
        }

        static CreateFromVerts(verts: Vertex[]): Bounds {
            const b = new Bounds();

            Bounds.Update(b, verts);

            return b;
        }

        static Update(bounds: Bounds, verts: Vertex[], velocity?: Vector): void {
            bounds.min.x = Infinity;
            bounds.max.x = -Infinity;
            bounds.min.y = Infinity;
            bounds.max.y = -Infinity;

            for (let i = 0; i < verts.length; ++i) {
                const vert = verts[i];
                if (vert.x > bounds.max.x) bounds.max.x = vert.x;
                if (vert.x < bounds.min.x) bounds.min.x = vert.x;
                if (vert.y > bounds.max.y) bounds.max.y = vert.y;
                if (vert.y < bounds.min.y) bounds.min.y = vert.y;
            }

            if (velocity) {
                if (velocity.x > 0) {
                    bounds.max.x += velocity.x;
                } else {
                    bounds.min.x += velocity.x;
                }

                if (velocity.y > 0) {
                    bounds.max.y += velocity.y;
                } else {
                    bounds.min.y += velocity.y;
                }
            }
        }

        static Contains(bounds: Bounds, point: Vector): boolean {
            return point.x >= bounds.min.x && point.x <= bounds.max.x
                && point.y >= bounds.min.y && point.y <= bounds.max.y;
        }

        static Overlaps(boundsA: Bounds, boundsB: Bounds): boolean {
            return (boundsA.min.x <= boundsB.max.x && boundsA.max.x >= boundsB.min.x
                && boundsA.max.y >= boundsB.min.y && boundsA.min.y <= boundsB.max.y);
        }

        static Translate(bounds: Bounds, vec: Vector) {
            bounds.min.x += vec.x;
            bounds.max.x += vec.x;
            bounds.min.y += vec.y;
            bounds.max.y += vec.y;
        }

        static Shift(bounds: Bounds, pos: Vector) {
            const deltaX = bounds.max.x - bounds.min.x,
                deltaY = bounds.max.y - bounds.min.y;

            bounds.min.x = pos.x;
            bounds.max.x = pos.x + deltaX;
            bounds.min.y = pos.y;
            bounds.max.y = pos.y + deltaY;
        }
    }
}
