namespace contraption {
    export class Contact {
        vertex: Vertex;
        normalImpulse: number;
        tangentImpulse: number;

        constructor(vertex: Vertex) {
            this.vertex = vertex;
            this.normalImpulse = 0;
            this.tangentImpulse = 0;
        }
    }
}
