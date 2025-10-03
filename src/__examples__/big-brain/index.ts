/**
 * Big Brain 示例索引
 * 导出所有示例的主函数，方便外部调用
 */

import thirstExample from "./thirst";
import sequenceExample from "./sequence";
import concurrentExample from "./concurrent";

export { thirstExample, sequenceExample, concurrentExample };

/**
 * 运行所有示例（依次执行）
 * 注意：这会创建多个 App 实例，仅用于演示
 */
export function runAllExamples(): void {
	print("\n=== Running All Big Brain Examples ===\n");

	print("1. Running Thirst Example...");
	const thirstApp = thirstExample();
	thirstApp.run();

	print("\n2. Running Sequence Example...");
	const sequenceApp = sequenceExample();
	sequenceApp.run();

	print("\n3. Running Concurrent Example...");
	const concurrentApp = concurrentExample();
	concurrentApp.run();

	print("\n=== All Examples Completed ===");
}
