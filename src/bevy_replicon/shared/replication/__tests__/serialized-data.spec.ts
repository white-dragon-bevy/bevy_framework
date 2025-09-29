/**
 * @fileoverview SerializedData 单元测试
 */

import { Entity } from "@rbxts/matter";
import { createRange, rangeLength, SerializedData } from "../serialized-data";

export = (): void => {
	describe("SerializedData", () => {
		let buffer: SerializedData;

		beforeEach(() => {
			buffer = new SerializedData();
		});

		describe("基础操作", () => {
			it("应该初始化为空缓冲区", () => {
				expect(buffer.getLength()).to.equal(0);
			});

			it("应该能够清空缓冲区", () => {
				buffer.writeU32(42);
				expect(buffer.getLength() > 0).to.equal(true);

				buffer.clear();
				expect(buffer.getLength()).to.equal(0);
			});
		});

		describe("写入操作", () => {
			it("应该正确写入单个实体", () => {
				const entity = 12345 as Entity;
				const range = buffer.writeEntity(entity);

				expect(rangeLength(range) > 0).to.equal(true);
				expect(range.start).to.equal(0);
				expect(range.end).to.equal(buffer.getLength());
			});

			it("应该正确写入 tick 值", () => {
				const tick = 100;
				const range = buffer.writeTick(tick);

				expect(rangeLength(range) > 0).to.equal(true);

				// 读取验证
				const data = buffer.getRange(range);
				const [readTick] = SerializedData.readTickAt(data, 0);
				expect(readTick).to.equal(tick);
			});

			it("应该正确写入 u32 值", () => {
				const value = 65535;
				const range = buffer.writeU32(value);

				expect(rangeLength(range) > 0).to.equal(true);

				// 读取验证
				const data = buffer.getRange(range);
				const [readValue] = SerializedData.readU32At(data, 0);
				expect(readValue).to.equal(value);
			});

			it("应该正确写入实体映射", () => {
				const mappings: Array<[Entity, Entity]> = [
					[100 as Entity, 1000 as Entity],
					[101 as Entity, 1001 as Entity],
					[102 as Entity, 1002 as Entity],
				];

				const range = buffer.writeMappings(mappings);

				expect(rangeLength(range) > 0).to.equal(true);

				// 读取验证
				const data = buffer.getRange(range);
				const readMappings = SerializedData.readMappings(data);

				expect(readMappings.size()).to.equal(mappings.size());
				for (let index = 0; index < mappings.size(); index++) {
					expect(readMappings[index][0]).to.equal(mappings[index][0]);
					expect(readMappings[index][1]).to.equal(mappings[index][1]);
				}
			});

			it("应该正确写入任意字节数据", () => {
				const testData: Array<number> = [0x01, 0x02, 0x03, 0xff, 0xaa];
				const range = buffer.writeBytes(testData);

				expect(rangeLength(range)).to.equal(testData.size());

				const readData = buffer.getRange(range);
				for (let index = 0; index < testData.size(); index++) {
					expect(readData[index]).to.equal(testData[index]);
				}
			});
		});

		describe("范围操作", () => {
			it("应该能够获取指定范围的数据", () => {
				// 写入多个数据段
				const range1 = buffer.writeU32(111);
				const range2 = buffer.writeU32(222);
				const range3 = buffer.writeU32(333);

				// 读取每个范围
				const data1 = buffer.getRange(range1);
				const data2 = buffer.getRange(range2);
				const data3 = buffer.getRange(range3);

				const [value1] = SerializedData.readU32At(data1, 0);
				const [value2] = SerializedData.readU32At(data2, 0);
				const [value3] = SerializedData.readU32At(data3, 0);

				expect(value1).to.equal(111);
				expect(value2).to.equal(222);
				expect(value3).to.equal(333);
			});

			it("应该正确计算范围长度", () => {
				const range = createRange(10, 20);
				expect(rangeLength(range)).to.equal(10);
			});
		});

		describe("变长整数编码", () => {
			it("应该正确编码小整数 (< 128)", () => {
				const value = 127;
				const range = buffer.writeU32(value);

				// 小于 128 的值应该只占 1 字节
				expect(rangeLength(range)).to.equal(1);

				const data = buffer.getRange(range);
				const [readValue, bytesRead] = SerializedData.readU32At(data, 0);
				expect(readValue).to.equal(value);
				expect(bytesRead).to.equal(1);
			});

			it("应该正确编码中等整数 (128-16383)", () => {
				const value = 1000;
				const range = buffer.writeU32(value);

				// 需要 2 字节
				expect(rangeLength(range)).to.equal(2);

				const data = buffer.getRange(range);
				const [readValue, bytesRead] = SerializedData.readU32At(data, 0);
				expect(readValue).to.equal(value);
				expect(bytesRead).to.equal(2);
			});

			it("应该正确编码大整数", () => {
				const value = 1000000;
				const range = buffer.writeU32(value);

				expect(rangeLength(range) > 2).to.equal(true);

				const data = buffer.getRange(range);
				const [readValue] = SerializedData.readU32At(data, 0);
				expect(readValue).to.equal(value);
			});

			it("应该正确处理边界值", () => {
				const testValues = [0, 1, 127, 128, 255, 256, 16383, 16384, 65535];

				for (const value of testValues) {
					buffer.clear();
					const range = buffer.writeU32(value);
					const data = buffer.getRange(range);
					const [readValue] = SerializedData.readU32At(data, 0);
					expect(readValue).to.equal(value);
				}
			});
		});

		describe("实体编码", () => {
			it("应该正确编码和解码实体", () => {
				const testEntities = [0 as Entity, 1 as Entity, 100 as Entity, 10000 as Entity, 999999 as Entity];

				for (const entity of testEntities) {
					buffer.clear();
					const range = buffer.writeEntity(entity);
					const data = buffer.getRange(range);
					const [readEntity] = SerializedData.readEntityAt(data, 0);
					expect(readEntity).to.equal(entity);
				}
			});

			it("应该正确处理多个实体", () => {
				const entities = [10 as Entity, 20 as Entity, 30 as Entity];

				for (const entity of entities) {
					buffer.writeEntity(entity);
				}

				const allData = buffer.getBuffer();
				let offset = 0;

				for (const entity of entities) {
					const [readEntity, bytesRead] = SerializedData.readEntityAt(allData as Array<number>, offset);
					expect(readEntity).to.equal(entity);
					offset += bytesRead;
				}
			});
		});

		describe("映射序列化", () => {
			it("应该正确序列化空映射", () => {
				const mappings: Array<[Entity, Entity]> = [];
				const range = buffer.writeMappings(mappings);

				expect(rangeLength(range)).to.equal(0);
			});

			it("应该正确序列化单个映射", () => {
				const mappings: Array<[Entity, Entity]> = [[123 as Entity, 456 as Entity]];

				const range = buffer.writeMappings(mappings);
				const data = buffer.getRange(range);
				const readMappings = SerializedData.readMappings(data);

				expect(readMappings.size()).to.equal(1);
				expect(readMappings[0][0]).to.equal(123);
				expect(readMappings[0][1]).to.equal(456);
			});

			it("应该正确序列化大量映射", () => {
				const mappings: Array<[Entity, Entity]> = [];
				for (let index = 0; index < 100; index++) {
					mappings.push([index as Entity, (index + 10000) as Entity]);
				}

				const range = buffer.writeMappings(mappings);
				const data = buffer.getRange(range);
				const readMappings = SerializedData.readMappings(data);

				expect(readMappings.size()).to.equal(mappings.size());
				for (let index = 0; index < mappings.size(); index++) {
					expect(readMappings[index][0]).to.equal(mappings[index][0]);
					expect(readMappings[index][1]).to.equal(mappings[index][1]);
				}
			});
		});

		describe("性能测试", () => {
			it("应该能高效处理大量数据", () => {
				const startTime = os.clock();

				// 写入 1000 个值
				for (let index = 0; index < 1000; index++) {
					buffer.writeU32(index);
				}

				const writeTime = os.clock() - startTime;
				expect(writeTime < 0.1).to.equal(true); // 应该在 100ms 内完成
			});

			it("应该能高效序列化大量映射", () => {
				const mappings: Array<[Entity, Entity]> = [];
				for (let index = 0; index < 500; index++) {
					mappings.push([index as Entity, (index + 50000) as Entity]);
				}

				const startTime = os.clock();
				const range = buffer.writeMappings(mappings);
				const writeTime = os.clock() - startTime;

				expect(writeTime < 0.05).to.equal(true); // 50ms 内
				expect(rangeLength(range) > 0).to.equal(true);
			});
		});
	});
};