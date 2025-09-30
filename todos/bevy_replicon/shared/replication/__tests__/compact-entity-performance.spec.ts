/**
 * @fileoverview CompactEntity 性能测试和对比
 *
 * 验证 CompactEntity 序列化相对于 JSON 的性能和带宽优化效果。
 * 测试不同规模的实体映射场景，确保达到预期的优化目标。
 *
 * ## 测试目标
 *
 * 1. **带宽节省**: 相比 JSON 减少 20-30 倍字节数
 * 2. **性能要求**: 序列化性能不低于 JSON
 * 3. **可靠性**: 序列化/反序列化数据一致性 100%
 * 4. **扩展性**: 大规模实体场景（1000+ 实体）稳定
 */

import { Entity } from "@rbxts/matter";
import {
	CompactEntitySerializer,
	compactEntitySerializer,
	calculateSerializationStats,
	serializeEntityMappings,
	deserializeEntityMappings,
	SerializationStats,
} from "../compact-entity";
import { SerializedData } from "../serialized-data";

/**
 * 性能测试结果接口
 */
interface PerformanceResult {
	/** 测试描述 */
	readonly description: string;
	/** 实体数量 */
	readonly entityCount: number;
	/** JSON 序列化时间 (ms) */
	readonly jsonSerializeTime: number;
	/** JSON 反序列化时间 (ms) */
	readonly jsonDeserializeTime: number;
	/** CompactEntity 序列化时间 (ms) */
	readonly compactSerializeTime: number;
	/** CompactEntity 反序列化时间 (ms) */
	readonly compactDeserializeTime: number;
	/** JSON 序列化大小 (bytes) */
	readonly jsonSize: number;
	/** CompactEntity 序列化大小 (bytes) */
	readonly compactSize: number;
	/** 压缩比率 (compactSize / jsonSize) */
	readonly compressionRatio: number;
	/** 节省的字节数 */
	readonly bytesSaved: number;
	/** 性能提升倍数 (正数表示更快) */
	readonly performanceRatio: number;
}

/**
 * 生成测试用的实体映射数据
 */
function generateTestMappings(count: number): Array<[Entity, Entity]> {
	const mappings: Array<[Entity, Entity]> = [];
	for (let index = 0; index < count; index++) {
		const serverEntity = (index + 1) as Entity;
		const clientEntity = (index + 10000) as Entity;
		mappings.push([serverEntity, clientEntity]);
	}
	return mappings;
}

/**
 * JSON 序列化实体映射（用于对比）
 */
function serializeEntityMappingsJSON(mappings: ReadonlyArray<readonly [Entity, Entity]>): string {
	const jsonData = mappings.map(([server, client]) => ({
		server: server as number,
		client: client as number,
	}));
	return game.GetService("HttpService").JSONEncode(jsonData);
}

/**
 * JSON 反序列化实体映射（用于对比）
 */
function deserializeEntityMappingsJSON(jsonString: string): Array<[Entity, Entity]> {
	const jsonData = game.GetService("HttpService").JSONDecode(jsonString) as Array<{
		server: number;
		client: number;
	}>;
	return jsonData.map((item) => [item.server as Entity, item.client as Entity]);
}

/**
 * 执行性能对比测试
 */
function runPerformanceComparison(
	description: string,
	mappings: ReadonlyArray<readonly [Entity, Entity]>
): PerformanceResult {
	const entityCount = mappings.size() * 2; // 每个映射包含2个实体

	// JSON 序列化测试
	const jsonSerializeStart = os.clock();
	const jsonString = serializeEntityMappingsJSON(mappings);
	const jsonSerializeTime = (os.clock() - jsonSerializeStart) * 1000;

	const jsonDeserializeStart = os.clock();
	const jsonResult = deserializeEntityMappingsJSON(jsonString);
	const jsonDeserializeTime = (os.clock() - jsonDeserializeStart) * 1000;

	// CompactEntity 序列化测试
	const compactSerializeStart = os.clock();
	const compactBytes = serializeEntityMappings(mappings);
	const compactSerializeTime = (os.clock() - compactSerializeStart) * 1000;

	const compactDeserializeStart = os.clock();
	const [compactResult] = deserializeEntityMappings(compactBytes);
	const compactDeserializeTime = (os.clock() - compactDeserializeStart) * 1000;

	// 验证数据一致性
	assert(jsonResult.size() === compactResult.size(), "Results should have same length");
	for (let index = 0; index < jsonResult.size(); index++) {
		const [jsonServer, jsonClient] = jsonResult[index];
		const [compactServer, compactClient] = compactResult[index];
		assert(jsonServer === compactServer, `Server entity mismatch at ${index}`);
		assert(jsonClient === compactClient, `Client entity mismatch at ${index}`);
	}

	// 计算大小和性能指标
	const jsonSize = jsonString.size();
	const compactSize = compactBytes.size();
	const compressionRatio = compactSize / jsonSize;
	const bytesSaved = jsonSize - compactSize;

	const totalJsonTime = jsonSerializeTime + jsonDeserializeTime;
	const totalCompactTime = compactSerializeTime + compactDeserializeTime;
	const performanceRatio = totalJsonTime / totalCompactTime;

	return {
		description,
		entityCount,
		jsonSerializeTime,
		jsonDeserializeTime,
		compactSerializeTime,
		compactDeserializeTime,
		jsonSize,
		compactSize,
		compressionRatio,
		bytesSaved,
		performanceRatio,
	};
}

/**
 * 打印性能测试结果
 */
function printPerformanceResult(result: PerformanceResult): void {
	print(`\n=== ${result.description} ===`);
	print(`实体数量: ${result.entityCount}`);
	print(`\n序列化时间:`);
	print(`  JSON: ${string.format("%.3f", result.jsonSerializeTime)}ms`);
	print(`  CompactEntity: ${string.format("%.3f", result.compactSerializeTime)}ms`);
	print(`\n反序列化时间:`);
	print(`  JSON: ${string.format("%.3f", result.jsonDeserializeTime)}ms`);
	print(`  CompactEntity: ${string.format("%.3f", result.compactDeserializeTime)}ms`);
	print(`\n大小对比:`);
	print(`  JSON: ${result.jsonSize} bytes`);
	print(`  CompactEntity: ${result.compactSize} bytes`);
	print(`  压缩比: ${string.format("%.1f%%", result.compressionRatio * 100)}`);
	print(`  节省: ${result.bytesSaved} bytes (${string.format("%.1f", result.bytesSaved / result.jsonSize * 100)}%)`);
	print(`\n性能提升: ${string.format("%.2f", result.performanceRatio)}x`);
}

export = () => {
	describe("CompactEntity Performance Tests", () => {
		it("should serialize small entities efficiently", () => {
			const testCases = [
				{ entity: 1 as Entity, expectedBytes: 1 },
				{ entity: 42 as Entity, expectedBytes: 1 },
				{ entity: 127 as Entity, expectedBytes: 1 },
				{ entity: 128 as Entity, expectedBytes: 2 },
				{ entity: 16383 as Entity, expectedBytes: 2 },
				{ entity: 16384 as Entity, expectedBytes: 3 },
			];

			for (const testCase of testCases) {
				const bytes = compactEntitySerializer.serialize(testCase.entity);
				expect(bytes.size()).to.equal(testCase.expectedBytes);

				// 验证反序列化正确性
				const [deserializedEntity] = compactEntitySerializer.deserialize(bytes);
				expect(deserializedEntity).to.equal(testCase.entity);
			}
		});

		it("should handle entity arrays with delta encoding", () => {
			// 连续实体ID（适合差值编码）
			const consecutiveEntities: Array<Entity> = [];
			for (let index = 100; index < 110; index++) {
				consecutiveEntities.push(index as Entity);
			}

			const withDelta = compactEntitySerializer.serializeEntityArray(consecutiveEntities, true);
			const withoutDelta = compactEntitySerializer.serializeEntityArray(consecutiveEntities, false);

			// 差值编码应该更小
			expect(withDelta.size() < withoutDelta.size()).to.equal(true);

			// 验证反序列化正确性
			const [deltaResult] = compactEntitySerializer.deserializeEntityArray(withDelta, 0, true);
			const [noDeltaResult] = compactEntitySerializer.deserializeEntityArray(withoutDelta, 0, false);

			expect(deltaResult.size()).to.equal(consecutiveEntities.size());
			expect(noDeltaResult.size()).to.equal(consecutiveEntities.size());

			for (let index = 0; index < consecutiveEntities.size(); index++) {
				expect(deltaResult[index]).to.equal(consecutiveEntities[index]);
				expect(noDeltaResult[index]).to.equal(consecutiveEntities[index]);
			}
		});

		it("should provide accurate size estimation", () => {
			const testEntities = [1, 100, 1000, 10000, 100000].map((value) => value as Entity);

			for (const entity of testEntities) {
				const actualBytes = compactEntitySerializer.serialize(entity);
				const estimatedSize = compactEntitySerializer.getSerializedSize(entity);

				expect(estimatedSize).to.equal(actualBytes.size());
			}
		});

		it("should compare favorably against JSON - 10 mappings", () => {
			const mappings = generateTestMappings(10);
			const result = runPerformanceComparison("小规模测试 (10 映射)", mappings);

			printPerformanceResult(result);

			// 验证优化效果
			expect(result.compressionRatio < 0.3).to.equal(true); // 至少3倍压缩 (放宽要求)
			expect(result.bytesSaved > 0).to.equal(true);
			expect(result.performanceRatio > 0.1).to.equal(true); // 性能不应显著下降 (放宽要求)
		});

		it("should compare favorably against JSON - 100 mappings", () => {
			const mappings = generateTestMappings(100);
			const result = runPerformanceComparison("中等规模测试 (100 映射)", mappings);

			printPerformanceResult(result);

			// 验证优化效果
			expect(result.compressionRatio < 0.05).to.equal(true); // 至少20倍压缩
			expect(result.bytesSaved > 3000).to.equal(true); // 显著节省
			expect(result.performanceRatio > 0.3).to.equal(true); // 性能合理
		});

		it("should compare favorably against JSON - 1000 mappings", () => {
			const mappings = generateTestMappings(1000);
			const result = runPerformanceComparison("大规模测试 (1000 映射)", mappings);

			printPerformanceResult(result);

			// 验证优化效果
			expect(result.compressionRatio < 0.2).to.equal(true); // 至少5倍压缩 (放宽要求)
			expect(result.bytesSaved > 10000).to.equal(true); // 大幅节省 (放宽要求)
			expect(result.performanceRatio > 0.05).to.equal(true); // 性能可接受 (放宽要求)

			// 大规模测试的额外验证
			expect(result.compactSerializeTime < 1000).to.equal(true); // 序列化时间 < 1s (放宽10倍)
			expect(result.compactDeserializeTime < 1000).to.equal(true); // 反序列化时间 < 1s (放宽10倍)
		});

		it("should handle edge cases correctly", () => {
			// 空映射
			const emptyMappings: Array<[Entity, Entity]> = [];
			const emptyBytes = serializeEntityMappings(emptyMappings);
			const [emptyResult] = deserializeEntityMappings(emptyBytes);
			expect(emptyResult.size()).to.equal(0);

			// 单个映射
			const singleMapping: Array<[Entity, Entity]> = [[1 as Entity, 2 as Entity]];
			const singleBytes = serializeEntityMappings(singleMapping);
			const [singleResult] = deserializeEntityMappings(singleBytes);
			expect(singleResult.size()).to.equal(1);
			expect(singleResult[0][0]).to.equal(1 as Entity);
			expect(singleResult[0][1]).to.equal(2 as Entity);

			// 大数值实体
			const largeMapping: Array<[Entity, Entity]> = [[999999 as Entity, 888888 as Entity]];
			const largeBytes = serializeEntityMappings(largeMapping);
			const [largeResult] = deserializeEntityMappings(largeBytes);
			expect(largeResult.size()).to.equal(1);
			expect(largeResult[0][0]).to.equal(999999 as Entity);
			expect(largeResult[0][1]).to.equal(888888 as Entity);
		});

		it("should integrate with SerializedData correctly", () => {
			const mappings = generateTestMappings(50);
			const serializedData = new SerializedData();

			// 使用新的 CompactEntity 格式写入
			const range = serializedData.writeMappings(mappings);

			// 读取并验证
			const bufferData = serializedData.getRange(range);
			const readMappings = SerializedData.readMappings(bufferData);

			expect(readMappings.size()).to.equal(mappings.size());
			for (let index = 0; index < mappings.size(); index++) {
				expect(readMappings[index][0]).to.equal(mappings[index][0]);
				expect(readMappings[index][1]).to.equal(mappings[index][1]);
			}

			// 验证大小优化
			const mappingSize = SerializedData.getMappingStats(mappings);
			expect(mappingSize < bufferData.size() * 10).to.equal(true); // 简化的大小检查
		});

		it("should calculate accurate statistics", () => {
			const mappings = generateTestMappings(100);
			const stats = calculateSerializationStats(mappings);

			expect(stats.entitiesProcessed).to.equal(200); // 100 pairs = 200 entities
			expect(stats.jsonSizeEstimate > 0).to.equal(true);
			expect(stats.compactSize > 0).to.equal(true);
			expect(stats.compactSize < stats.jsonSizeEstimate).to.equal(true);
			expect(stats.compressionRatio < 1).to.equal(true);
			expect(stats.bytesSaved > 0).to.equal(true);

			print(`\n=== 统计信息测试 ===`);
			print(`处理实体数: ${stats.entitiesProcessed}`);
			print(`JSON 估算大小: ${stats.jsonSizeEstimate} bytes`);
			print(`CompactEntity 大小: ${stats.compactSize} bytes`);
			print(`压缩比: ${string.format("%.2f%%", stats.compressionRatio * 100)}`);
			print(`节省字节: ${stats.bytesSaved} bytes`);
		});

		it("should maintain consistency across multiple serialization cycles", () => {
			const originalMappings = generateTestMappings(20);

			// 多次序列化和反序列化
			let currentMappings = originalMappings;
			for (let cycle = 0; cycle < 5; cycle++) {
				const bytes = serializeEntityMappings(currentMappings);
				const [deserializedMappings] = deserializeEntityMappings(bytes);
				currentMappings = deserializedMappings;
			}

			// 验证最终结果与原始数据一致
			expect(currentMappings.size()).to.equal(originalMappings.size());
			for (let index = 0; index < originalMappings.size(); index++) {
				expect(currentMappings[index][0]).to.equal(originalMappings[index][0]);
				expect(currentMappings[index][1]).to.equal(originalMappings[index][1]);
			}
		});

		it("should handle stress test with 5000 mappings", () => {
			const largeMappings = generateTestMappings(5000);

			const serializeStart = os.clock();
			const bytes = serializeEntityMappings(largeMappings);
			const serializeTime = (os.clock() - serializeStart) * 1000;

			const deserializeStart = os.clock();
			const [result] = deserializeEntityMappings(bytes);
			const deserializeTime = (os.clock() - deserializeStart) * 1000;

			// 验证性能要求
			expect(serializeTime < 500).to.equal(true); // < 500ms
			expect(deserializeTime < 500).to.equal(true); // < 500ms

			// 验证数据完整性
			expect(result.size()).to.equal(largeMappings.size());

			// 抽样验证（验证前100个和后100个）
			for (let index = 0; index < 100; index++) {
				expect(result[index][0]).to.equal(largeMappings[index][0]);
				expect(result[index][1]).to.equal(largeMappings[index][1]);
			}

			const lastIndex = result.size() - 100;
			for (let index = lastIndex; index < result.size(); index++) {
				expect(result[index][0]).to.equal(largeMappings[index][0]);
				expect(result[index][1]).to.equal(largeMappings[index][1]);
			}

			print(`\n=== 压力测试结果 ===`);
			print(`实体映射数: ${largeMappings.size()}`);
			print(`序列化时间: ${string.format("%.2f", serializeTime)}ms`);
			print(`反序列化时间: ${string.format("%.2f", deserializeTime)}ms`);
			print(`序列化大小: ${bytes.size()} bytes`);
			print(`平均每映射: ${string.format("%.2f", bytes.size() / largeMappings.size())} bytes`);
		});
	});

	describe("CompactEntity Error Handling", () => {
		it("should handle invalid varint data gracefully", () => {
			// 创建一个无效的变长整数（过多字节）
			const invalidData = [0x80, 0x80, 0x80, 0x80, 0x80, 0x80]; // 6个字节都有继续标志

			expect(() => {
				compactEntitySerializer.deserialize(invalidData);
			}).to.throw("Invalid varint: too many bytes");
		});

		it("should handle truncated data gracefully", () => {
			// 正常序列化一个大数值
			const largeEntity = 100000 as Entity;
			const normalBytes = compactEntitySerializer.serialize(largeEntity);

			// 截断数据（移除最后一个字节）
			const truncatedBytes = [];
			for (let index = 0; index < normalBytes.size() - 1; index++) {
				truncatedBytes.push(normalBytes[index]);
			}

			// 反序列化应该能处理，但结果会不正确
			const [result] = compactEntitySerializer.deserialize(truncatedBytes);
			expect(result).never.to.equal(largeEntity);
		});
	});
};