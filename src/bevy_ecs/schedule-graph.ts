/**
 * Bevy ECS 调度图构建和分析
 * 处理系统依赖关系、拓扑排序和冲突检测
 */

import { SystemSet, NodeConfig, isSystemConfig, DependencyKind, SystemConfig, SystemSetConfig } from "./schedule-config";

/**
 * 图节点 ID
 */
export type NodeId = number;

/**
 * 图节点类型
 */
export interface GraphNode {
	id: NodeId;
	config: NodeConfig;
	/** 入边（依赖此节点的节点） */
	incoming: Set<NodeId>;
	/** 出边（此节点依赖的节点） */
	outgoing: Set<NodeId>;
}

/**
 * 调度图
 */
export class ScheduleGraph {
	private nodes = new Map<NodeId, GraphNode>();
	private systemNodes = new Map<string, NodeId>();
	private setNodes = new Map<string, NodeId>();
	private nextId = 0;

	/** 系统集成员关系 */
	private setMembers = new Map<string, Set<NodeId>>();
	/** 系统集层级关系 */
	private setHierarchy = new Map<string, Set<string>>();

	/**
	 * 添加节点到图中
	 */
	addNode(config: NodeConfig): NodeId {
		const id = this.nextId++;
		const node: GraphNode = {
			id,
			config,
			incoming: new Set(),
			outgoing: new Set(),
		};

		this.nodes.set(id, node);

		// 注册到索引
		if (isSystemConfig(config)) {
			const name = config.name || `system_${id}`;
			this.systemNodes.set(name, id);
		} else {
			this.setNodes.set(config.set.name, id);
		}

		// 处理系统集成员关系
		for (const set of config.graphInfo.hierarchy) {
			this.addToSet(id, set);
		}

		return id;
	}

	/**
	 * 将节点添加到系统集
	 */
	private addToSet(nodeId: NodeId, set: SystemSet): void {
		const setName = set.name;
		if (!this.setMembers.has(setName)) {
			this.setMembers.set(setName, new Set());
		}
		this.setMembers.get(setName)!.add(nodeId);
	}

	/**
	 * 添加系统集之间的层级关系
	 */
	addSetHierarchy(child: SystemSet, parent: SystemSet): void {
		const childName = child.name;
		const parentName = parent.name;

		if (!this.setHierarchy.has(parentName)) {
			this.setHierarchy.set(parentName, new Set());
		}
		this.setHierarchy.get(parentName)!.add(childName);

		// 将子集的所有成员也添加到父集
		const childMembers = this.setMembers.get(childName);
		if (childMembers) {
			for (const member of childMembers) {
				this.addToSet(member, parent);
			}
		}
	}

	/**
	 * 构建依赖边
	 */
	buildEdges(): void {
		for (const [id, node] of this.nodes) {
			for (const dep of node.config.graphInfo.dependencies) {
				const targetIds = this.resolveTarget(dep.target);

				for (const targetId of targetIds) {
					if (dep.kind === DependencyKind.Before) {
						// 当前节点在目标之前运行
						this.addEdge(id, targetId);
					} else {
						// 当前节点在目标之后运行
						this.addEdge(targetId, id);
					}
				}
			}
		}

		// 处理系统集依赖传播
		this.propagateSetDependencies();
	}

	/**
	 * 解析依赖目标
	 */
	private resolveTarget(target: SystemSet | string): NodeId[] {
		if (typeIs(target, "string")) {
			// 系统名称
			const id = this.systemNodes.get(target);
			return id !== undefined ? [id] : [];
		} else {
			// 系统集
			const members = this.setMembers.get(target.name);
			return members ? [...members] : [];
		}
	}

	/**
	 * 添加边
	 */
	private addEdge(from: NodeId, to: NodeId): void {
		const fromNode = this.nodes.get(from);
		const toNode = this.nodes.get(to);

		if (fromNode && toNode && from !== to) {
			fromNode.outgoing.add(to);
			toNode.incoming.add(from);
		}
	}

	/**
	 * 传播系统集依赖
	 */
	private propagateSetDependencies(): void {
		// 处理系统集节点的依赖
		for (const [setName, setId] of this.setNodes) {
			const setNode = this.nodes.get(setId);
			if (!setNode) continue;

			const members = this.setMembers.get(setName);
			if (!members) continue;

			// 将系统集的依赖传播到其成员
			for (const memberId of members) {
				// 继承出边（系统集依赖的节点，成员也依赖）
				for (const targetId of setNode.outgoing) {
					this.addEdge(memberId, targetId);
				}

				// 继承入边（依赖系统集的节点，也依赖成员）
				for (const sourceId of setNode.incoming) {
					this.addEdge(sourceId, memberId);
				}
			}
		}
	}

	/**
	 * 拓扑排序（Kahn算法）- 保持稳定的插入顺序
	 */
	topologicalSort(): NodeId[] | undefined {
		const sorted: NodeId[] = [];
		const inDegree = new Map<NodeId, number>();

		// 计算入度
		for (const [id, node] of this.nodes) {
			inDegree.set(id, node.incoming.size());
		}

		// 找出所有入度为 0 的节点，按插入顺序排序
		const queue: NodeId[] = [];
		const nodeIds: NodeId[] = [];
		for (const [id] of this.nodes) {
			nodeIds.push(id);
		}
		// 按节点 ID 顺序排序，确保稳定的执行顺序
		nodeIds.sort();
		for (const id of nodeIds) {
			if (inDegree.get(id) === 0) {
				queue.push(id);
			}
		}

		// 执行拓扑排序
		while (queue.size() > 0) {
			const nodeId = queue.shift()!;
			sorted.push(nodeId);

			const node = this.nodes.get(nodeId);
			if (!node) continue;

			// 收集度数变为0的后继节点，并按ID排序保持稳定性
			const newZeroDegreeNodes: NodeId[] = [];
			for (const successorId of node.outgoing) {
				const degree = inDegree.get(successorId)! - 1;
				inDegree.set(successorId, degree);

				if (degree === 0) {
					newZeroDegreeNodes.push(successorId);
				}
			}

			// 按节点 ID 排序后加入队列
			newZeroDegreeNodes.sort();
			for (const id of newZeroDegreeNodes) {
				queue.push(id);
			}
		}

		// 检查是否存在循环
		if (sorted.size() !== this.nodes.size()) {
			return undefined; // 存在循环
		}

		return sorted;
	}

	/**
	 * 检测循环依赖（使用 DFS）
	 */
	detectCycles(): NodeId[][] {
		const cycles: NodeId[][] = [];
		const visited = new Set<NodeId>();
		const recursionStack = new Set<NodeId>();
		const path: NodeId[] = [];

		const dfs = (nodeId: NodeId): boolean => {
			visited.add(nodeId);
			recursionStack.add(nodeId);
			path.push(nodeId);

			const node = this.nodes.get(nodeId);
			if (!node) return false;

			for (const successorId of node.outgoing) {
				if (!visited.has(successorId)) {
					if (dfs(successorId)) {
						return true;
					}
				} else if (recursionStack.has(successorId)) {
					// 找到循环
					const cycleStart = path.indexOf(successorId);
					const cycle: NodeId[] = [];
					for (let i = cycleStart; i < path.size(); i++) {
						cycle.push(path[i]);
					}
					cycles.push(cycle);
					return true;
				}
			}

			path.pop();
			recursionStack.delete(nodeId);
			return false;
		};

		for (const [nodeId] of this.nodes) {
			if (!visited.has(nodeId)) {
				dfs(nodeId);
			}
		}

		return cycles;
	}

	/**
	 * 获取系统执行顺序
	 */
	getSystemExecutionOrder(): SystemConfig[] {
		const sorted = this.topologicalSort();
		if (!sorted) {
			const cycles = this.detectCycles();
			error(`[ScheduleGraph] Circular dependency detected: ${cycles}`);
		}

		const systems: SystemConfig[] = [];
		for (const nodeId of sorted) {
			const node = this.nodes.get(nodeId);
			if (node && isSystemConfig(node.config)) {
				systems.push(node.config);
			}
		}

		return systems;
	}

	/**
	 * 检测模糊性冲突
	 */
	detectAmbiguities(): Array<[NodeId, NodeId]> {
		const ambiguities: Array<[NodeId, NodeId]> = [];
		const nodes: GraphNode[] = [];
		for (const [, node] of this.nodes) {
			nodes.push(node);
		}

		// 检查每对节点是否有明确的执行顺序
		for (let i = 0; i < nodes.size(); i++) {
			for (let j = i + 1; j < nodes.size(); j++) {
				const node1 = nodes[i];
				const node2 = nodes[j];

				// 跳过非系统节点
				if (!isSystemConfig(node1.config) || !isSystemConfig(node2.config)) {
					continue;
				}

				// 检查是否有路径连接
				const hasPath = this.hasPath(node1.id, node2.id) || this.hasPath(node2.id, node1.id);

				if (!hasPath) {
					// 检查是否应该忽略这个模糊性
					if (!this.shouldIgnoreAmbiguity(node1, node2)) {
						ambiguities.push([node1.id, node2.id]);
					}
				}
			}
		}

		return ambiguities;
	}

	/**
	 * 检查是否存在路径（简单 BFS）
	 */
	private hasPath(from: NodeId, to: NodeId): boolean {
		if (from === to) return true;

		const visited = new Set<NodeId>();
		const queue = [from];

		while (queue.size() > 0) {
			const current = queue.shift()!;
			if (visited.has(current)) continue;

			visited.add(current);

			const node = this.nodes.get(current);
			if (!node) continue;

			for (const successor of node.outgoing) {
				if (successor === to) return true;
				queue.push(successor);
			}
		}

		return false;
	}

	/**
	 * 检查是否应该忽略模糊性
	 */
	private shouldIgnoreAmbiguity(node1: GraphNode, node2: GraphNode): boolean {
		const ambiguity1 = node1.config.graphInfo.ambiguousWidth;
		const ambiguity2 = node2.config.graphInfo.ambiguousWidth;

		// 如果任一节点忽略所有模糊性
		if (ambiguity1.type === "ignoreAll" || ambiguity2.type === "ignoreAll") {
			return true;
		}

		// 检查是否在忽略的系统集中
		if (ambiguity1.type === "ignoreWithSet") {
			for (const set of ambiguity1.sets) {
				const members = this.setMembers.get(set.name);
				if (members && members.has(node2.id)) {
					return true;
				}
			}
		}

		if (ambiguity2.type === "ignoreWithSet") {
			for (const set of ambiguity2.sets) {
				const members = this.setMembers.get(set.name);
				if (members && members.has(node1.id)) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * 获取节点信息（用于调试）
	 */
	getNodeInfo(nodeId: NodeId): GraphNode | undefined {
		return this.nodes.get(nodeId);
	}

	/**
	 * 获取所有节点
	 */
	getAllNodes(): GraphNode[] {
		const nodes: GraphNode[] = [];
		for (const [, node] of this.nodes) {
			nodes.push(node);
		}
		return nodes;
	}
}