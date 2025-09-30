
/**
 * RVO 数学工具类
 * 提供 RVO 算法所需的数学计算函数
 */
export default class RVOMath {
  static RVO_EPSILON = 0.01;
  static RVO_INFINITY = math.huge; // Roblox 的无穷大表示

  /**
   * 计算向量的长度平方
   * @param v - 输入向量
   * @returns 向量长度的平方
   */
  static absSq(v: Vector2):number {
    return v.Dot(v);
  }

  /**
   * 归一化向量
   * @param v - 输入向量
   * @returns 单位向量
   */
  static normalize(v: Vector2) {
    return v.mul(1 / RVOMath.abs(v)) // v / abs(v)
  }

  /**
   * 计算点到线段的距离平方
   * @param a - 线段起点
   * @param b - 线段终点
   * @param c - 目标点
   * @returns 距离的平方
   */
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

  /**
   * 计算数值的平方
   * @param p - 输入数值
   * @returns 数值的平方
   */
  static sqr(p: number): number {
    return p * p;
  }

  /**
   * 计算两个向量的行列式（叉积的 Z 分量）
   * @param v1 - 第一个向量
   * @param v2 - 第二个向量
   * @returns 行列式值
   */
  static det(v1: Vector2, v2: Vector2): number {
    return v1.X * v2.Y - v1.Y * v2.X;
  }

  /**
   * 计算向量的长度
   * @param v - 输入向量
   * @returns 向量长度
   */
  static abs(v:Vector2): number {
    return math.sqrt(RVOMath.absSq(v));
  }

  /**
   * 判断点 c 相对于线段 ab 的位置
   * @param a - 线段起点
   * @param b - 线段终点
   * @param c - 目标点
   * @returns 正值表示在左侧，负值表示在右侧，0 表示共线
   */
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