

export default class RVOMath {
  static RVO_EPSILON = 0.01;
  static RVO_INFINITY = math.huge; // Roblox 的无穷大表示

  static absSq(v: Vector2):number {
    return v.Dot(v);
  }

  static normalize(v: Vector2) {
    return v.mul(1 / RVOMath.abs(v)) // v / abs(v)
  }

  static distSqPointLineSegment(a:Vector2, b:Vector2, c:Vector2) {
    const aux1 = c.sub(a);
    const aux2 = b.sub(a);

    // Handle degenerate case where a == b (zero-length segment)
    const segmentLengthSq = RVOMath.absSq(aux2);
    if (segmentLengthSq === 0) {
      return RVOMath.absSq(aux1); // Distance to point a (same as point b)
    }

    // r = ((c - a) * (b - a)) / absSq(b - a)
    const r = aux1.Dot(aux2) / segmentLengthSq;

    if (r < 0) {
      return RVOMath.absSq(aux1); // absSq(c - a)
    } else if (r > 1) {
      return RVOMath.absSq(c.sub(b));// absSq(c - b)
    } else {
      return RVOMath.absSq(c.sub(a.add(aux2.mul(r))));// absSq(c - (a + r * (b - a)))
    }
  }

  static sqr(p: number): number {
    return p * p;
  }

  static det(v1: Vector2, v2: Vector2): number {
    return v1.X * v2.Y - v1.Y * v2.X;
  }

  static abs(v:Vector2): number {
    return math.sqrt(RVOMath.absSq(v));
  }

  static leftOf(a: Vector2, b: Vector2, c: Vector2): number {
    return RVOMath.det(a.sub(c), b.sub(a));
  }

  /**
   * 检查一个数字是否是 NaN
   * @param value - 要检查的数值
   * @returns 如果是 NaN 返回 true，否则返回 false
   */
  static isNaN(value: number): boolean {
    // NaN 的特性：它不等于任何值，包括它自己
    return value !== value;
  }
}