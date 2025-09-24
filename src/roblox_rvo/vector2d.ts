/**
 * Vector2D - 二维向量类
 * 提供RVO算法所需的向量运算
 */
export class Vector2D {
	/**
	 * 零向量常量
	 */
	public static readonly ZERO = new Vector2D(0, 0);

	/**
	 * X坐标
	 */
	public readonly x: number;

	/**
	 * Y坐标
	 */
	public readonly y: number;

	/**
	 * 创建一个新的二维向量
	 * @param x - X坐标值
	 * @param y - Y坐标值
	 */
	public constructor(x: number = 0, y: number = 0) {
		this.x = x;
		this.y = y;
	}

	/**
	 * 计算两个向量之间的平方距离
	 * @param vector1 - 第一个向量
	 * @param vector2 - 第二个向量
	 * @returns 平方距离值
	 */
	public static distSq(vector1: Vector2D, vector2: Vector2D): number {
		const deltaX = vector1.x - vector2.x;
		const deltaY = vector1.y - vector2.y;
		return deltaX * deltaX + deltaY * deltaY;
	}

	/**
	 * 计算两个向量的点积
	 * @param vector1 - 第一个向量
	 * @param vector2 - 第二个向量
	 * @returns 点积结果
	 */
	public static dot(vector1: Vector2D, vector2: Vector2D): number {
		return vector1.x * vector2.x + vector1.y * vector2.y;
	}

	/**
	 * 向量加法
	 * @param vector - 要相加的向量
	 * @returns 新的向量结果
	 */
	public plus(vector: Vector2D): Vector2D {
		return new Vector2D(this.x + vector.x, this.y + vector.y);
	}

	/**
	 * 向量减法
	 * @param vector - 要相减的向量
	 * @returns 新的向量结果
	 */
	public minus(vector: Vector2D): Vector2D {
		return new Vector2D(this.x - vector.x, this.y - vector.y);
	}

	/**
	 * 向量点积
	 * @param vector - 另一个向量
	 * @returns 点积结果
	 */
	public multiply(vector: Vector2D): number {
		return this.x * vector.x + this.y * vector.y;
	}

	/**
	 * 向量缩放
	 * @param scalar - 缩放因子
	 * @returns 缩放后的新向量
	 */
	public scale(scalar: number): Vector2D {
		return new Vector2D(this.x * scalar, this.y * scalar);
	}

	/**
	 * 向量归一化
	 * @returns 归一化后的新向量
	 */
	public normalize(): Vector2D {
		const magnitude = this.abs();
		if (magnitude === 0) {
			return new Vector2D(0, 0);
		}
		return this.scale(1 / magnitude);
	}

	/**
	 * 计算向量的平方长度
	 * @returns 平方长度值
	 */
	public absSq(): number {
		return this.multiply(this);
	}

	/**
	 * 计算向量的长度
	 * @returns 长度值
	 */
	public abs(): number {
		return math.sqrt(this.absSq());
	}

	/**
	 * 克隆向量
	 * @returns 新的向量副本
	 */
	public clone(): Vector2D {
		return new Vector2D(this.x, this.y);
	}
}