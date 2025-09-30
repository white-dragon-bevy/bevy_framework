
/**
 * Obstacle 类
 * 表示 RVO 算法中的静态障碍物线段
 * 障碍物由多个线段首尾相连组成多边形
 */
export default class Obstacle {
	/** 障碍物线段的起点坐标 */
	point: Vector2 = Vector2.zero;

	/** 障碍物线段的单位方向向量（指向下一个顶点） */
	unitDir: Vector2 = Vector2.zero;

	/** 当前顶点是否为凸点 */
	isConvex: boolean = false;

	/** 障碍物唯一标识符 */
	id = 0;

	/** 指向前一个障碍物线段的引用 */
	previous!: Obstacle;

	/** 指向下一个障碍物线段的引用 */
	next!: Obstacle;
}
