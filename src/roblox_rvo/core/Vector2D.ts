// export default class Vector2 {

//   static ZERO: Vector2 = new Vector2();

//   x = 0;
//   y = 0;

//   constructor(x: number = 0, y: number = 0) {
//     this.X = x;
//     this.Y = y;
//   }

//   plus(vector: Vector2): Vector2 {
//     return new Vector2(this.X + vector.X, this.Y + vector.Y);
//   }

//   //subtract
//   minus(vector: Vector2): Vector2 {
//     return new Vector2(this.X - vector.X, this.Y - vector.Y);
//   }

//   multiply(vector: Vector2): number {
//     return this.X * vector.X + this.Y * vector.Y;
//   }

//   scale(k: number): Vector2 {
//     return new Vector2(this.X * k, this.Y * k);
//   }

//   normalize(): Vector2 {
//     return this.mul(1 / this.abs());
//   }

//   absSq(): number {
//     return this.Dot(this);
//   }

//   abs(): number {
//     return math.sqrt(this.absSq());
//   }

//   clone(): Vector2 {
//     return new Vector2(this.X, this.Y);
//   }

// }
