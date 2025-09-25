/**
 * RVO 事件定义
 * 用于 RVO 系统的事件通信
 */

/**
 * 碰撞避免事件
 * 当 Agent 执行碰撞避免时触发
 */
export interface CollisionAvoidanceEvent {
	/** 执行避碰的实体 */
	entity: number;
	/** 避免的其他实体列表 */
	avoidedEntities: readonly number[];
	/** 原始速度 */
	originalVelocity: Vector2;
	/** 新的避碰速度 */
	newVelocity: Vector2;
	/** 时间戳 */
	timestamp: number;
}

/**
 * 创建碰撞避免事件
 * @param entity - 实体 ID
 * @param avoidedEntities - 避免的实体列表
 * @param originalVelocity - 原始速度
 * @param newVelocity - 新速度
 * @returns 事件实例
 */
export function createCollisionAvoidanceEvent(
	entity: number,
	avoidedEntities: readonly number[],
	originalVelocity: Vector2,
	newVelocity: Vector2,
): CollisionAvoidanceEvent {
	return {
		entity,
		avoidedEntities,
		originalVelocity,
		newVelocity,
		timestamp: os.clock(),
	};
}

/**
 * 目标到达事件
 * 当 Agent 到达目标位置时触发
 */
export interface GoalReachedEvent {
	/** 到达目标的实体 */
	entity: number;
	/** 目标位置 */
	goalPosition: Vector2;
	/** 实际到达位置 */
	actualPosition: Vector2;
	/** 到达时的速度 */
	velocity: Vector2;
	/** 距离误差 */
	distanceError: number;
	/** 时间戳 */
	timestamp: number;
}

/**
 * 创建目标到达事件
 * @param entity - 实体 ID
 * @param goalPosition - 目标位置
 * @param actualPosition - 实际位置
 * @param velocity - 当前速度
 * @returns 事件实例
 */
export function createGoalReachedEvent(
	entity: number,
	goalPosition: Vector2,
	actualPosition: Vector2,
	velocity: Vector2,
): GoalReachedEvent {
	return {
		entity,
		goalPosition,
		actualPosition,
		velocity,
		distanceError: goalPosition.sub(actualPosition).Magnitude,
		timestamp: os.clock(),
	};
}

/**
 * 障碍物接近事件
 * 当 Agent 接近障碍物时触发
 */
export interface ObstacleNearbyEvent {
	/** 接近障碍物的实体 */
	entity: number;
	/** 障碍物实体 */
	obstacleEntity: number;
	/** 与障碍物的距离 */
	distance: number;
	/** 相对位置 */
	relativePosition: Vector2;
	/** 是否正在避让 */
	isAvoiding: boolean;
	/** 时间戳 */
	timestamp: number;
}

/**
 * 创建障碍物接近事件
 * @param entity - 实体 ID
 * @param obstacleEntity - 障碍物实体 ID
 * @param distance - 距离
 * @param relativePosition - 相对位置
 * @param isAvoiding - 是否正在避让
 * @returns 事件实例
 */
export function createObstacleNearbyEvent(
	entity: number,
	obstacleEntity: number,
	distance: number,
	relativePosition: Vector2,
	isAvoiding: boolean,
): ObstacleNearbyEvent {
	return {
		entity,
		obstacleEntity,
		distance,
		relativePosition,
		isAvoiding,
		timestamp: os.clock(),
	};
}

/**
 * 速度变化事件
 * 当 Agent 速度发生显著变化时触发
 */
export interface VelocityChangedEvent {
	/** 速度变化的实体 */
	entity: number;
	/** 之前的速度 */
	previousVelocity: Vector2;
	/** 当前速度 */
	currentVelocity: Vector2;
	/** 速度变化量 */
	deltaVelocity: Vector2;
	/** 速度变化幅度 */
	changeMagnitude: number;
	/** 时间戳 */
	timestamp: number;
}

/**
 * 创建速度变化事件
 * @param entity - 实体 ID
 * @param previousVelocity - 之前的速度
 * @param currentVelocity - 当前速度
 * @returns 事件实例
 */
export function createVelocityChangedEvent(
	entity: number,
	previousVelocity: Vector2,
	currentVelocity: Vector2,
): VelocityChangedEvent {
	const deltaVelocity = currentVelocity.sub(previousVelocity);
	return {
		entity,
		previousVelocity,
		currentVelocity,
		deltaVelocity,
		changeMagnitude: deltaVelocity.Magnitude,
		timestamp: os.clock(),
	};
}

/**
 * 检查速度是否发生显著变化
 * @param previousVelocity - 之前的速度
 * @param currentVelocity - 当前速度
 * @param threshold - 变化阈值
 * @returns 是否发生显著变化
 */
export function hasSignificantVelocityChange(
	previousVelocity: Vector2,
	currentVelocity: Vector2,
	threshold: number = 0.1,
): boolean {
	const delta = currentVelocity.sub(previousVelocity).Magnitude;
	return delta > threshold;
}