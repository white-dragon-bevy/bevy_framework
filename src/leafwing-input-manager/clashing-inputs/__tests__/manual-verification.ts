// 手动验证冲突检测逻辑的简单测试
import { BasicInputs, InputType } from "../basic-inputs";
import { KeyCode } from "../../user-input/keyboard";
import { InputChord } from "../../user-input/chord";
import { MouseButton } from "../../user-input/mouse";

/**
 * 手动验证冲突检测逻辑
 */
function verifyClashDetection(): void {
	print("=== 冲突检测逻辑验证 ===");

	// 测试1：Simple vs Simple - 不应该冲突
	print("\n1. Simple vs Simple:");
	const keyS = BasicInputs.single(KeyCode.S);
	const keyA = BasicInputs.single(KeyCode.A);
	print(`S vs A: ${keyS.clashesWith(keyA)} (期望: false)`);
	print(`A vs S: ${keyA.clashesWith(keyS)} (期望: false)`);

	// 测试2：Simple vs Chord - 当和弦包含简单输入时应该冲突
	print("\n2. Simple vs Chord:");
	const ctrlS = BasicInputs.single(InputChord.ctrl(KeyCode.S));
	print(`S vs Ctrl+S: ${keyS.clashesWith(ctrlS)} (期望: true)`);
	print(`Ctrl+S vs S: ${ctrlS.clashesWith(keyS)} (期望: true)`);

	// 测试3：Simple vs 不相关的Chord - 不应该冲突
	const ctrlA = BasicInputs.single(InputChord.ctrl(KeyCode.A));
	print(`S vs Ctrl+A: ${keyS.clashesWith(ctrlA)} (期望: false)`);
	print(`Ctrl+A vs S: ${ctrlA.clashesWith(keyS)} (期望: false)`);

	// 测试4：Chord vs Chord - 共享组件时应该冲突
	print("\n3. Chord vs Chord:");
	const ctrlShiftS = BasicInputs.single(InputChord.ctrlShift(KeyCode.S));
	print(`Ctrl+S vs Ctrl+Shift+S: ${ctrlS.clashesWith(ctrlShiftS)} (期望: true)`);
	print(`Ctrl+Shift+S vs Ctrl+S: ${ctrlShiftS.clashesWith(ctrlS)} (期望: true)`);

	// 测试5：不相关的Chord vs Chord - 不应该冲突
	const altA = BasicInputs.single(InputChord.alt(KeyCode.A));
	print(`Ctrl+S vs Alt+A: ${ctrlS.clashesWith(altA)} (期望: false)`);
	print(`Alt+A vs Ctrl+S: ${altA.clashesWith(ctrlS)} (期望: false)`);

	// 测试6：Simple vs Composite - 当复合包含简单输入时应该冲突
	print("\n4. Simple vs Composite:");
	const wasd = BasicInputs.multiple([KeyCode.W, KeyCode.A, KeyCode.S, KeyCode.D]);
	print(`S vs WASD: ${keyS.clashesWith(wasd)} (期望: true)`);
	print(`WASD vs S: ${wasd.clashesWith(keyS)} (期望: true)`);

	// 测试7：输入类型检测
	print("\n5. 输入类型检测:");
	print(`S 类型: ${keyS.getInputType()} (期望: Simple)`);
	print(`Ctrl+S 类型: ${ctrlS.getInputType()} (期望: Chord)`);
	print(`WASD 类型: ${wasd.getInputType()} (期望: Composite)`);

	// 测试8：大小计算
	print("\n6. 大小计算:");
	print(`S 大小: ${keyS.getTotalSize()} (期望: 1)`);
	print(`Ctrl+S 大小: ${ctrlS.getTotalSize()} (期望: 2)`);
	print(`WASD 大小: ${wasd.getTotalSize()} (期望: 4)`);

	// 测试9：严格子集检测
	print("\n7. 严格子集检测:");
	const keyW = BasicInputs.single(KeyCode.W);
	print(`W 是 WASD 的严格子集: ${keyW.isStrictSubset(wasd)} (期望: true)`);
	print(`WASD 是 W 的严格子集: ${wasd.isStrictSubset(keyW)} (期望: false)`);
	print(`S 是 S 的严格子集: ${keyS.isStrictSubset(keyS)} (期望: false)`);

	// 测试10：Edge Cases - 单键和弦
	print("\n8. Edge Cases:");
	const singleKeyChord = new InputChord([KeyCode.S]);
	const singleChordInputs = BasicInputs.single(singleKeyChord);
	print(`单键和弦 vs S: ${singleChordInputs.clashesWith(keyS)} (期望: false)`);
	print(`S vs 单键和弦: ${keyS.clashesWith(singleChordInputs)} (期望: false)`);

	print("\n=== 验证完成 ===");
}

/**
 * 导出验证函数用于手动测试
 */
export { verifyClashDetection };