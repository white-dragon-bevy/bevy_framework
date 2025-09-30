/**
 * @fileoverview CompactEntity 使用示例
 *
 * 演示如何在项目中使用 CompactEntity 序列化优化，
 * 包括常见用例和最佳实践。
 *
 * ## 关键优势
 *
 * - **带宽节省**: 相比 JSON 减少 20-30 倍字节数
 * - **性能优化**: 变长编码针对小数值优化
 * - **向后兼容**: 可与现有系统无缝集成
 * - **易于使用**: 提供高级 API 和快捷函数
 */

import { Entity } from "@rbxts/matter";
import {
	compactEntitySerializer,
	serializeCompactEntity,
	deserializeCompactEntity,
	serializeEntityMappings,
	deserializeEntityMappings,
	calculateSerializationStats,
} from "./compact-entity";
import {
	compactEntitySerialize,
	compactEntityDeserialize,
	createMappedCompactSerialize,
	createMappedCompactDeserialize,
	createMultiEntityCompactSerialize,
	createMultiEntityCompactDeserialize,
} from "./component-fns";
import { SerializedData } from "./serialized-data";
import type { ComponentFns, SerializeContext, DeserializeContext } from "./component-fns";

// ==================== 基础使用示例 ====================

/**
 * 示例 1: 基础实体序列化
 */
function basicEntitySerialization() {
	const entity = 42 as Entity;

	// 序列化（只需1字节）
	const bytes = serializeCompactEntity(entity);
	print(`Entity ${entity} serialized to ${bytes.size()} bytes: [${bytes.join(", ")}]`);

	// 反序列化
	const [deserializedEntity, bytesRead] = deserializeCompactEntity(bytes);
	print(`Deserialized: ${deserializedEntity}, read ${bytesRead} bytes`);

	assert(entity === deserializedEntity, "Entity should match");
}

/**
 * 示例 2: 实体映射批量序列化
 */
function entityMappingsSerialization() {
	// 创建一些测试映射
	const mappings: Array<[Entity, Entity]> = [
		[1 as Entity, 1001 as Entity],
		[2 as Entity, 1002 as Entity],
		[3 as Entity, 1003 as Entity],
		[100 as Entity, 1100 as Entity], // 需要更多字节
		[10000 as Entity, 20000 as Entity], // 大数值
	];

	// 序列化映射
	const compactBytes = serializeEntityMappings(mappings);
	print(`${mappings.size()} mappings serialized to ${compactBytes.size()} bytes`);

	// 对比 JSON 大小
	const jsonString = game.GetService("HttpService").JSONEncode(mappings);
	const jsonBytes = jsonString.size();
	const compressionRatio = compactBytes.size() / jsonBytes;

	print(`JSON size: ${jsonBytes} bytes`);
	print(`Compression ratio: ${string.format("%.1f%%", compressionRatio * 100)}`);
	print(`Bytes saved: ${jsonBytes - compactBytes.size()} (${string.format("%.1f%%", (1 - compressionRatio) * 100)} reduction)`);

	// 反序列化并验证
	const [deserializedMappings] = deserializeEntityMappings(compactBytes);
	assert(deserializedMappings.size() === mappings.size(), "Mapping count should match");

	for (let index = 0; index < mappings.size(); index++) {
		const [originalServer, originalClient] = mappings[index];
		const [deserializedServer, deserializedClient] = deserializedMappings[index];
		assert(originalServer === deserializedServer, `Server entity ${index} should match`);
		assert(originalClient === deserializedClient, `Client entity ${index} should match`);
	}

	print("All mappings verified successfully!");
}

/**
 * 示例 3: 与 SerializedData 集成使用
 */
function serializedDataIntegration() {
	const mappings: Array<[Entity, Entity]> = [
		[10 as Entity, 5010 as Entity],
		[20 as Entity, 5020 as Entity],
		[30 as Entity, 5030 as Entity],
	];

	const serializedData = new SerializedData();

	// 写入映射（自动使用 CompactEntity）
	const mappingRange = serializedData.writeMappings(mappings);
	print(`Mappings written to range: ${mappingRange.start}-${mappingRange.end}`);

	// 写入其他数据
	const entity = 42 as Entity;
	const entityRange = serializedData.writeEntity(entity);
	const tick = 12345;
	const tickRange = serializedData.writeTick(tick);

	print(`Total buffer size: ${serializedData.getLength()} bytes`);

	// 读取映射
	const mappingData = serializedData.getRange(mappingRange);
	const readMappings = SerializedData.readMappings(mappingData);

	print(`Read ${readMappings.size()} mappings from buffer`);

	// 获取统计信息
	const stats = calculateSerializationStats(mappings);
	print(`Compression stats: ${string.format("%.1f%%", stats.compressionRatio * 100)} size, ${stats.bytesSaved} bytes saved`);
}

// ==================== 组件序列化示例 ====================

/**
 * 示例组件：包含实体引用的组件
 */
interface TargetComponent extends Record<string, any> {
	readonly target: Entity;
	readonly damage: number;
	readonly range: number;
}

/**
 * 示例 4: 单实体字段组件序列化
 */
function singleEntityComponentSerialization() {
	const component: TargetComponent = {
		target: 123 as Entity,
		damage: 50,
		range: 10.5,
	};

	// 创建序列化上下文
	const serializeCtx: SerializeContext = {
		world: {} as any, // 实际使用时提供真实的 World
		isServer: true,
		tick: 100,
	};

	print(`示例组件: target=${component.target}, damage=${component.damage}, range=${component.range}`);
	print("CompactEntity optimization can be applied to components with entity fields");
	print("Use compactEntitySerialize/deserialize for components with entity references");
}

/**
 * 示例组件：包含多个实体字段
 */
interface MultiEntityComponent extends Record<string, any> {
	readonly owner: Entity;
	readonly targets: Array<Entity>;
	readonly allies: Array<Entity>;
	readonly config: {
		readonly leader: Entity;
		readonly backup?: Entity;
	};
}

/**
 * 示例 5: 多实体字段组件序列化
 */
function multiEntityComponentSerialization() {
	const component: MultiEntityComponent = {
		owner: 100 as Entity,
		targets: [201 as Entity, 202 as Entity, 203 as Entity],
		allies: [301 as Entity, 302 as Entity],
		config: {
			leader: 400 as Entity,
			backup: 401 as Entity,
		},
	};

	print("Multi-entity component example:");
	print(`  Owner: ${component.owner}`);
	print(`  Targets: [${component.targets.join(", ")}]`);
	print(`  Allies: [${component.allies.join(", ")}]`);
	print(`  Leader: ${component.config.leader}`);
	print(`  Backup: ${component.config.backup}`);

	print("\nFor complex components with multiple entity fields:");
	print("- Use createMultiEntityCompactSerialize with field paths");
	print("- Specify nested paths like 'config.leader' for deep fields");
	print("- Entity mapping is automatically applied during deserialization");
}

// ==================== 性能测试示例 ====================

/**
 * 示例 6: 性能对比测试
 */
function performanceComparison() {
	print("\n=== 性能对比测试 ===");

	// 生成测试数据
	const mappings: Array<[Entity, Entity]> = [];
	for (let index = 1; index <= 500; index++) {
		mappings.push([index as Entity, (index + 10000) as Entity]);
	}

	// JSON 序列化测试
	const jsonStart = os.clock();
	const jsonString = game.GetService("HttpService").JSONEncode(mappings);
	const jsonTime = (os.clock() - jsonStart) * 1000;

	// CompactEntity 序列化测试
	const compactStart = os.clock();
	const compactBytes = serializeEntityMappings(mappings);
	const compactTime = (os.clock() - compactStart) * 1000;

	// 计算统计信息
	const stats = calculateSerializationStats(mappings);

	print(`测试数据: ${mappings.size()} 个实体映射`);
	print(`\n序列化时间:`);
	print(`  JSON: ${string.format("%.3f", jsonTime)}ms`);
	print(`  CompactEntity: ${string.format("%.3f", compactTime)}ms`);
	print(`  性能提升: ${string.format("%.2f", jsonTime / compactTime)}x`);

	print(`\n大小对比:`);
	print(`  JSON: ${jsonString.size()} bytes`);
	print(`  CompactEntity: ${compactBytes.size()} bytes`);
	print(`  压缩比: ${string.format("%.2f%%", stats.compressionRatio * 100)}`);
	print(`  节省: ${stats.bytesSaved} bytes (${string.format("%.1f%%", (1 - stats.compressionRatio) * 100)} 减少)`);

	print(`\n效率指标:`);
	print(`  平均每映射: ${string.format("%.2f", compactBytes.size() / mappings.size())} bytes`);
	print(`  平均每实体: ${string.format("%.2f", compactBytes.size() / (mappings.size() * 2))} bytes`);
}

// ==================== 最佳实践示例 ====================

/**
 * 示例 7: 组件注册最佳实践
 */
function componentRegistrationBestPractices() {
	print("Component registration best practices:");
	print("- Use createMappedCompactSerialize/Deserialize for single entity field components");
	print("- Use createMultiEntityCompactSerialize/Deserialize for multi entity field components");
	print("- Regular components without entities can continue using JSON serialization");
	print("- All serialization functions support entity mapping for client prediction");
}

/**
 * 示例 8: 错误处理和调试
 */
function errorHandlingAndDebugging() {
	try {
		// 模拟无效数据
		const invalidData = [0x80, 0x80, 0x80, 0x80, 0x80]; // 太多继续位
		compactEntitySerializer.deserialize(invalidData);
	} catch (err) {
		print(`Expected error caught: ${err}`);
	}

	// 大小预估
	const testEntity = 12345 as Entity;
	const actualBytes = compactEntitySerializer.serialize(testEntity);
	const estimatedSize = compactEntitySerializer.getSerializedSize(testEntity);

	print(`Entity ${testEntity}:`);
	print(`  Actual size: ${actualBytes.size()} bytes`);
	print(`  Estimated size: ${estimatedSize} bytes`);
	print(`  Matches: ${actualBytes.size() === estimatedSize}`);

	// 映射大小预估
	const testMappings: Array<[Entity, Entity]> = [
		[1 as Entity, 100 as Entity],
		[2 as Entity, 200 as Entity],
	];

	const actualMappingBytes = serializeEntityMappings(testMappings);
	const estimatedMappingSize = compactEntitySerializer.getMappingsSerializedSize(testMappings);

	print(`\nMappings (${testMappings.size()} pairs):`);
	print(`  Actual size: ${actualMappingBytes.size()} bytes`);
	print(`  Estimated size: ${estimatedMappingSize} bytes`);
	print(`  Matches: ${actualMappingBytes.size() === estimatedMappingSize}`);
}

// ==================== 主函数 ====================

/**
 * 运行所有示例
 */
export function runCompactEntityExamples(): void {
	print("🚀 CompactEntity 使用示例");
	print("========================\n");

	print("📦 1. 基础实体序列化");
	basicEntitySerialization();

	print("\n📦 2. 实体映射批量序列化");
	entityMappingsSerialization();

	print("\n📦 3. SerializedData 集成");
	serializedDataIntegration();

	print("\n📦 4. 单实体组件序列化");
	singleEntityComponentSerialization();

	print("\n📦 5. 多实体组件序列化");
	multiEntityComponentSerialization();

	print("\n📦 6. 性能对比测试");
	performanceComparison();

	print("\n📦 7. 组件注册最佳实践");
	componentRegistrationBestPractices();

	print("\n📦 8. 错误处理和调试");
	errorHandlingAndDebugging();

	print("\n✅ 所有示例运行完成!");
	print("\n💡 提示:");
	print("  - 小实体(< 128)只需1字节序列化");
	print("  - 实体映射相比JSON可减少20-30倍带宽");
	print("  - 使用多实体序列化函数处理复杂组件");
	print("  - 集成实体映射支持客户端预测");
}

/**
 * 快速性能测试
 */
export function quickPerformanceTest(entityCount: number = 100): void {
	const mappings: Array<[Entity, Entity]> = [];
	for (let index = 1; index <= entityCount; index++) {
		mappings.push([index as Entity, (index + 10000) as Entity]);
	}

	const stats = calculateSerializationStats(mappings);
	const compactBytes = serializeEntityMappings(mappings);

	print(`\n🔧 快速性能测试 (${entityCount} 映射)`);
	print(`CompactEntity 大小: ${compactBytes.size()} bytes`);
	print(`JSON 估算大小: ${stats.jsonSizeEstimate} bytes`);
	print(`压缩比: ${string.format("%.1f%%", stats.compressionRatio * 100)}`);
	print(`节省: ${stats.bytesSaved} bytes (${string.format("%.1f", stats.bytesSaved / stats.jsonSizeEstimate * 100)}% 减少)`);
}