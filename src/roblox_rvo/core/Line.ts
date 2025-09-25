

export default class Line {
    /**
     * Constructs and initializes a directed line with the specified point and
     * direction.
     *
     * @param point - A point on the directed line.
     * @param direction - The direction of the directed line.
     */
    constructor(point?: Vector2, direction?: Vector2) {
        this.direction = direction ?? Vector2.zero;
        this.point = point ?? Vector2.zero;
    }

    /**
     * The direction of this directed line.
     */
    public direction: Vector2;

    /**
     * A point on this directed line.
     */
    public point: Vector2;

}
