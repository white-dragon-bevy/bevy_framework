/**
 * Line 类
 * 表示 ORCA 算法中的有向约束线
 */
export default class Line {
	/**
	 * 构造并初始化有向线
	 * @param point - 线上的一个点（可选，默认零向量）
	 * @param direction - 线的方向向量（可选，默认零向量）
	 */
	constructor(point?: Vector2, direction?: Vector2) {
		this.direction = direction ?? Vector2.zero;
		this.point = point ?? Vector2.zero;
	}

	/**
	 * 有向线的方向向量
	 */
	public direction: Vector2;

	/**
	 * 有向线上的一个点
	 */
	public point: Vector2;
}
