# bevy_time 模块操作手册

## 目录

- [模块概述](#模块概述)
- [核心概念](#核心概念)
- [API 详解](#api-详解)
- [高级特性](#高级特性)
- [最佳实践](#最佳实践)
- [实战示例](#实战示例)
- [常见问题解答](#常见问题解答)
- [API 参考](#api-参考)

---

## 模块概述

### 模块功能定位

`bevy_time` 是 bevy_framework 的时间管理模块,提供精确的时间追踪、时间控制和固定时间步长支持。它是从 Rust Bevy 引擎移植的企业级时间管理系统,完整实现了 Real Time、Virtual Time 和 Fixed Time 三种时间类型。

### 在整体框架中的角色

```
┌─────────────────────────────────────────┐
│           bevy_app (应用层)              │
│     TimePlugin 集成到应用生命周期         │
└─────────────────────────────────────────┘
              ↓ 提供时间资源
┌─────────────────────────────────────────┐
│         bevy_time (时间层)               │
│  ┌────────┐  ┌─────────┐  ┌──────────┐ │
│  │  Time  │  │Duration │  │TimeFixed │ │
│  └────────┘  └─────────┘  └──────────┘ │
└─────────────────────────────────────────┘
              ↓ 驱动系统执行
┌─────────────────────────────────────────┐
│       游戏系统 (Game Systems)            │
│   动画、物理、AI、网络同步等              │
└─────────────────────────────────────────┘
```

### 核心设计理念

1. **精确性**: 使用纳秒精度的 Duration 类型,保证时间计算精确
2. **多时间类型**: Real(真实)、Virtual(虚拟)、Fixed(固定) 三种时间满足不同需求
3. **时间控制**: 支持暂停、加速、减速等时间控制功能
4. **固定步长**: 提供确定性的固定时间步长,用于物理模拟和网络同步
5. **统计功能**: 内置帧率统计、帧时间监控等性能分析工具

---

## 核心概念

### Duration (时间长度)

**Duration** 是时间长度的精确表示,内部使用秒+纳秒存储,保证高精度。

```typescript
class Duration {
	// 秒数部分 (整数)
	private readonly secs: number;
	// 纳秒部分 (0-999,999,999)
	private readonly nanos: number;

	// 零时间
	static readonly ZERO: Duration;
	// 最大时间
	static readonly MAX: Duration;
}
```

**创建方式**:
```typescript
// 从秒数创建
Duration.fromSecs(1.5)          // 1.5 秒
Duration.fromMillis(1500)       // 1500 毫秒
Duration.fromMicros(1_500_000)  // 1,500,000 微秒
Duration.fromNanos(1_500_000_000) // 1,500,000,000 纳秒
```

**运算操作**:
```typescript
const d1 = Duration.fromSecs(1.0);
const d2 = Duration.fromSecs(0.5);

// 加法
const sum = d1.add(d2);          // 1.5 秒

// 减法 (饱和)
const diff = d1.saturatingSub(d2); // 0.5 秒

// 乘法
const doubled = d1.mul(2);        // 2.0 秒

// 除法
const half = d1.div(2);           // 0.5 秒

// 比较
d1.greaterThan(d2)               // true
d1.equals(d2)                    // false
```

### Time<T> (时间管理器)

**Time** 是通用时间管理类,使用类型参数 `T` 区分不同时间类型。

```typescript
class Time<T extends TimeContext = Empty> {
	// 当前帧的时间增量
	protected delta: Duration;
	// 自启动以来的总时间
	protected elapsed: Duration;
	// 包装后的总时间 (防止精度丢失)
	protected elapsedWrapped: Duration;
	// 时间包装周期 (默认 1 小时)
	protected wrapPeriod: Duration;
	// 时间类型的上下文数据
	protected context: T;
}
```

**核心方法**:
```typescript
// 推进时间
time.advanceBy(Duration.fromSecs(0.016));

// 推进到指定时间
time.advanceTo(Duration.fromSecs(10.0));

// 获取时间增量
const delta = time.getDelta();           // Duration
const deltaSecs = time.getDeltaSecs();   // number (秒)

// 获取总时间
const elapsed = time.getElapsed();       // Duration
const elapsedSecs = time.getElapsedSecs(); // number (秒)

// 包装时间 (用于高精度长时间运行)
const wrapped = time.getElapsedWrapped();
```

### Real Time (真实时间)

**Real Time** 追踪实际的物理时间,不受游戏状态影响。

```typescript
// Real 时间上下文
interface Real extends TimeContext {
	readonly __brand: "Real";
}

// 使用 Real Time
const realTime = new Time<Real>({ __brand: "Real" } as Real);
```

**特点**:
- 始终以真实速度流逝
- 不能暂停或加速
- 用于性能测量、日志时间戳等

**使用场景**:
```typescript
function measurePerformance(world: World, context: Context, app: App): void {
	const realTime = app.getResource<RealTimeResource>();
	if (!realTime) return;

	const startTime = realTime.value.getElapsed();

	// 执行操作
	heavyOperation();

	const endTime = realTime.value.getElapsed();
	const duration = endTime.saturatingSub(startTime);

	print(`Operation took ${duration.asMillis()}ms`);
}
```

### Virtual Time (虚拟时间)

**Virtual Time** 是游戏时间,可以暂停、加速或减速。

```typescript
// Virtual 时间上下文
interface Virtual extends TimeContext {
	readonly __brand: "Virtual";
	readonly paused: boolean;         // 是否暂停
	readonly relativeSpeed: number;   // 相对速度 (1.0 = 正常)
	readonly effectiveSpeed: number;  // 实际速度 (考虑暂停)
	readonly maxDelta: Duration;      // 最大增量 (防止时间跳跃)
}

// 使用 Virtual Time
const virtualTime = new Time<Virtual>({
	__brand: "Virtual",
	paused: false,
	relativeSpeed: 1.0,
	effectiveSpeed: 1.0,
	maxDelta: Duration.fromSecs(0.25),
} as Virtual);
```

**时间控制**:
```typescript
// 暂停游戏
const context = virtualTime.getContext() as Virtual;
virtualTime.setContext({
	...context,
	paused: true,
	effectiveSpeed: 0,
});

// 恢复游戏
virtualTime.setContext({
	...context,
	paused: false,
	effectiveSpeed: context.relativeSpeed,
});

// 设置 2x 速度
virtualTime.setContext({
	...context,
	relativeSpeed: 2.0,
	effectiveSpeed: context.paused ? 0 : 2.0,
});

// 设置慢动作 (0.5x)
virtualTime.setContext({
	...context,
	relativeSpeed: 0.5,
	effectiveSpeed: context.paused ? 0 : 0.5,
});
```

**使用场景**:
- 游戏暂停菜单
- 时间缓慢特效 (子弹时间)
- 游戏加速 (快进)
- 回放系统

### Fixed Time (固定时间步长)

**Fixed Time** 提供固定的时间步长,用于确定性的物理模拟和网络同步。

```typescript
// Fixed 时间上下文
interface Fixed extends TimeContext {
	readonly __brand: "Fixed";
	timestep: Duration;      // 固定时间步长
	overstep: Duration;      // 累积的时间余量
}

// TimeFixed 扩展类
class TimeFixed extends Time<Fixed> {
	// 默认 64Hz = 15.625ms
	static readonly DEFAULT_TIMESTEP = Duration.fromMicros(15625);

	// 创建方式
	static fromDuration(timestep: Duration): TimeFixed;
	static fromSeconds(seconds: number): TimeFixed;
	static fromHz(hz: number): TimeFixed;
}
```

**固定步长原理**:
```
虚拟时间增量: 33ms (一帧)
固定时间步长: 16ms

步骤:
1. 累积: overstep = 0ms + 33ms = 33ms
2. 消费: 33ms >= 16ms, 执行一次固定更新, overstep = 17ms
3. 消费: 17ms >= 16ms, 执行一次固定更新, overstep = 1ms
4. 结束: 1ms < 16ms, 等待下一帧

结果: 一帧执行了 2 次固定更新
```

**核心方法**:
```typescript
const fixedTime = TimeFixed.fromHz(64); // 64Hz = 15.625ms

// 设置时间步长
fixedTime.setTimestep(Duration.fromSecs(0.02));  // 20ms
fixedTime.setTimestepSeconds(0.02);              // 20ms
fixedTime.setTimestepHz(50);                     // 50Hz = 20ms

// 累积时间
fixedTime.accumulate(virtualDelta);

// 消费时间步 (返回是否执行了一次更新)
while (fixedTime.expend()) {
	// 执行固定更新逻辑
	runPhysics();
}

// 获取 overstep 信息
const overstep = fixedTime.overstep();           // Duration
const fraction = fixedTime.overstepFraction();   // 0.0 - 1.0
```

**使用场景**:
- 物理模拟 (确定性)
- 网络同步 (固定 tick rate)
- AI 更新 (固定频率)
- 游戏逻辑 (可预测性)

### TimePlugin (时间插件)

**TimePlugin** 将时间系统集成到应用中,自动管理所有时间资源。

```typescript
class TimePlugin extends BasePlugin {
	build(app: App): void {
		// 初始化时间资源
		app.insertResource(new RealTimeResource(realTime));
		app.insertResource(new VirtualTimeResource(virtualTime));
		app.insertResource(new FixedTimeResource(fixedTime));
		app.insertResource(new GenericTimeResource(genericTime));

		// 添加时间更新系统
		app.addSystems(BuiltinSchedules.FIRST, timeSystem);

		// 添加固定时间步系统
		app.addSystems(BuiltinSchedules.RUN_FIXED_MAIN_LOOP, runFixedMainLoop);

		// 注册时间扩展 API
		this.registerExtensions(app, { time: {...} });
	}
}
```

**自动功能**:
1. 在 `First` 调度更新所有时间资源
2. 在 `RunFixedMainLoop` 调度执行固定更新
3. 提供统一的时间访问 API
4. 内置帧率统计和性能监控

### FrameCount (帧计数器)

**FrameCount** 追踪应用启动以来的总帧数。

```typescript
class FrameCount {
	private value: number;

	// 获取当前帧数
	getValue(): number;

	// 增加帧数 (自动在 Last 调度)
	increment(): void;

	// 计算帧数差 (考虑回绕)
	wrappingSub(other: number): number;
}
```

**使用场景**:
```typescript
function everyNFrames(world: World, context: Context, app: App): void {
	const frameCount = app.ext.time.getFrameCount();

	// 每 60 帧执行一次
	if (frameCount % 60 === 0) {
		performPeriodicTask();
	}
}
```

---

## API 详解

### Duration API

#### 创建方法

```typescript
// 从不同单位创建
Duration.fromSecs(1.5)          // 1.5 秒
Duration.fromSecsF64(1.5)       // 高精度秒
Duration.fromMillis(1500)       // 毫秒
Duration.fromMicros(1_500_000)  // 微秒
Duration.fromNanos(1_500_000_000) // 纳秒

// 常量
Duration.ZERO  // 零时间
Duration.MAX   // 最大时间
```

#### 转换方法

```typescript
const duration = Duration.fromSecs(1.5);

// 转换为不同单位
duration.asSecsF32()   // 1.5 (f32 精度)
duration.asSecsF64()   // 1.5 (f64 精度)
duration.asMillis()    // 1500
duration.asMicros()    // 1,500,000
duration.asNanos()     // 1,500,000,000

// 获取组成部分
duration.asSecs()      // 1 (整数秒)
duration.subsecNanos() // 500,000,000 (纳秒余数)
```

#### 运算方法

```typescript
const d1 = Duration.fromSecs(2.0);
const d2 = Duration.fromSecs(0.5);

// 加法
d1.add(d2)  // 2.5 秒

// 减法 (饱和,最小为 0)
d1.saturatingSub(d2)  // 1.5 秒
d2.saturatingSub(d1)  // 0 秒 (不会为负)

// 检查减法 (返回 undefined 如果为负)
d1.checkedSub(d2)  // 1.5 秒
d2.checkedSub(d1)  // undefined

// 乘法
d1.mul(2)            // 4.0 秒
d1.saturatingMul(2)  // 4.0 秒 (防止溢出)
d1.checkedMul(2)     // 4.0 秒 (溢出返回 undefined)

// 除法
d1.div(2)            // 1.0 秒
d1.checkedDiv(2)     // 1.0 秒 (除 0 返回 undefined)

// Duration 除法 (得到比率)
d1.divDuration(d2)   // 4.0 (d1 是 d2 的 4 倍)
```

#### 比较方法

```typescript
const d1 = Duration.fromSecs(1.0);
const d2 = Duration.fromSecs(2.0);

// 相等
d1.equals(d2)              // false
d1.equals(Duration.fromSecs(1.0))  // true

// 零检查
Duration.ZERO.isZero()     // true
d1.isZero()                // false

// 比较
d1.lessThan(d2)            // true
d1.greaterThan(d2)         // false
d1.lessThanOrEqual(d2)     // true
d1.greaterThanOrEqual(d2)  // false

// 通用比较
d1.compare(d2)  // -1 (小于)
d1.compare(d1)  //  0 (等于)
d2.compare(d1)  //  1 (大于)
```

### Time<T> API

#### 时间推进

```typescript
const time = new Time<Virtual>({...});

// 推进指定时长
time.advanceBy(Duration.fromSecs(0.016));

// 推进到指定时间点
time.advanceTo(Duration.fromSecs(10.0));
```

#### 查询方法

```typescript
// 获取增量 (上一帧的时间)
time.getDelta()           // Duration
time.getDeltaSecs()       // number (f32)
time.getDeltaSecsF64()    // number (f64)

// 获取总时间
time.getElapsed()         // Duration
time.getElapsedSecs()     // number (f32)
time.getElapsedSecsF64()  // number (f64)

// 获取包装时间 (防止精度丢失)
time.getElapsedWrapped()        // Duration
time.getElapsedSecsWrapped()    // number (f32)
time.getElapsedSecsWrappedF64() // number (f64)
```

#### 包装周期

```typescript
// 获取包装周期
const period = time.getWrapPeriod();  // 默认 3600 秒 (1 小时)

// 设置包装周期
time.setWrapPeriod(Duration.fromSecs(60));  // 1 分钟
```

**包装周期说明**:
```typescript
// 设置 10 秒包装周期
time.setWrapPeriod(Duration.fromSecs(10));

// 时间推进
time.advanceTo(Duration.fromSecs(8));
time.getElapsed()        // 8 秒
time.getElapsedWrapped() // 8 秒

time.advanceTo(Duration.fromSecs(15));
time.getElapsed()        // 15 秒
time.getElapsedWrapped() // 5 秒 (15 % 10)

time.advanceTo(Duration.fromSecs(23));
time.getElapsed()        // 23 秒
time.getElapsedWrapped() // 3 秒 (23 % 10)
```

#### 上下文操作

```typescript
// 获取上下文 (只读)
const context = time.getContext();

// 设置新上下文
time.setContext(newContext);

// 转换为通用 Time
const genericTime = time.asGeneric();
```

### TimeFixed API

#### 创建方法

```typescript
// 默认构造 (64Hz = 15.625ms)
const fixedTime = new TimeFixed();

// 从 Duration 创建
const fixedTime = TimeFixed.fromDuration(Duration.fromMillis(20));

// 从秒数创建
const fixedTime = TimeFixed.fromSeconds(0.02);  // 20ms

// 从频率创建
const fixedTime = TimeFixed.fromHz(50);  // 50Hz = 20ms
```

#### 时间步长管理

```typescript
// 获取时间步长
const timestep = fixedTime.timestep();  // Duration

// 设置时间步长
fixedTime.setTimestep(Duration.fromMillis(20));
fixedTime.setTimestepSeconds(0.02);
fixedTime.setTimestepHz(50);
```

#### 累积和消费

```typescript
// 累积虚拟时间增量
fixedTime.accumulate(virtualDelta);

// 消费一个时间步 (如果有足够的累积)
if (fixedTime.expend()) {
	// 执行固定更新
	updatePhysics(fixedTime.timestep());
}

// 典型用法: 循环消费
while (fixedTime.expend()) {
	runFixedUpdate();
}
```

#### Overstep 管理

```typescript
// 获取累积的时间余量
const overstep = fixedTime.overstep();  // Duration

// 获取 overstep 占时间步的比例
const fraction = fixedTime.overstepFraction();      // f32 (0.0 - 1.0)
const fractionF64 = fixedTime.overstepFractionF64(); // f64

// 丢弃部分 overstep
fixedTime.discardOverstep(Duration.fromMillis(5));
```

**Overstep 用途**:
```typescript
// 插值渲染位置
function interpolatePosition(
	previousPos: Vector3,
	currentPos: Vector3,
	fixedTime: TimeFixed
): Vector3 {
	const alpha = fixedTime.overstepFraction();
	return previousPos.Lerp(currentPos, alpha);
}
```

### TimePlugin 扩展 API

TimePlugin 通过 `app.ext.time` 提供统一的时间访问接口。

#### 基本时间查询

```typescript
// 获取 Time 对象
const time = app.ext.time.getTime();
const currentTime = app.ext.time.getCurrent();

// 获取总时间 (秒)
const elapsed = app.ext.time.getElapsedSeconds();

// 获取增量时间 (秒)
const delta = app.ext.time.getDeltaSeconds();

// 获取时间 (毫秒)
const elapsedMs = app.ext.time.getElapsedMillis();
const deltaMs = app.ext.time.getDeltaMillis();
```

#### 时间控制

```typescript
// 暂停游戏
app.ext.time.pause();

// 恢复游戏
app.ext.time.resume();

// 检查是否暂停
if (app.ext.time.isPaused()) {
	print("Game is paused");
}

// 设置时间缩放
app.ext.time.setTimeScale(2.0);   // 2x 速度
app.ext.time.setTimeScale(0.5);   // 0.5x 速度 (慢动作)
app.ext.time.setTimeScale(0.0);   // 冻结 (相当于暂停)

// 获取时间缩放
const scale = app.ext.time.getTimeScale();  // 1.0 = 正常速度

// 手动推进时间 (用于测试)
app.ext.time.advanceTime(0.016);  // 推进 16ms

// 重置时间
app.ext.time.reset();
```

#### 统计功能

```typescript
// 获取平均 FPS (基于最近 60 帧)
const avgFPS = app.ext.time.getAverageFPS();

// 获取瞬时 FPS (上一帧)
const instantFPS = app.ext.time.getInstantFPS();

// 获取帧时间统计 (毫秒)
const minFrameTime = app.ext.time.getMinFrameTime();
const maxFrameTime = app.ext.time.getMaxFrameTime();
const avgFrameTime = app.ext.time.getAverageFrameTime();

// 重置统计信息
app.ext.time.resetStats();
```

#### 帧计数

```typescript
// 获取当前帧数
const frameCount = app.ext.time.getFrameCount();

// 每 N 帧执行
if (frameCount % 60 === 0) {
	performPeriodicTask();
}
```

---

## 高级特性

### 时间包装 (Wrap Period)

长时间运行的应用会遇到浮点精度问题。Time 使用包装机制解决这个问题。

#### 精度问题示例

```typescript
// 问题: 长时间后精度丢失
let time = 0.0;
for (let i = 0; i < 1_000_000; i++) {
	time += 0.016;  // 16ms
}
// time 可能不等于 16000.0,存在累积误差
```

#### 包装解决方案

```typescript
const time = new Time({});
time.setWrapPeriod(Duration.fromSecs(3600));  // 1 小时

// 正常时间继续增长
time.getElapsed()  // 可能是几小时

// 包装时间保持在 0-3600 秒范围,精度高
time.getElapsedWrapped()  // 始终 < 3600 秒
```

#### 选择包装周期

```typescript
// 短周期 (用于动画)
time.setWrapPeriod(Duration.fromSecs(60));  // 1 分钟

// 中等周期 (默认)
time.setWrapPeriod(Duration.fromSecs(3600));  // 1 小时

// 长周期 (谨慎使用)
time.setWrapPeriod(Duration.fromSecs(86400));  // 24 小时
```

**建议**:
- 动画系统: 60-300 秒
- 常规游戏: 3600 秒 (1 小时)
- 长时间模拟: 根据需要调整

### 固定时间步插值

固定时间步更新和渲染更新频率不同,需要插值平滑显示。

#### 问题说明

```
固定更新: 50Hz (20ms)
渲染更新: 60Hz (16.67ms)

时间轴:
固定: |----1----|----2----|----3----|
渲染: |---1---|---2---|---3---|---4---|

渲染帧 2 在固定更新 1 和 2 之间,
需要插值计算位置
```

#### 插值实现

```typescript
// 物理组件
interface PhysicsBody {
	position: Vector3;
	previousPosition: Vector3;
}

// 固定更新系统 (FixedUpdate 调度)
function physicsSystem(world: World, context: Context): void {
	for (const [entity, body] of world.query(PhysicsBody)) {
		// 保存上一帧位置
		body.previousPosition = body.position;

		// 更新物理
		body.position = body.position.add(body.velocity.mul(FIXED_DELTA));
	}
}

// 渲染系统 (PostUpdate 调度)
function renderSystem(world: World, context: Context, app: App): void {
	const fixedTime = app.getResource<FixedTimeResource>();
	if (!fixedTime) return;

	// 插值因子 (0.0 - 1.0)
	const alpha = fixedTime.value.overstepFraction();

	for (const [entity, body] of world.query(PhysicsBody)) {
		// 插值位置
		const renderPos = body.previousPosition.Lerp(body.position, alpha);

		// 渲染到 renderPos
		renderAtPosition(entity, renderPos);
	}
}
```

### 时间缩放的应用

#### 子弹时间效果

```typescript
// 触发子弹时间
function triggerBulletTime(app: App, duration: number): void {
	app.ext.time.setTimeScale(0.2);  // 减速到 20%

	// duration 秒后恢复
	task.delay(duration, () => {
		app.ext.time.setTimeScale(1.0);
	});
}

// 在游戏中使用
triggerBulletTime(app, 3.0);  // 3 秒子弹时间
```

#### 快进功能

```typescript
// 策略游戏中的快进
function setGameSpeed(app: App, speed: number): void {
	// speed: 1.0 (正常), 2.0 (2倍速), 4.0 (4倍速)
	app.ext.time.setTimeScale(speed);
}

// UI 按钮
buttonNormal.Activated.Connect(() => setGameSpeed(app, 1.0));
buttonFast.Activated.Connect(() => setGameSpeed(app, 2.0));
buttonVeryFast.Activated.Connect(() => setGameSpeed(app, 4.0));
```

#### 渐进式时间缩放

```typescript
function smoothTimeScale(
	app: App,
	targetScale: number,
	duration: number
): void {
	const startScale = app.ext.time.getTimeScale();
	const startTime = os.clock();

	const connection = RunService.Heartbeat.Connect(() => {
		const elapsed = os.clock() - startTime;
		const t = math.min(elapsed / duration, 1.0);

		// 平滑插值
		const scale = startScale + (targetScale - startScale) * t;
		app.ext.time.setTimeScale(scale);

		if (t >= 1.0) {
			connection.Disconnect();
		}
	});
}

// 平滑进入慢动作
smoothTimeScale(app, 0.3, 0.5);  // 0.5 秒过渡到 0.3x 速度
```

### 多时间系统集成

有时需要同时使用多种时间类型。

```typescript
function advancedGameSystem(world: World, context: Context, app: App): void {
	// Real Time - 用于性能测量
	const realTime = app.getResource<RealTimeResource>();
	const startTime = realTime?.value.getElapsed();

	// Virtual Time - 用于游戏逻辑
	const virtualTime = app.getResource<VirtualTimeResource>();
	const gameDelta = virtualTime?.value.getDelta();

	// Fixed Time - 检查固定更新状态
	const fixedTime = app.getResource<FixedTimeResource>();
	const physicsOverstep = fixedTime?.value.overstep();

	// 根据不同时间执行不同逻辑
	if (gameDelta && !gameDelta.isZero()) {
		updateGameLogic(gameDelta);
	}

	// 性能日志
	const endTime = realTime?.value.getElapsed();
	if (startTime && endTime) {
		const duration = endTime.saturatingSub(startTime);
		if (duration.asMillis() > 16) {
			warn(`System took ${duration.asMillis()}ms`);
		}
	}
}
```

### 性能监控和诊断

TimePlugin 内置性能统计功能。

#### 实时 FPS 显示

```typescript
function createFPSDisplay(app: App): void {
	const gui = Players.LocalPlayer?.WaitForChild("PlayerGui");
	if (!gui) return;

	const screenGui = new Instance("ScreenGui", gui);
	const label = new Instance("TextLabel", screenGui);
	label.Size = UDim2.fromOffset(200, 50);
	label.Position = UDim2.fromScale(0, 0);

	// 每帧更新
	RunService.RenderStepped.Connect(() => {
		const fps = app.ext.time.getInstantFPS();
		const avgFps = app.ext.time.getAverageFPS();

		label.Text = `FPS: ${math.floor(fps)}\nAvg: ${math.floor(avgFps)}`;

		// 根据 FPS 改变颜色
		if (fps >= 55) {
			label.TextColor3 = Color3.fromRGB(0, 255, 0);  // 绿色
		} else if (fps >= 30) {
			label.TextColor3 = Color3.fromRGB(255, 255, 0);  // 黄色
		} else {
			label.TextColor3 = Color3.fromRGB(255, 0, 0);  // 红色
		}
	});
}
```

#### 性能分析报告

```typescript
function generatePerformanceReport(app: App): void {
	const avgFPS = app.ext.time.getAverageFPS();
	const minFrameTime = app.ext.time.getMinFrameTime();
	const maxFrameTime = app.ext.time.getMaxFrameTime();
	const avgFrameTime = app.ext.time.getAverageFrameTime();

	print("=== Performance Report ===");
	print(`Average FPS: ${avgFPS.toFixed(2)}`);
	print(`Min Frame Time: ${minFrameTime.toFixed(2)}ms`);
	print(`Max Frame Time: ${maxFrameTime.toFixed(2)}ms`);
	print(`Avg Frame Time: ${avgFrameTime.toFixed(2)}ms`);
	print(`Target Frame Time: 16.67ms (60 FPS)`);

	if (avgFrameTime > 16.67) {
		warn(`Performance issue: Avg frame time exceeds 16.67ms`);
	}
}

// 每 60 秒生成一次报告
setInterval(() => {
	generatePerformanceReport(app);
	app.ext.time.resetStats();  // 重置统计
}, 60_000);
```

---

## 最佳实践

### Duration 使用规范

#### ✅ 推荐做法

```typescript
// 使用 Duration 存储时间
interface Cooldown {
	duration: Duration;
	remaining: Duration;
}

// 使用 Duration 进行时间计算
function updateCooldown(cooldown: Cooldown, delta: Duration): void {
	cooldown.remaining = cooldown.remaining.saturatingSub(delta);
}

// 使用 Duration 比较
if (cooldown.remaining.equals(Duration.ZERO)) {
	// 冷却完成
}
```

#### ❌ 不推荐做法

```typescript
// 不要直接使用秒数 (精度问题)
interface BadCooldown {
	duration: number;  // ❌
	remaining: number; // ❌
}

// 不要使用浮点运算
function badUpdate(cooldown: BadCooldown, delta: number): void {
	cooldown.remaining -= delta;  // ❌ 累积误差
	if (cooldown.remaining <= 0) {  // ❌ 浮点比较问题
		cooldown.remaining = 0;
	}
}
```

### 时间类型选择指南

| 需求场景 | 推荐时间类型 | 理由 |
|---------|-------------|------|
| 游戏逻辑 | Virtual Time | 需要暂停和速度控制 |
| 物理模拟 | Fixed Time | 需要确定性和稳定性 |
| 网络同步 | Fixed Time | 固定 tick rate |
| 动画播放 | Virtual Time | 跟随游戏时间 |
| UI 动画 | Real Time | 始终流畅 |
| 性能测量 | Real Time | 真实时间 |
| 粒子效果 | Virtual Time | 跟随游戏节奏 |
| 音频播放 | Real Time | 不受游戏暂停影响 |
| 日志时间戳 | Real Time | 真实时间记录 |

### 固定时间步最佳实践

#### 选择合适的频率

```typescript
// 物理模拟: 50-100 Hz
const physicsTime = TimeFixed.fromHz(64);  // 64Hz 是个好平衡点

// 网络同步: 20-60 Hz
const networkTime = TimeFixed.fromHz(30);  // 30Hz 适合大多数游戏

// AI 更新: 10-30 Hz
const aiTime = TimeFixed.fromHz(20);  // AI 不需要太高频率
```

#### 防止死螺旋 (Death Spiral)

```typescript
// 问题: 如果一帧耗时太长,会累积大量 overstep,
// 导致下一帧执行过多固定更新,形成恶性循环

// 解决: 限制单帧最大固定更新次数
function runFixedMainLoopSafe(
	virtualDelta: Duration,
	fixedTime: TimeFixed,
	runSchedule: () => void,
): void {
	fixedTime.accumulate(virtualDelta);

	const maxIterations = 5;  // 最多 5 次
	let iterations = 0;

	while (fixedTime.expend() && iterations < maxIterations) {
		runSchedule();
		iterations++;
	}

	// 如果还有剩余,丢弃超出部分
	if (iterations >= maxIterations) {
		const excess = fixedTime.overstep().saturatingSub(
			fixedTime.timestep().mul(2)
		);
		fixedTime.discardOverstep(excess);
		warn("Fixed update limit reached, discarding excess time");
	}
}
```

#### 固定更新和渲染分离

```typescript
// ✅ 推荐: 物理在固定更新,渲染在常规更新
app.addSystems(BuiltinSchedules.FIXED_UPDATE, physicsSystem);
app.addSystems(BuiltinSchedules.POST_UPDATE, renderSystem);

// ❌ 不推荐: 混在一起
app.addSystems(BuiltinSchedules.UPDATE, physicsAndRenderSystem);
```

### 时间控制最佳实践

#### 暂停系统设计

```typescript
// 游戏状态
interface GameState {
	paused: boolean;
	pauseMenu: boolean;
}

// 暂停处理
function handlePause(app: App, state: GameState): void {
	if (state.pauseMenu && !state.paused) {
		// 打开暂停菜单
		app.ext.time.pause();
		state.paused = true;
		showPauseMenu();
	} else if (!state.pauseMenu && state.paused) {
		// 关闭暂停菜单
		app.ext.time.resume();
		state.paused = false;
		hidePauseMenu();
	}
}

// 游戏系统检查暂停
function gameSystem(world: World, context: Context, app: App): void {
	// 暂停时不执行游戏逻辑
	if (app.ext.time.isPaused()) {
		return;
	}

	// 正常游戏逻辑
}
```

#### 时间缩放的注意事项

```typescript
// ✅ 推荐: 保存原始缩放以便恢复
class TimeScaleManager {
	private normalScale = 1.0;
	private currentEffect?: TimeScaleEffect;

	applyEffect(app: App, effect: TimeScaleEffect): void {
		this.currentEffect = effect;
		app.ext.time.setTimeScale(effect.scale);

		task.delay(effect.duration, () => {
			if (this.currentEffect === effect) {
				app.ext.time.setTimeScale(this.normalScale);
				this.currentEffect = undefined;
			}
		});
	}

	setNormalScale(app: App, scale: number): void {
		this.normalScale = scale;
		if (!this.currentEffect) {
			app.ext.time.setTimeScale(scale);
		}
	}
}

interface TimeScaleEffect {
	scale: number;
	duration: number;
}
```

### 性能优化

#### 避免频繁时间查询

```typescript
// ❌ 不推荐: 每次查询都访问资源
function badSystem(world: World, context: Context, app: App): void {
	for (const [entity] of world.query(Component)) {
		const delta = app.ext.time.getDeltaSeconds();  // ❌ 在循环内
		// ...
	}
}

// ✅ 推荐: 查询一次,重复使用
function goodSystem(world: World, context: Context, app: App): void {
	const delta = app.ext.time.getDeltaSeconds();  // ✅ 在循环外

	for (const [entity] of world.query(Component)) {
		// 使用 delta
	}
}
```

#### 使用合适的精度

```typescript
// 大多数情况使用 f32 精度足够
const delta = time.getDeltaSecs();  // f32

// 只在需要高精度时使用 f64
const preciseDelta = time.getDeltaSecsF64();  // f64

// Duration 保持高精度,转换时选择精度
const duration = time.getDelta();
const secs = duration.asSecsF32();  // 常规使用
```

---

## 实战示例

### 示例 1: 基础计时器

实现一个简单的倒计时器。

```typescript
import { Duration } from "@white-dragon-bevy/bevy-framework";

// 计时器组件
interface Timer {
	duration: Duration;
	remaining: Duration;
	repeating: boolean;
	finished: boolean;
}

// 创建计时器
function createTimer(seconds: number, repeating: boolean): Timer {
	const duration = Duration.fromSecs(seconds);
	return {
		duration,
		remaining: duration,
		repeating,
		finished: false,
	};
}

// 更新计时器系统
function updateTimers(world: World, context: Context, app: App): void {
	const delta = app.ext.time.getDelta();

	for (const [entity, timer] of world.query(Timer)) {
		if (timer.finished && !timer.repeating) {
			continue;  // 已完成的非重复计时器
		}

		// 更新剩余时间
		timer.remaining = timer.remaining.saturatingSub(delta);

		// 检查是否完成
		if (timer.remaining.equals(Duration.ZERO)) {
			timer.finished = true;

			// 触发完成事件
			onTimerFinished(entity);

			// 重复计时器重置
			if (timer.repeating) {
				timer.remaining = timer.duration;
				timer.finished = false;
			}
		}
	}
}

function onTimerFinished(entity: number): void {
	print(`Timer ${entity} finished!`);
}

// 使用示例
const app = App.create()
	.addPlugin(new TimePlugin())
	.addSystems(BuiltinSchedules.UPDATE, updateTimers);

// 创建实体并添加计时器
const entity = app.world().spawn();
app.world().insert(entity, createTimer(5.0, false));  // 5 秒倒计时

app.run();
```

### 示例 2: 动画系统

实现基于时间的动画播放。

```typescript
import { Duration } from "@white-dragon-bevy/bevy-framework";

// 动画组件
interface Animation {
	frames: CFrame[];
	frameDuration: Duration;
	currentFrame: number;
	elapsed: Duration;
	looping: boolean;
	playing: boolean;
}

// 创建动画
function createAnimation(
	frames: CFrame[],
	fps: number,
	looping: boolean
): Animation {
	return {
		frames,
		frameDuration: Duration.fromSecs(1.0 / fps),
		currentFrame: 0,
		elapsed: Duration.ZERO,
		looping,
		playing: true,
	};
}

// 动画系统
function animationSystem(world: World, context: Context, app: App): void {
	const delta = app.ext.time.getDelta();

	for (const [entity, anim, part] of world.query(Animation, BasePart)) {
		if (!anim.playing) continue;

		// 累积时间
		anim.elapsed = anim.elapsed.add(delta);

		// 检查是否需要切换帧
		while (anim.elapsed.greaterThanOrEqual(anim.frameDuration)) {
			anim.elapsed = anim.elapsed.saturatingSub(anim.frameDuration);
			anim.currentFrame++;

			// 处理循环
			if (anim.currentFrame >= anim.frames.size()) {
				if (anim.looping) {
					anim.currentFrame = 0;
				} else {
					anim.currentFrame = anim.frames.size() - 1;
					anim.playing = false;
					break;
				}
			}
		}

		// 更新 Part 的 CFrame
		const frame = anim.frames[anim.currentFrame];
		if (frame) {
			part.CFrame = frame;
		}
	}
}

// 使用示例
const frames: CFrame[] = [
	new CFrame(0, 0, 0),
	new CFrame(0, 1, 0),
	new CFrame(0, 2, 0),
	new CFrame(0, 1, 0),
];

const app = App.create()
	.addPlugin(new TimePlugin())
	.addSystems(BuiltinSchedules.UPDATE, animationSystem);

const entity = app.world().spawn();
const part = new Instance("Part");
part.Parent = workspace;

app.world().insert(
	entity,
	createAnimation(frames, 10, true),  // 10 FPS,循环
	part
);

app.run();
```

### 示例 3: 冷却系统

实现技能冷却管理。

```typescript
import { Duration } from "@white-dragon-bevy/bevy-framework";

// 冷却组件
interface Cooldown {
	name: string;
	duration: Duration;
	remaining: Duration;
}

// 冷却管理器
class CooldownManager {
	private cooldowns = new Map<string, Cooldown>();

	// 开始冷却
	startCooldown(name: string, duration: Duration): void {
		this.cooldowns.set(name, {
			name,
			duration,
			remaining: duration,
		});
	}

	// 检查是否在冷却
	isOnCooldown(name: string): boolean {
		const cooldown = this.cooldowns.get(name);
		return cooldown !== undefined && !cooldown.remaining.equals(Duration.ZERO);
	}

	// 获取剩余时间
	getRemainingTime(name: string): Duration | undefined {
		return this.cooldowns.get(name)?.remaining;
	}

	// 获取冷却进度 (0.0 - 1.0)
	getProgress(name: string): number {
		const cooldown = this.cooldowns.get(name);
		if (!cooldown) return 1.0;

		const elapsed = cooldown.duration.saturatingSub(cooldown.remaining);
		return elapsed.divDuration(cooldown.duration);
	}

	// 更新所有冷却
	update(delta: Duration): void {
		const toRemove: string[] = [];

		for (const [name, cooldown] of this.cooldowns) {
			cooldown.remaining = cooldown.remaining.saturatingSub(delta);

			// 移除完成的冷却
			if (cooldown.remaining.equals(Duration.ZERO)) {
				toRemove.push(name);
			}
		}

		for (const name of toRemove) {
			this.cooldowns.delete(name);
		}
	}
}

// 冷却系统
function cooldownSystem(world: World, context: Context, app: App): void {
	const delta = app.ext.time.getDelta();
	const manager = world.resources.get<CooldownManager>();

	if (manager) {
		manager.update(delta);
	}
}

// 技能系统
function skillSystem(world: World, context: Context, app: App): void {
	const manager = world.resources.get<CooldownManager>();
	if (!manager) return;

	// 使用技能
	const useSkill = (skillName: string, cooldownSecs: number) => {
		if (manager.isOnCooldown(skillName)) {
			const remaining = manager.getRemainingTime(skillName);
			if (remaining) {
				print(`Skill on cooldown: ${remaining.asSecsF32().toFixed(1)}s`);
			}
			return false;
		}

		// 执行技能
		print(`Using skill: ${skillName}`);
		manager.startCooldown(skillName, Duration.fromSecs(cooldownSecs));
		return true;
	};

	// 示例: 检测输入并使用技能
	// useSkill("fireball", 5.0);
}

// 应用设置
const app = App.create()
	.addPlugin(new TimePlugin())
	.insertResource(new CooldownManager())
	.addSystems(BuiltinSchedules.UPDATE, cooldownSystem, skillSystem);

app.run();
```

### 示例 4: 物理插值渲染

使用固定时间步物理和插值渲染。

```typescript
import { Duration, TimeFixed } from "@white-dragon-bevy/bevy-framework";

// 物理体组件
interface PhysicsBody {
	position: Vector3;
	previousPosition: Vector3;
	velocity: Vector3;
}

// 渲染组件
interface Renderable {
	part: BasePart;
}

// 物理系统 (固定更新)
function physicsSystem(world: World, context: Context, app: App): void {
	const fixedTime = app.getResource<FixedTimeResource>();
	if (!fixedTime) return;

	const dt = fixedTime.value.timestep().asSecsF32();

	for (const [entity, body] of world.query(PhysicsBody)) {
		// 保存上一帧位置
		body.previousPosition = body.position;

		// 简单的欧拉积分
		const acceleration = new Vector3(0, -9.8, 0);  // 重力
		body.velocity = body.velocity.add(acceleration.mul(dt));
		body.position = body.position.add(body.velocity.mul(dt));

		// 地面碰撞
		if (body.position.Y < 0) {
			body.position = new Vector3(body.position.X, 0, body.position.Z);
			body.velocity = new Vector3(
				body.velocity.X,
				-body.velocity.Y * 0.8,  // 反弹
				body.velocity.Z
			);
		}
	}
}

// 渲染系统 (常规更新)
function renderSystem(world: World, context: Context, app: App): void {
	const fixedTime = app.getResource<FixedTimeResource>();
	if (!fixedTime) return;

	// 插值因子
	const alpha = fixedTime.value.overstepFraction();

	for (const [entity, body, renderable] of world.query(
		PhysicsBody,
		Renderable
	)) {
		// 插值位置
		const renderPos = body.previousPosition.Lerp(body.position, alpha);

		// 更新渲染位置
		renderable.part.Position = renderPos;
	}
}

// 应用设置
const app = App.create()
	.addPlugin(new TimePlugin())
	.addSystems(BuiltinSchedules.FIXED_UPDATE, physicsSystem)
	.addSystems(BuiltinSchedules.POST_UPDATE, renderSystem);

// 创建物理实体
const entity = app.world().spawn();
const part = new Instance("Part");
part.Size = new Vector3(2, 2, 2);
part.Position = new Vector3(0, 50, 0);
part.Anchored = true;
part.Parent = workspace;

app.world().insert(entity, {
	position: new Vector3(0, 50, 0),
	previousPosition: new Vector3(0, 50, 0),
	velocity: new Vector3(0, 0, 0),
} satisfies PhysicsBody);

app.world().insert(entity, {
	part,
} satisfies Renderable);

app.run();
```

### 示例 5: 网络同步时钟

实现固定 tick rate 的网络同步系统。

```typescript
import { TimeFixed, Duration } from "@white-dragon-bevy/bevy-framework";

// 网络 tick 配置
const NETWORK_TICK_RATE = 30;  // 30 Hz

// 网络状态
interface NetworkState {
	tick: number;
	lastSyncTime: Duration;
}

// 网络同步插件
class NetworkPlugin extends BasePlugin {
	build(app: App): void {
		// 创建独立的网络固定时间
		const networkTime = TimeFixed.fromHz(NETWORK_TICK_RATE);

		// 初始化网络状态
		const state: NetworkState = {
			tick: 0,
			lastSyncTime: Duration.ZERO,
		};

		app.insertResource(state);
		app.insertResource(networkTime);

		// 添加网络同步系统到固定更新
		app.addSystems(BuiltinSchedules.FIXED_UPDATE, networkSyncSystem);
	}

	name(): string {
		return "NetworkPlugin";
	}
}

// 网络同步系统
function networkSyncSystem(world: World, context: Context, app: App): void {
	const state = app.getResource<NetworkState>();
	const networkTime = app.getResource<TimeFixed>();

	if (!state || !networkTime) return;

	// 增加 tick 计数
	state.tick++;

	// 记录同步时间
	state.lastSyncTime = networkTime.getElapsed();

	// 收集需要同步的数据
	const syncData = collectSyncData(world);

	// 发送到服务器/客户端
	if (RunService.IsServer()) {
		broadcastToClients(state.tick, syncData);
	} else {
		sendToServer(state.tick, syncData);
	}

	print(`Network tick ${state.tick} at ${state.lastSyncTime.asSecsF32()}s`);
}

function collectSyncData(world: World): SyncData[] {
	const data: SyncData[] = [];

	// 收集需要同步的实体状态
	for (const [entity, transform, syncable] of world.query(Transform, Syncable)) {
		data.push({
			entity,
			position: transform.position,
			rotation: transform.rotation,
		});
	}

	return data;
}

interface SyncData {
	entity: number;
	position: Vector3;
	rotation: Vector3;
}

interface Transform {
	position: Vector3;
	rotation: Vector3;
}

interface Syncable {
	lastSyncTick: number;
}

function broadcastToClients(tick: number, data: SyncData[]): void {
	// 实现网络广播
}

function sendToServer(tick: number, data: SyncData[]): void {
	// 实现网络发送
}

// 应用设置
const app = App.create()
	.addPlugin(new TimePlugin())
	.addPlugin(new NetworkPlugin());

app.run();
```

---

## 常见问题解答

### Q1: Duration 和 number 有什么区别?

**A**: Duration 提供高精度时间表示,避免浮点累积误差:

```typescript
// ❌ 问题: 浮点累积误差
let time = 0.0;
for (let i = 0; i < 1000000; i++) {
	time += 0.016;
}
// time 可能不等于 16000.0

// ✅ 解决: 使用 Duration
let duration = Duration.ZERO;
for (let i = 0; i < 1000000; i++) {
	duration = duration.add(Duration.fromSecs(0.016));
}
// duration 保持精确
```

### Q2: 什么时候使用 Real Time vs Virtual Time?

**A**:

| 使用场景 | 推荐类型 | 原因 |
|---------|---------|------|
| 游戏逻辑 | Virtual Time | 需要暂停/加速 |
| UI 动画 (菜单) | Real Time | 始终流畅 |
| 性能测量 | Real Time | 真实时间 |
| 粒子效果 | Virtual Time | 跟随游戏节奏 |
| 倒计时 | Virtual Time | 游戏暂停时停止 |

### Q3: 固定时间步的频率如何选择?

**A**:

```typescript
// 物理模拟: 50-100 Hz (平衡精度和性能)
TimeFixed.fromHz(64)  // 推荐

// 网络同步: 20-60 Hz (取决于游戏类型)
TimeFixed.fromHz(30)  // FPS/动作游戏
TimeFixed.fromHz(20)  // 策略游戏

// AI 更新: 10-30 Hz (AI 不需要太高频率)
TimeFixed.fromHz(20)

// 规则: 频率越高越精确,但性能开销越大
```

### Q4: 如何处理固定更新中的死螺旋?

**A**: 限制单帧最大固定更新次数:

```typescript
function runFixedMainLoopSafe(
	virtualDelta: Duration,
	fixedTime: TimeFixed,
	runSchedule: () => void,
): void {
	fixedTime.accumulate(virtualDelta);

	const maxIterations = 5;
	let iterations = 0;

	while (fixedTime.expend() && iterations < maxIterations) {
		runSchedule();
		iterations++;
	}

	// 丢弃超出的累积时间
	if (iterations >= maxIterations) {
		const excess = fixedTime.overstep().saturatingSub(
			fixedTime.timestep().mul(2)
		);
		fixedTime.discardOverstep(excess);
		warn("Fixed update limit reached");
	}
}
```

### Q5: 时间包装 (Wrap Period) 是什么?

**A**: 时间包装解决长时间运行的精度问题:

```typescript
// 问题: 长时间后浮点精度丢失
// 100 小时后, 0.016 秒的精度可能丢失

// 解决: 设置包装周期
time.setWrapPeriod(Duration.fromSecs(3600));  // 1 小时

// getElapsed() 继续增长 (用于逻辑)
time.getElapsed()  // 可能是 360000 秒 (100 小时)

// getElapsedWrapped() 保持在 0-3600 范围 (用于渲染)
time.getElapsedWrapped()  // 0-3600 秒,高精度
```

### Q6: 如何实现平滑的时间缩放过渡?

**A**: 使用插值逐渐改变缩放:

```typescript
function smoothTimeScale(
	app: App,
	targetScale: number,
	duration: number
): void {
	const startScale = app.ext.time.getTimeScale();
	const startTime = os.clock();

	const connection = RunService.Heartbeat.Connect(() => {
		const elapsed = os.clock() - startTime;
		const t = math.min(elapsed / duration, 1.0);

		// 使用缓动函数
		const easedT = easeInOutQuad(t);
		const scale = startScale + (targetScale - startScale) * easedT;

		app.ext.time.setTimeScale(scale);

		if (t >= 1.0) {
			connection.Disconnect();
		}
	});
}

function easeInOutQuad(t: number): number {
	return t < 0.5 ? 2 * t * t : 1 - math.pow(-2 * t + 2, 2) / 2;
}

// 使用
smoothTimeScale(app, 0.3, 0.5);  // 0.5 秒过渡到慢动作
```

### Q7: 如何在暂停时保持某些系统运行?

**A**: 使用 Real Time 而不是 Virtual Time:

```typescript
// UI 动画系统 (暂停时继续运行)
function uiAnimationSystem(world: World, context: Context, app: App): void {
	// 使用 Real Time
	const realTime = app.getResource<RealTimeResource>();
	if (!realTime) return;

	const delta = realTime.value.getDelta();

	// UI 动画逻辑 (不受游戏暂停影响)
	updateUIAnimations(delta);
}

// 游戏逻辑系统 (暂停时停止)
function gameLogicSystem(world: World, context: Context, app: App): void {
	// 检查暂停状态
	if (app.ext.time.isPaused()) {
		return;
	}

	// 使用 Virtual Time
	const delta = app.ext.time.getDeltaSeconds();

	// 游戏逻辑 (受暂停影响)
	updateGameLogic(delta);
}
```

### Q8: 性能统计功能的采样周期是多久?

**A**: TimePlugin 使用滑动窗口统计:

```typescript
// 内部实现 (参考)
class TimeStatsManager {
	private frameTimesMs: number[] = [];
	private maxSamples = 60;  // 保留最近 60 帧

	// 平均 FPS 基于最近 60 帧计算
	getAverageFPS(): number {
		// 1 秒 (60 帧 @ 60 FPS)
	}
}

// 使用建议
const avgFPS = app.ext.time.getAverageFPS();  // 最近 ~1 秒的平均值
const instantFPS = app.ext.time.getInstantFPS();  // 上一帧的瞬时值

// 重置统计
app.ext.time.resetStats();  // 清除历史数据,重新开始采样
```

---

## API 参考

### Duration 类 API

#### 创建方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `fromSecs` | `static (secs: number): Duration` | 从秒创建 |
| `fromSecsF64` | `static (secs: number): Duration` | 从秒创建 (f64) |
| `fromMillis` | `static (millis: number): Duration` | 从毫秒创建 |
| `fromMicros` | `static (micros: number): Duration` | 从微秒创建 |
| `fromNanos` | `static (nanos: number): Duration` | 从纳秒创建 |

#### 转换方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `asSecsF32` | `(): number` | 转为秒 (f32) |
| `asSecsF64` | `(): number` | 转为秒 (f64) |
| `asMillis` | `(): number` | 转为毫秒 |
| `asMicros` | `(): number` | 转为微秒 |
| `asNanos` | `(): number` | 转为纳秒 |
| `asSecs` | `(): number` | 获取秒部分 |
| `subsecNanos` | `(): number` | 获取纳秒余数 |

#### 运算方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `add` | `(other: Duration): Duration` | 加法 |
| `saturatingSub` | `(other: Duration): Duration` | 饱和减法 |
| `checkedSub` | `(other: Duration): Duration \| undefined` | 检查减法 |
| `mul` | `(factor: number): Duration` | 乘法 |
| `saturatingMul` | `(factor: number): Duration` | 饱和乘法 |
| `checkedMul` | `(factor: number): Duration \| undefined` | 检查乘法 |
| `div` | `(divisor: number): Duration` | 除法 |
| `checkedDiv` | `(divisor: number): Duration \| undefined` | 检查除法 |
| `divDuration` | `(other: Duration): number` | Duration 除法 |

#### 比较方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `equals` | `(other: Duration): boolean` | 相等比较 |
| `isZero` | `(): boolean` | 是否为零 |
| `lessThan` | `(other: Duration): boolean` | 小于 |
| `greaterThan` | `(other: Duration): boolean` | 大于 |
| `lessThanOrEqual` | `(other: Duration): boolean` | 小于等于 |
| `greaterThanOrEqual` | `(other: Duration): boolean` | 大于等于 |
| `compare` | `(other: Duration): number` | 通用比较 |

#### 常量

| 常量 | 类型 | 说明 |
|------|------|------|
| `ZERO` | `Duration` | 零时间 |
| `MAX` | `Duration` | 最大时间 |

### Time<T> 类 API

#### 时间推进

| 方法 | 签名 | 说明 |
|------|------|------|
| `advanceBy` | `(delta: Duration): void` | 推进指定时长 |
| `advanceTo` | `(elapsed: Duration): void` | 推进到指定时间 |

#### 查询方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `getDelta` | `(): Duration` | 获取增量 |
| `getDeltaSecs` | `(): number` | 获取增量 (秒, f32) |
| `getDeltaSecsF64` | `(): number` | 获取增量 (秒, f64) |
| `getElapsed` | `(): Duration` | 获取总时间 |
| `getElapsedSecs` | `(): number` | 获取总时间 (秒, f32) |
| `getElapsedSecsF64` | `(): number` | 获取总时间 (秒, f64) |
| `getElapsedWrapped` | `(): Duration` | 获取包装时间 |
| `getElapsedSecsWrapped` | `(): number` | 获取包装时间 (秒, f32) |
| `getElapsedSecsWrappedF64` | `(): number` | 获取包装时间 (秒, f64) |

#### 配置方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `getWrapPeriod` | `(): Duration` | 获取包装周期 |
| `setWrapPeriod` | `(period: Duration): void` | 设置包装周期 |
| `getContext` | `(): T` | 获取上下文 |
| `setContext` | `(context: T): void` | 设置上下文 |
| `asGeneric` | `(): Time<Empty>` | 转为通用 Time |

#### 静态方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `default` | `static <T>(context: T): Time<T>` | 创建默认实例 |

### TimeFixed 类 API

#### 创建方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `constructor` | `()` | 默认构造 (64Hz) |
| `fromDuration` | `static (timestep: Duration): TimeFixed` | 从 Duration 创建 |
| `fromSeconds` | `static (seconds: number): TimeFixed` | 从秒创建 |
| `fromHz` | `static (hz: number): TimeFixed` | 从频率创建 |

#### 时间步长管理

| 方法 | 签名 | 说明 |
|------|------|------|
| `timestep` | `(): Duration` | 获取时间步长 |
| `setTimestep` | `(timestep: Duration): void` | 设置时间步长 |
| `setTimestepSeconds` | `(seconds: number): void` | 设置时间步长 (秒) |
| `setTimestepHz` | `(hz: number): void` | 设置时间步长 (Hz) |

#### 累积和消费

| 方法 | 签名 | 说明 |
|------|------|------|
| `accumulate` | `(delta: Duration): void` | 累积时间 |
| `expend` | `(): boolean` | 消费时间步 |

#### Overstep 管理

| 方法 | 签名 | 说明 |
|------|------|------|
| `overstep` | `(): Duration` | 获取 overstep |
| `overstepFraction` | `(): number` | 获取 overstep 比例 (f32) |
| `overstepFractionF64` | `(): number` | 获取 overstep 比例 (f64) |
| `discardOverstep` | `(discard: Duration): void` | 丢弃 overstep |

#### 常量

| 常量 | 类型 | 说明 |
|------|------|------|
| `DEFAULT_TIMESTEP` | `Duration` | 默认时间步长 (15.625ms) |

### TimePlugin 扩展 API

通过 `app.ext.time` 访问。

#### 基本查询

| 方法 | 签名 | 说明 |
|------|------|------|
| `getCurrent` | `(): Time<Empty>` | 获取当前 Time |
| `getTime` | `(): Time<Empty>` | 获取 Time 资源 |
| `getElapsedSeconds` | `(): number` | 获取总时间 (秒) |
| `getDeltaSeconds` | `(): number` | 获取增量 (秒) |
| `getElapsedMillis` | `(): number` | 获取总时间 (毫秒) |
| `getDeltaMillis` | `(): number` | 获取增量 (毫秒) |

#### 时间控制

| 方法 | 签名 | 说明 |
|------|------|------|
| `pause` | `(): void` | 暂停时间 |
| `resume` | `(): void` | 恢复时间 |
| `isPaused` | `(): boolean` | 是否暂停 |
| `setTimeScale` | `(scale: number): void` | 设置时间缩放 |
| `getTimeScale` | `(): number` | 获取时间缩放 |
| `advanceTime` | `(seconds: number): void` | 手动推进时间 |
| `reset` | `(): void` | 重置时间 |

#### 统计功能

| 方法 | 签名 | 说明 |
|------|------|------|
| `getAverageFPS` | `(): number` | 获取平均 FPS |
| `getInstantFPS` | `(): number` | 获取瞬时 FPS |
| `getMinFrameTime` | `(): number` | 获取最小帧时间 |
| `getMaxFrameTime` | `(): number` | 获取最大帧时间 |
| `getAverageFrameTime` | `(): number` | 获取平均帧时间 |
| `resetStats` | `(): void` | 重置统计 |

#### 帧计数

| 方法 | 签名 | 说明 |
|------|------|------|
| `getFrameCount` | `(): number` | 获取当前帧数 |

### FrameCount 类 API

| 方法 | 签名 | 说明 |
|------|------|------|
| `getValue` | `(): number` | 获取当前帧数 |
| `increment` | `(): void` | 增加帧数 |
| `wrappingSub` | `(other: number): number` | 计算帧数差 |
| `reset` | `(): void` | 重置帧数 |
| `clone` | `(): FrameCount` | 克隆帧数 |

### 时间类型常量

#### Real Time Context

```typescript
interface Real extends TimeContext {
	readonly __brand: "Real";
}
```

#### Virtual Time Context

```typescript
interface Virtual extends TimeContext {
	readonly __brand: "Virtual";
	readonly paused: boolean;
	readonly relativeSpeed: number;
	readonly effectiveSpeed: number;
	readonly maxDelta: Duration;
}
```

#### Fixed Time Context

```typescript
interface Fixed extends TimeContext {
	readonly __brand: "Fixed";
	timestep: Duration;
	overstep: Duration;
}
```

---

## 总结

`bevy_time` 模块提供了企业级的时间管理系统,支持多种时间类型、精确的时间计算和强大的时间控制功能。

### 关键要点

1. **Duration 优先**: 使用 Duration 而不是 number 存储时间,避免精度问题
2. **时间类型选择**: Real (真实时间)、Virtual (游戏时间)、Fixed (固定步长) 各有用途
3. **固定时间步**: 物理模拟和网络同步必须使用固定时间步
4. **时间控制**: Virtual Time 支持暂停、加速、减速等控制
5. **性能监控**: 内置 FPS 统计和帧时间监控工具

### 下一步学习

- 深入了解 ECS 查询系统与时间系统的结合
- 学习 bevy_transform 模块的动画系统
- 探索网络同步中的时间管理
- 研究高级物理插值技术

---

**文档版本**: 1.0.0
**最后更新**: 2025-09-28
**维护者**: White Dragon Bevy 团队