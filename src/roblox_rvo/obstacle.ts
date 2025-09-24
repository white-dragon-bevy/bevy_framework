/**
 * Obstacle - 障碍物类
 * 用于表示RVO算法中的静态障碍物
 */

import { Vector2D } from "./vector2d";

/**
 * 障碍物类
 * 表示多边形障碍物的一条边
 */
export class Obstacle {
	/**
	 * 障碍物唯一标识符
	 */
	public id: number = 0;

	/**
	 * 障碍物顶点是否为凸顶点
	 */
	public isConvex: boolean = false;

	/**
	 * 下一个障碍物边
	 */
	public next?: Obstacle;

	/**
	 * 障碍物边的起点
	 */
	public point: Vector2D = Vector2D.ZERO;

	/**
	 * 上一个障碍物边
	 */
	public previous?: Obstacle;

	/**
	 * 障碍物边的单位方向向量
	 */
	public unitDir: Vector2D = Vector2D.ZERO;
}