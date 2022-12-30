namespace contraption {
    export class Vector {
        x: number;
        y: number;

        constructor(x?: number, y?: number) {
            this.set(x, y);
        }

        set(x?: number, y?: number) {
            this.x = x || 0;
            this.y = y || 0;
        }

        static Clone(vec: Vector): Vector {
            return new Vector(vec.x, vec.y);
        }

        static MagnitudeSquared(vec: Vector): number {
            return (vec.x * vec.x) + (vec.y * vec.y);
        }

        static Magnitude(vec: Vector): number {
            return Math.sqrt(Vector.MagnitudeSquared(vec));
        }

        static RotateToRef(vec: Vector, angle: number, ref?: Vector): Vector {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            ref = ref || new Vector();
            const x = vec.x * cos - vec.y * sin;
            ref.y = vec.x * sin + vec.y * cos;
            ref.x = x;
            return ref;
        }

        static RotateAroundToRef(vec: Vector, angle: number, point: Vector, ref?: Vector): Vector {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            ref = ref || new Vector();
            const x = point.x + ((vec.x - point.x) * cos - (vec.y - point.y) * sin);
            ref.y = point.y + ((vec.x - point.x) * sin + (vec.y - point.y) * cos);
            ref.x = x;
            return ref;
        }

        static NormalizeToRef(vec: Vector, ref?: Vector): Vector {
            ref = ref || new Vector();
            const mag = Vector.Magnitude(vec);
            if (mag === 0)
                ref.set(0, 0);
            else
                ref.set(vec.x / mag, vec.y / mag);
            return ref;
        }

        static Dot(vecA: Vector, vecB: Vector): number {
            return (vecA.x * vecB.x) + (vecA.y * vecB.y);
        }

        static Cross(vecA: Vector, vecB: Vector): number {
            return (vecA.x * vecB.y) - (vecA.y * vecB.x);
        }

        static Cross3(vecA: Vector, vecB: Vector, vecC: Vector): number {
            return (vecB.x - vecA.x) * (vecC.y - vecA.y) - (vecB.y - vecA.y) * (vecC.x - vecA.x);
        }

        static AddToRef(vecA: Vector, vecB: Vector, ref?: Vector): Vector {
            ref = ref || new Vector();
            ref.x = vecA.x + vecB.x;
            ref.y = vecA.y + vecB.y;
            return ref;
        }

        static SubToRef(vecA: Vector, vecB: Vector, ref?: Vector): Vector {
            ref = ref || new Vector();
            ref.x = vecA.x - vecB.x;
            ref.y = vecA.y - vecB.y;
            return ref;
        }

        static MulToRef(vec: Vector, scalar: number, ref?: Vector): Vector {
            ref = ref || new Vector();
            ref.x = vec.x * scalar;
            ref.y = vec.y * scalar;
            return ref;
        }

        static DivToRef(vec: Vector, scalar: number, ref?: Vector): Vector {
            ref = ref || new Vector();
            ref.x = vec.x / scalar;
            ref.y = vec.y / scalar;
            return ref;
        }

        static PerpToRef(vec: Vector, ref?: Vector): Vector {
            ref = ref || new Vector();
            ref.x = -vec.y;
            ref.y = vec.x;
            return ref;
        }

        static NegToRef(vec: Vector, ref?: Vector): Vector {
            ref = ref || new Vector();
            ref.x = -vec.x;
            ref.y = -vec.y;
            return ref;
        }

        static Angle(vecA: Vector, vecB: Vector): number {
            return Math.atan2(vecB.y - vecA.y, vecB.x - vecA.x);
        }

        static TranslateInPlace(verts: Vector[], vec: Vector, scalar?: number): Vector[] {
            scalar = typeof scalar !== 'undefined' ? scalar : 1;

            const dx = vec.x * scalar;
            const dy = vec.y * scalar;

            for (let i = 0; i < verts.length; ++i) {
                verts[i].x += dx;
                verts[i].y += dy;
            }

            return verts;
        }

        static RotateInPlace(verts: Vector[], angle: number, point: Vector): Vector[] {
            if (angle === 0) return verts;

            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            for (let i = 0; i < verts.length; ++i) {
                const vert = verts[i];
                const dx = vert.x - point.x;
                const dy = vert.y - point.y;
                vert.x = point.x + (dx * cos - dy * sin);
                vert.y = point.y + (dx * sin + dy * cos);
            }

            return verts;
        }

        static ScaleInPlace(verts: Vector[], scaleX: number, scaleY: number, point?: Vector): Vector[] {
            if (scaleX === 1 && scaleY === 1) return verts;

            point = point || Vector.Centroid(verts);

            const delta = new Vector();

            for (let i = 0; i < verts.length; ++i) {
                const vert = verts[i];
                Vector.SubToRef(vert, point, delta);
                vert.x = point.x + delta.x * scaleX;
                vert.y = point.y + delta.y * scaleY;
            }

            return verts;
        }

        static Centroid(verts: Vector[]): Vector {
            const area = Vector.Area(verts);
            const center = new Vector();

            for (let i = 0; i < verts.length; ++i) {
                const j = (i + 1) % verts.length;
                const cross = Vector.Cross(verts[i], verts[j]);
                const temp = Vector.MulToRef(Vector.AddToRef(verts[i], verts[j]), cross);
                Vector.AddToRef(center, temp, center);
            }

            return Vector.DivToRef(center, 6 * area);
        }

        static Average(verts: Vector[]): Vector {
            const avg = new Vector();

            for (let i = 0; i < verts.length; ++i) {
                avg.x += verts[i].x;
                avg.y += verts[i].y;
            }

            return Vector.DivToRef(avg, verts.length);
        }

        static Area(verts: Vector[], signed?: boolean): number {
            let area = 0, j = verts.length - 1;

            for (let i = 0; i < verts.length; ++i) {
                area += (verts[j].x - verts[i].x) * (verts[j].y + verts[i].y);
                j = i;
            }

            if (signed)
                return area / 2;

            return Math.abs(area) / 2;
        }

        // Similar to https://www.nayuki.io/res/convex-hull-algorithm/convex-hull.ts
        static Hull(vertices: Vector[]): Vector[] {
            const upper: Vector[] = [];
            const lower: Vector[] = [];

            // sort vertices on x-axis (y-axis for ties)
            vertices = vertices.slice(0);
            vertices.sort(function (vertexA, vertexB) {
                const dx = vertexA.x - vertexB.x;
                return dx !== 0 ? dx : vertexA.y - vertexB.y;
            });

            // build lower hull
            for (let i = 0; i < vertices.length; i += 1) {
                const vertex = vertices[i];

                while (lower.length >= 2
                    && Vector.Cross3(lower[lower.length - 2], lower[lower.length - 1], vertex) <= 0) {
                    lower.pop();
                }

                lower.push(vertex);
            }

            // build upper hull
            for (let i = vertices.length - 1; i >= 0; i -= 1) {
                const vertex = vertices[i];

                while (upper.length >= 2
                    && Vector.Cross3(upper[upper.length - 2], upper[upper.length - 1], vertex) <= 0) {
                    upper.pop();
                }

                upper.push(vertex);
            }

            // concatenation of the lower and upper hulls gives the convex hull
            // omit last points because they are repeated at the beginning of the other list
            upper.pop();
            lower.pop();

            return upper.concat(lower);
        }
    }
}
