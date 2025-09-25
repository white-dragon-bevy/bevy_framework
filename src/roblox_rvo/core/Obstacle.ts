

export default class Obstacle {
  point: Vector2 = Vector2.zero;
  unitDir: Vector2 = Vector2.zero;
  isConvex: boolean = false;
  id = 0;
  previous!: Obstacle;
  next!: Obstacle;
}
