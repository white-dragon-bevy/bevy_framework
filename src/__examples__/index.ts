const exampleFolder: string = "leafwing-input-manager";
const exampleName: string = "simple";

export function bootstrap() {
	// 然后运行原有的示例
	const folder = script.FindFirstChild(exampleFolder);
	assert(folder, "can't find exampleFolder :" + exampleFolder);
	const exampleScript = folder.FindFirstChild(exampleName) as ModuleScript;
	assert(exampleScript, "can't find exampleScript :" + exampleName);

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const exampleModule = require(exampleScript) as { runComputedStatesExample?: () => void };

	// Call the example function if it exists
	if (exampleModule.runComputedStatesExample) {
		exampleModule.runComputedStatesExample();
	} else {
		error(`Example module does not export runComputedStatesExample function`);
	}
}
