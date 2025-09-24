/**
 * Line - 有向线类
 * 用于ORCA算法中的速度障碍表示
 */

import { Vector2D } from "./vector2d";

/**
 * 有向线类
 * 表示一条通过指定点并具有指定方向的有向线
 */
export class Line {
	/**
	 * 线的方向向量
	 */
	public direction: Vector2D;

	/**
	 * 线上的一点
	 */
	public point: Vector2D;

	/**
	 * 构造一条有向线
	 * @param point - 线上的一点
	 * @param direction - 线的方向向量
	 */
	public constructor(point?: Vector2D, direction?: Vector2D) {
		this.point = point ?? Vector2D.ZERO;
		this.direction = direction ?? Vector2D.ZERO;
	}
}