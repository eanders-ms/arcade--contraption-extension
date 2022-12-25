namespace contraption {
    interface Overlap {
        overlap: number;
        axis: Vector;
    }

    export class Collision {
        static _supports: Vector[] = [];
        static _overlapAB: Overlap = {
            overlap: 0,
            axis: null
        };
        static _overlapBA: Overlap = {
            overlap: 0,
            axis: null
        };

        pair: Pair;
        collided: boolean;
        bodyA: Body;
        bodyB: Body;
        parentA: Body;
        parentB: Body;
        depth: number;
        normal: Vector;
        tangent: Vector;
        penetration: Vector;
        supports: Vector[];

        constructor(bodyA: Body, bodyB: Body) {
            this.pair = null;
            this.collided = false;
            this.bodyA = bodyA;
            this.bodyB = bodyB;
            this.parentA = bodyA.parent;
            this.parentB = bodyB.parent;
            this.depth = 0;
            this.normal = new Vector();
            this.tangent = new Vector();
            this.penetration = new Vector();
            this.supports = [];
        }

        static Collides(bodyA: Body, bodyB: Body, pairs: Pairs): Collision {
            Collision.OverlapAxes(Collision._overlapAB, bodyA.vertices, bodyB.vertices, bodyA.axes);

            if (Collision._overlapAB.overlap <= 0) {
                return null;
            }

            Collision.OverlapAxes(Collision._overlapBA, bodyB.vertices, bodyA.vertices, bodyB.axes);

            if (Collision._overlapBA.overlap <= 0) {
                return null;
            }

            // reuse collision records for gc efficiency
            let pair = pairs && pairs.table[Pair.Id(bodyA, bodyB)];
            let collision: Collision;

            if (!pair) {
                collision = new Collision(bodyA, bodyB);
                collision.collided = true;
                collision.bodyA = bodyA.id < bodyB.id ? bodyA : bodyB;
                collision.bodyB = bodyA.id < bodyB.id ? bodyB : bodyA;
                collision.parentA = collision.bodyA.parent;
                collision.parentB = collision.bodyB.parent;
            } else {
                collision = pair.collision;
            }

            bodyA = collision.bodyA;
            bodyB = collision.bodyB;

            let minOverlap: Overlap;

            if (Collision._overlapAB.overlap < Collision._overlapBA.overlap) {
                minOverlap = Collision._overlapAB;
            } else {
                minOverlap = Collision._overlapBA;
            }

            let normal = collision.normal,
                supports = collision.supports,
                minAxis = minOverlap.axis,
                minAxisX = minAxis.x,
                minAxisY = minAxis.y;

            // ensure normal is facing away from bodyA
            if (minAxisX * (bodyB.position.x - bodyA.position.x) + minAxisY * (bodyB.position.y - bodyA.position.y) < 0) {
                normal.x = minAxisX;
                normal.y = minAxisY;
            } else {
                normal.x = -minAxisX;
                normal.y = -minAxisY;
            }

            collision.tangent.x = -normal.y;
            collision.tangent.y = normal.x;

            collision.depth = minOverlap.overlap;

            collision.penetration.x = normal.x * collision.depth;
            collision.penetration.y = normal.y * collision.depth;

            // find support points, there is always either exactly one or two
            let supportsB = Collision.FindSupports(bodyA, bodyB, normal, 1);
            let supportCount = 0;

            // find the supports from bodyB that are inside bodyA
            if (Vertex.Contains(bodyA.vertices, supportsB[0])) {
                supports[supportCount++] = supportsB[0];
            }

            if (Vertex.Contains(bodyA.vertices, supportsB[1])) {
                supports[supportCount++] = supportsB[1];
            }

            // find the supports from bodyA that are inside bodyB
            if (supportCount < 2) {
                let supportsA = Collision.FindSupports(bodyB, bodyA, normal, -1);

                if (Vertex.Contains(bodyB.vertices, supportsA[0])) {
                    supports[supportCount++] = supportsA[0];
                }

                if (supportCount < 2 && Vertex.Contains(bodyB.vertices, supportsA[1])) {
                    supports[supportCount++] = supportsA[1];
                }
            }

            // account for the edge case of overlapping but no vertex containment
            if (supportCount === 0) {
                supports[supportCount++] = supportsB[0];
            }

            // update supports array size
            supports.length = supportCount;

            return collision;
        }

        static OverlapAxes(result: Overlap, vertsA: Vertex[], vertsB: Vertex[], axes: Vector[]) {
            // TODO
        }

        static FindSupports(bodyA: Body, bodyB: Body, normal: Vector, direction: number): Vector[] {
            // TODO
            return [];
        }
    }
}