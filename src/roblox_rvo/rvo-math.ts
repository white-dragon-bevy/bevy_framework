/**
 * RVOMath - RVO算法数学工具类
 * 提供RVO算法所需的数学计算功能
 */

import { Vector2D } from "./vector2d";

export class RVOMath {
	/**
	 * RVO算法中的最小精度值
	 */
	public static readonly RVO_EPSILON = 0.01;

	/**
	 * 计算向量的平方长度
	 * @param vector - 输入向量
	 * @returns 平方长度值
	 */
	public static absSq(vector: Vector2D): number {
		return vector.multiply(vector);
	}

	/**
	 * 归一化向量
	 * @param vector - 输入向量
	 * @returns 归一化后的新向量
	 */
	public static normalize(vector: Vector2D): Vector2D {
		const magnitude = RVOMath.abs(vector);
		if (magnitude === 0) {
			return new Vector2D(0, 0);
		}
		return vector.scale(1 / magnitude);
	}

	/**
	 * 计算点到线段的平方距离
	 * @param segmentStart - 线段起点
	 * @param segmentEnd - 线段终点
	 * @param point - 查询点
	 * @returns 平方距离值
	 */
	public static distSqPointLineSegment(segmentStart: Vector2D, segmentEnd: Vector2D, point: Vector2D): number {
		const pointToStart = point.minus(segmentStart);
		const segmentVector = segmentEnd.minus(segmentStart);

		// 计算投影系数 r = ((c - a) * (b - a)) / absSq(b - a)
		const projectionRatio = pointToStart.multiply(segmentVector) / RVOMath.absSq(segmentVector);

		if (projectionRatio < 0) {
			// 点在线段起点之前
			return RVOMath.absSq(pointToStart);
		} else if (projectionRatio > 1) {
			// 点在线段终点之后
			return RVOMath.absSq(point.minus(segmentEnd));
		} else {
			// 点在线段上的投影
			const projection = segmentStart.plus(segmentVector.scale(projectionRatio));
			return RVOMath.absSq(point.minus(projection));
		}
	}

	/**
	 * 计算数值的平方
	 * @param value - 输入数值
	 * @returns 平方值
	 */
	public static sqr(value: number): number {
		return value * value;
	}

	/**
	 * 计算两个向量的行列式
	 * @param vector1 - 第一个向量
	 * @param vector2 - 第二个向量
	 * @returns 行列式值
	 */
	public static det(vector1: Vector2D, vector2: Vector2D): number {
		return vector1.x * vector2.y - vector1.y * vector2.x;
	}

	/**
	 * 计算向量的长度
	 * @param vector - 输入向量
	 * @returns 长度值
	 */
	public static abs(vector: Vector2D): number {
		return math.sqrt(RVOMath.absSq(vector));
	}

	/**
	 * 判断点c是否在有向线段ab的左侧
	 * @param pointA - 线段起点
	 * @param pointB - 线段终点
	 * @param pointC - 查询点
	 * @returns 正值表示左侧，负值表示右侧，0表示共线
	 */
	public static leftOf(pointA: Vector2D, pointB: Vector2D, pointC: Vector2D): number {
		return RVOMath.det(pointA.minus(pointC), pointB.minus(pointA));
	}
}