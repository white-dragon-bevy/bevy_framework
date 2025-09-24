const exampleFolder: string = "render";
const exampleName: string = "moving-entities";

export function bootstrap() {
	// 先运行测试
	print("\n=== Running Startup Schedule Fix Test First ===");

	print("\n=== Now Running Original Example ===");

	// 然后运行原有的示例
	const folder = script.FindFirstChild(exampleFolder);
	assert(folder, "can't find exampleFolder :" + exampleFolder);
	const exampleScript = folder.FindFirstChild(exampleName) as ModuleScript;
	assert(exampleScript, "can't find exampleScript :" + exampleName);

	require(exampleScript)
}
