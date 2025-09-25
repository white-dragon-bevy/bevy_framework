/**
 * RVOObstacle 组件 - 描述静态障碍物
 * 用于定义 RVO 系统中的静态障碍物
 */

import { component } from "@rbxts/matter";

/**
 * RVOObstacle 组件数据接口
 */
export interface RVOObstacleData {
	/** 障碍物顶点列表 (逆时针顺序) */
	vertices: Array<Vector2>;
	/** 是否为凸多边形 */
	isConvex: boolean;
	/** 障碍物 ID (由系统自动分配) */
	obstacleId?: number;
	/** 是否启用 */
	enabled: boolean;
}

/**
 * RVOObstacle 组件
 * 存储静态障碍物的形状信息
 */
export const RVOObstacle = component<RVOObstacleData>("RVOObstacle");

/**
 * 创建 RVOObstacle 的辅助函数
 * @param vertices - 障碍物顶点列表
 * @param config - 额外配置
 * @returns RVOObstacle 组件数据
 */
export function createRVOObstacle(
	vertices: Array<Vector2>,
	config: Partial<RVOObstacleData> = {},
): RVOObstacleData {
	// 验证顶点数量
	if (vertices.size() < 2) {
		error("RVOObstacle requires at least 2 vertices");
	}

	// 自动检测是否为凸多边形
	const isConvex = config.isConvex ?? checkConvexity(vertices);

	return {
		vertices,
		isConvex,
		obstacleId: config.obstacleId,
		enabled: config.enabled ?? true,
	};
}

/**
 * 创建矩形障碍物
 * @param center - 中心位置
 * @param width - 宽度
 * @param height - 高度
 * @returns RVOObstacle 组件数据
 */
export function createRectangleObstacle(center: Vector2, width: number, height: number): RVOObstacleData {
	const halfWidth = width / 2;
	const halfHeight = height / 2;

	const vertices = [
		new Vector2(center.X - halfWidth, center.Y - halfHeight),
		new Vector2(center.X + halfWidth, center.Y - halfHeight),
		new Vector2(center.X + halfWidth, center.Y + halfHeight),
		new Vector2(center.X - halfWidth, center.Y + halfHeight),
	];

	return createRVOObstacle(vertices, { isConvex: true });
}

/**
 * 创建圆形障碍物 (使用多边形近似)
 * @param center - 中心位置
 * @param radius - 半径
 * @param segments - 边数 (默认 8)
 * @returns RVOObstacle 组件数据
 */
export function createCircleObstacle(center: Vector2, radius: number, segments: number = 8): RVOObstacleData {
	const vertices: Array<Vector2> = [];
	const angleStep = (math.pi * 2) / segments;

	for (let index = 0; index < segments; index++) {
		const angle = index * angleStep;
		const x = center.X + math.cos(angle) * radius;
		const y = center.Y + math.sin(angle) * radius;
		vertices.push(new Vector2(x, y));
	}

	return createRVOObstacle(vertices, { isConvex: true });
}

/**
 * 创建线段障碍物
 * @param start - 起点
 * @param endPoint - 终点
 * @returns RVOObstacle 组件数据
 */
export function createLineObstacle(start: Vector2, endPoint: Vector2): RVOObstacleData {
	return createRVOObstacle([start, endPoint], { isConvex: true });
}

/**
 * 检查多边形是否为凸多边形
 * @param vertices - 顶点列表
 * @returns 是否为凸多边形
 */
function checkConvexity(vertices: Array<Vector2>): boolean {
	const vertexCount = vertices.size();

	if (vertexCount < 3) {
		return true; // 线段视为凸
	}

	let sign: number | undefined;

	for (let index = 0; index < vertexCount; index++) {
		const current = vertices[index];
		const nextVertex = vertices[(index + 1) % vertexCount];
		const nextNextVertex = vertices[(index + 2) % vertexCount];

		const v1 = nextVertex.sub(current);
		const v2 = nextNextVertex.sub(nextVertex);

		// 计算叉积
		const crossProduct = v1.X * v2.Y - v1.Y * v2.X;

		if (math.abs(crossProduct) < 0.0001) {
			continue; // 共线点，跳过
		}

		const currentSign = crossProduct > 0 ? 1 : -1;

		if (sign === undefined) {
			sign = currentSign;
		} else if (sign !== currentSign) {
			return false; // 发现不同符号，非凸
		}
	}

	return true;
}

/**
 * 变换障碍物顶点
 * @param obstacle - 障碍物数据
 * @param transform - 变换矩阵 (CFrame)
 * @returns 变换后的顶点列表
 */
export function transformObstacleVertices(obstacle: RVOObstacleData, transform: CFrame): Array<Vector2> {
	const transformedVertices: Array<Vector2> = [];

	for (const vertex of obstacle.vertices) {
		// 将 2D 顶点转换为 3D，应用变换，再投影回 2D
		const vertex3D = new Vector3(vertex.X, 0, vertex.Y);
		const transformed3D = transform.PointToWorldSpace(vertex3D);
		transformedVertices.push(new Vector2(transformed3D.X, transformed3D.Z));
	}

	return transformedVertices;
}