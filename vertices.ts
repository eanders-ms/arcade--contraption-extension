namespace contraption {

    export class Vertex extends Vector {
        index: number;
        body: Body;
        isInternal: boolean;

        static Create(points: Vector[], body?: Body): Vertex[] {
            const verts: Vertex[] = [];

            for (let i = 0; i < points.length; ++i) {
                const point = points[i];
                const vert = new Vertex();
                vert.x = point.x;
                vert.y = point.y;
                vert.index = i;
                vert.body = body;
                vert.isInternal = false;
                verts.push(vert);
            }

            return verts;
        }

        static FromPath(path: string, body?: Body): Vertex[] {
            const points: Vector[] = [];
            const parts = path.toUpperCase().split(" ");

            for (let i = 0; i < parts.length; ++i) {
                if (parts[i] === "L") {
                    const x = parseFloat(parts[++i]);
                    const y = parseFloat(parts[++i]);
                    const p = new Vector(x, y);
                    points.push(p);
                }
            }

            return Vertex.Create(points, body);
        }

        static Centroid(verts: Vertex[]): Vector {
            const area = Vertex.Area(verts);
            const center = new Vector();

            for (let i = 0; i < verts.length; ++i) {
                const j = (i + 1) % verts.length;
                const cross = Vector.Cross(verts[i], verts[j]);
                const temp = Vector.MulToRef(Vector.AddToRef(verts[i], verts[j]), cross);
                Vector.AddToRef(center, temp, center);
            }

            return Vector.DivToRef(center, 6 * area);
        }

        static Average(verts: Vertex[]): Vector {
            const avg = new Vector();

            for (let i = 0; i < verts.length; ++i) {
                avg.x += verts[i].x;
                avg.y += verts[i].y;
            }

            return Vector.DivToRef(avg, verts.length);
        }

        static Area(verts: Vertex[], signed?: boolean): number {
            let area = 0, j = verts.length - 1;

            for (let i = 0; i < verts.length; ++i) {
                area += (verts[j].x - verts[i].x) * (verts[j].y + verts[i].y);
                j = i;
            }

            if (signed)
                return area / 2;

            return Math.abs(area) / 2;
        }

        static Inertia(verts: Vertex[], mass: number): number {
            let numerator = 0, denominator = 0;
            const v = verts;

            // Find the polygon's moment of inertia, using second moment of area
            // based on equations at https://www.physicsforums.com/threads/calculating-polygon-inertia.25293/post-212538
            for (let n = 0; n < v.length; ++n) {
                const j = (n + 1) % v.length;
                const cross = Math.abs(Vector.Cross(v[j], v[n]));
                numerator += cross * (Vector.Dot(v[j], v[j]) + Vector.Dot(v[j], v[n]) + Vector.Dot(v[n], v[n]));
                denominator += cross;
            }

            return (mass / 6) * (numerator / denominator);
        }

        static TranslateInPlace(verts: Vertex[], vec: Vector, scalar?: number): Vertex[] {
            scalar = typeof scalar !== 'undefined' ? scalar : 1;

            const dx = vec.x * scalar;
            const dy = vec.y * scalar;

            for (let i = 0; i < verts.length; ++i) {
                verts[i].x += dx;
                verts[i].y += dy;
            }

            return verts;
        }

        static RotateInPlace(verts: Vertex[], angle: number, point: Vector): Vertex[] {
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

        static Contains(verts: Vertex[], point: Vector): boolean {
            let currVert = verts[verts.length - 1];

            for (let i = 0; i < verts.length; ++i) {
                const nextVert = verts[i];

                if ((point.x - currVert.x) * (nextVert.y - currVert.y)
                    + (point.y - currVert.y) * (currVert.x - nextVert.x) > 0) {
                    return false;
                }
            }

            return true;
        }

        static ScaleInPlace(verts: Vertex[], scaleX: number, scaleY: number, point?: Vector): Vertex[] {
            if (scaleX === 1 && scaleY === 1) return verts;

            point = point || Vertex.Centroid(verts);

            const delta = new Vector();

            for (let i = 0; i < verts.length; ++i) {
                const vert = verts[i];
                Vector.SubToRef(vert, point, delta);
                vert.x = point.x + delta.x * scaleX;
                vert.y = point.y + delta.y * scaleY;
            }

            return verts;
        }

        static ClockwiseSortInPlace(verts: Vertex[]): Vertex[] {
            const center = Vertex.Average(verts);

            verts = verts.sort(function (vertA, vertB) {
                return Vector.Angle(center, vertA) - Vector.Angle(center, vertB);
            });

            return verts;
        }

        static Hull(vertices: Vertex[]): Vertex[] {
            const upper: Vertex[] = [];
            const lower: Vertex[] = [];

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
