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

            b.update(verts);

            return b;
        }

        update(verts: Vertex[], velocity?: Vector): void {
            this.min.x = Infinity;
            this.max.x = -Infinity;
            this.min.y = Infinity;
            this.max.y = -Infinity;

            for (let i = 0; i < verts.length; ++i) {
                const vert = verts[i];
                if (vert.x > this.max.x) this.max.x = vert.x;
                if (vert.x < this.min.x) this.min.x = vert.x;
                if (vert.y > this.max.y) this.max.y = vert.y;
                if (vert.y < this.min.y) this.min.y = vert.y;
            }

            if (velocity) {
                if (velocity.x > 0) {
                    this.max.x += velocity.x;
                } else {
                    this.min.x += velocity.x;
                }

                if (velocity.y > 0) {
                    this.max.y += velocity.y;
                } else {
                    this.min.y += velocity.y;
                }
            }
        }

        contains(point: Vector): boolean {
            return point.x >= this.min.x && point.x <= this.max.x
                && point.y >= this.min.y && point.y <= this.max.y;
        }

        static Overlaps(boundsA: Bounds, boundsB: Bounds): boolean {
            return (boundsA.min.x <= boundsB.max.x && boundsA.max.x >= boundsB.min.x
                && boundsA.max.y >= boundsB.min.y && boundsA.min.y <= boundsB.max.y);
        }

        translate(vec: Vector) {
            this.min.x += vec.x;
            this.max.x += vec.x;
            this.min.y += vec.y;
            this.max.y += vec.y;
        }

        shift(pos: Vector) {
            const deltaX = this.max.x - this.min.x;
            const deltaY = this.max.y - this.min.y;

            this.min.x = pos.x;
            this.max.x = pos.x + deltaX;
            this.min.y = pos.y;
            this.max.y = pos.y + deltaY;
        }
    }
}
