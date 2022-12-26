namespace contraption {
    export class Bodies {
        static CreateRectangle(x: number, y: number, width: number, height: number, options?: BodyCreateOptions): Body {
            options = options || {};

            options.position = new Vector(x, y);
            options.vertices = Vertex.FromPath('L 0 0 L ' + width + ' 0 L ' + width + ' ' + height + ' L 0 ' + height);

            return new Body(options);
        }

        static CreateTrapezoid(x: number, y: number, width: number, height: number, slope: number, options?: BodyCreateOptions): Body {
            options = options || {};

            slope *= 0.5;
            const roof = (1 - (slope * 2)) * width;

            const x1 = width * slope,
                x2 = x1 + roof,
                x3 = x2 + x1;

            let verticesPath: string;

            if (slope < 0.5) {
                verticesPath = 'L 0 0 L ' + x1 + ' ' + (-height) + ' L ' + x2 + ' ' + (-height) + ' L ' + x3 + ' 0';
            } else {
                verticesPath = 'L 0 0 L ' + x2 + ' ' + (-height) + ' L ' + x3 + ' 0';
            }

            options.position = new Vector(x, y);
            options.vertices = Vertex.FromPath(verticesPath);

            return new Body(options);
        }

        static CreateCircle(x: number, y: number, radius: number, options?: BodyCreateOptions, maxSides?: number): Body {
            options = options || {};

            // Approximate circle with a polygon
            maxSides = maxSides || 25;
            let sides = Math.ceil(Math.max(10, Math.min(maxSides, radius)));

            // Optimization: Ensure even number of sides (half the number of unique axes)
            if (sides % 2 === 1)
                sides += 1;

            options.circleRadius = radius;

            return Bodies.CreatePolygon(x, y, sides, radius, options);
        }

        static CreatePolygon(x: number, y: number, sides: number, radius: number, options?: BodyCreateOptions): Body {
            options = options || {};

            if (sides < 3)
                return Bodies.CreateCircle(x, y, radius, options);

            let theta = 2 * Math.PI / sides,
                path = '',
                offset = theta * 0.5;

            for (let i = 0; i < sides; i += 1) {
                const angle = offset + (i * theta),
                    xx = Math.cos(angle) * radius,
                    yy = Math.sin(angle) * radius;

                path += 'L ' + Common.round(xx, 3) + ' ' + Common.round(yy, 3) + ' ';
            }

            options.position = new Vector(x, y);
            options.vertices = Vertex.FromPath(path);

            return new Body(options);
        }
    }
}
