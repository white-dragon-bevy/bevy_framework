const exampleFolder: string = "app";
const exampleName: string = "empty";

export function bootstrap() {
	const folder = script.FindFirstChild(exampleFolder);
	assert(folder, "can't find exampleFolder :" + exampleFolder);
	const exampleScript = folder.FindFirstChild(exampleName) as ModuleScript;
	assert(exampleScript, "can't find exampleScript :" + exampleFolder);

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require(exampleScript);
}
