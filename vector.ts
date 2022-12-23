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
    }
}
