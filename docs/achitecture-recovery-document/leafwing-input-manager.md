# 源代码分析与设计文档 (Source Code Analysis & Design Document)

**分析代码路径:** `bevy-origin-packages\leafwing-input-manager`

**文档版本:** 1.0
**生成日期:** 2025-09-28
**框架版本:** 0.18.0 (兼容 Bevy 0.17)

---

## 前言：代码映射索引 (Code-to-Doc Map)

本文档通过逆向工程方法，从源代码中提炼出设计理念和架构模式。以下是设计概念与源文件位置的映射关系：

### 核心模块映射

- **输入管理核心**: `src/lib.rs` (库入口与特质定义)
- **插件系统**: `src/plugin.rs` (Bevy 插件集成)
- **动作状态管理**: `src/action_state/` (状态存储与更新)
- **输入映射**: `src/input_map.rs` (动作到输入的多对多映射)
- **用户输入抽象**: `src/user_input/` (输入设备抽象层)
- **输入处理**: `src/input_processing/` (输入值处理与转换)
- **系统调度**: `src/systems.rs` (Bevy 系统定义)
- **冲突解决**: `src/clashing_inputs.rs` (输入冲突检测与策略)
- **网络同步**: `src/action_diff.rs` (动作差异与网络传输)
- **按钮抽象**: `src/buttonlike.rs` (按钮状态机)
- **轴抽象**: `src/axislike.rs` (轴向输入)
- **宏支持**: `macros/src/` (派生宏实现)

### 输入设备模块映射

- **键盘**: `src/user_input/keyboard.rs`
- **鼠标**: `src/user_input/mouse.rs`
- **手柄**: `src/user_input/gamepad.rs`
- **和弦组合**: `src/user_input/chord.rs`
- **虚拟输入**: `src/user_input/virtual_axial.rs`

### 支持模块映射

- **定时器**: `src/timing.rs` (按钮按压时长跟踪)
- **通用条件**: `src/common_conditions.rs` (系统运行条件)
- **输入更新**: `src/user_input/updating.rs` (中央输入存储)
- **类型标签**: `src/typetag.rs` (序列化支持)

---

## 1. 系统概述 (System Overview)

### 1.1. 核心功能与目的

**Leafwing Input Manager** 是一个专为 Bevy 游戏引擎设计的输入管理框架，其核心使命是将复杂多样的物理输入设备抽象为简洁的游戏动作（Actions），实现输入方式与游戏逻辑的完全解耦。

该框架解决了传统游戏输入管理的三大核心痛点：

**输入设备异构性问题**：现代游戏需要同时支持键盘、鼠标、手柄等多种输入设备，每种设备的 API 和数据格式各不相同。框架通过特质抽象层（Trait Abstraction Layer）统一了所有输入设备的接口，开发者无需关心输入来源，只需定义游戏动作即可。

**多对多映射复杂性**：一个动作可以由多种输入触发（例如跳跃可由空格键或手柄 A 键触发），一个输入也可以触发多个动作（例如 Ctrl+S 既是保存也包含 S 键）。框架提供了灵活的多对多映射机制，并内置智能冲突解决策略，自动处理输入组合的优先级问题。

**本地多人与网络同步**：框架原生支持本地多人游戏场景（每个玩家实体独立的输入映射），并提供了网络友好的状态差异机制，可以高效地在客户端和服务器之间同步输入状态，无需传输冗余的设备信息。

**设计哲学**：框架秉持"动作优先"的设计理念，将游戏逻辑与输入设备完全分离。开发者只需定义抽象的游戏动作枚举（如跳跃、攻击、移动），框架负责将物理输入转换为动作状态，游戏逻辑只与动作交互，从而实现真正的输入独立性。

### 1.2. 技术栈

**核心依赖框架**：
- **Bevy 引擎** (0.17 版本)：深度集成了 Bevy 的 ECS 架构、插件系统、反射机制和资源管理
- **ECS 范式**：完全遵循 Bevy 的实体-组件-系统模式，输入映射和动作状态都是标准的 ECS 组件
- **系统调度**：利用 Bevy 的调度器实现精确的系统执行顺序控制

**语言特性运用**：
- **类型安全的动作定义**：通过泛型特质 `Actionlike` 和派生宏实现编译期动作类型检查
- **特质对象**：大量使用动态分发（trait objects）实现输入设备的运行时多态
- **零成本抽象**：关键路径使用内联和泛型避免运行时开销

**序列化与反射**：
- **Serde 生态**：完整支持输入映射的序列化/反序列化，便于配置文件存储
- **自定义序列化**：使用 `serde-flexitos` 和 `typetag` 实现特质对象的序列化
- **Bevy 反射**：集成 Bevy 的反射系统，支持运行时类型信息和编辑器集成

**数学库**：使用 Bevy 内置的数学类型（Vec2、Vec3）表示双轴和三轴输入

### 1.3. 关键依赖

**外部依赖分析**：

**必需依赖**：
- `bevy`（0.17）：核心引擎，提供 ECS、事件、输入资源、时间管理等基础设施
- `serde`：序列化框架，用于输入配置的持久化
- `serde_flexitos`：扩展 Serde 支持更灵活的序列化格式
- `itertools`：迭代器工具，简化集合操作

**特质对象序列化依赖**：
- `dyn-clone`：为特质对象提供克隆能力
- `dyn-eq`：为特质对象提供相等性比较
- `dyn-hash`：为特质对象提供哈希计算

**宏系统**：
- `leafwing_input_manager_macros`（内部 crate）：提供 `Actionlike` 派生宏

**可选功能依赖**（通过 Feature Flags 控制）：
- `timing`：启用按钮按压时长跟踪功能
- `mouse`：启用鼠标输入支持
- `keyboard`：启用键盘输入支持
- `gamepad`：启用手柄支持（依赖 `bevy_gilrs`）
- `ui`：与 Bevy UI 集成，避免 UI 交互时触发游戏动作
- `picking`：与 Bevy 拾取系统集成
- `asset`：允许输入映射作为 Bevy 资产加载

**依赖注入策略**：框架采用了模块化的依赖管理，核心功能不依赖任何具体输入设备，所有设备支持都通过特性标志（Feature Flags）和插件系统动态注入，实现了高度的可配置性。

---

## 2. 架构分析 (Architectural Analysis)

### 2.1. 代码库结构

**顶层架构划分**：

代码库采用分层架构，从下至上分为四个主要层次：

**设备抽象层** (Device Abstraction Layer)：
- 位置：`src/user_input/`
- 职责：定义设备无关的输入接口特质（UserInput、Buttonlike、Axislike、DualAxislike、TripleAxislike）
- 特点：使用特质对象实现运行时多态，支持任意输入设备的接入

**输入处理层** (Input Processing Layer)：
- 位置：`src/input_processing/`
- 职责：提供输入值的标准化处理（死区、灵敏度、反转、范围限制等）
- 特点：基于处理器模式，可组合多个处理步骤

**映射与状态层** (Mapping & State Layer)：
- 位置：`src/input_map.rs`、`src/action_state/`
- 职责：管理输入到动作的映射关系，维护动作的运行时状态
- 特点：采用 ECS 组件形式，每个实体可有独立的输入配置

**系统调度层** (System Scheduling Layer)：
- 位置：`src/systems.rs`、`src/plugin.rs`
- 职责：协调输入更新、状态计算、冲突解决等系统的执行顺序
- 特点：精细的系统集（SystemSet）划分，确保确定性的执行流程

**横切关注模块**：

**冲突解决模块** (`clashing_inputs.rs`)：
- 检测并解决输入组合的冲突（如 Ctrl+S 与 S 的冲突）
- 提供多种冲突策略（全部触发、优先最长组合等）

**网络同步模块** (`action_diff.rs`)：
- 生成动作状态的增量差异
- 支持高效的网络传输和状态重建

**中央输入存储** (`user_input/updating.rs`)：
- 集中管理当前帧的输入数据
- 避免重复查询 Bevy 输入资源

**宏系统** (`macros/`)：
- 提供 `#[derive(Actionlike)]` 宏
- 自动实现动作枚举的必要特质

**目录组织原则**：
- 按功能职责划分模块，每个模块高内聚低耦合
- 使用 `mod.rs` 作为模块入口，统一导出公共接口
- 测试代码与实现代码共存于同一文件，便于维护

### 2.2. 运行时架构

**核心组件生命周期**：

**初始化阶段**：
1. 插件注册：`InputManagerPlugin<A: Actionlike>` 被添加到 Bevy App
2. 资源初始化：创建 `ClashStrategy` 资源和 `CentralInputStore` 资源
3. 类型注册：将动作类型 A、输入映射类型、动作状态类型注册到反射系统
4. 系统调度配置：将核心系统加入到 `PreUpdate` 和其他调度阶段
5. 输入设备注册：根据启用的特性，注册各种输入类型（键盘、鼠标、手柄等）

**每帧更新循环**：

**阶段一：输入收集** (`InputManagerSystem::Unify`)
- Bevy 的 `InputSystems` 先运行，更新底层输入资源（ButtonInput、Axis 等）
- 各设备的 `UpdatableInput::compute` 系统运行，将原始输入写入 `CentralInputStore`
- 可选的 UI 过滤系统运行，排除被 UI 捕获的输入

**阶段二：状态清理** (`InputManagerSystem::Tick`)
- `tick_action_state` 系统运行，清理上一帧的 "just_pressed" 和 "just_released" 标记
- 更新定时器（如果启用了 timing 特性），记录按钮按压时长
- 清空中央输入存储，准备接收新一帧的输入

**阶段三：状态更新** (`InputManagerSystem::Update`)
- `update_action_state` 系统运行，这是核心的状态计算逻辑
- 对每个带有 `InputMap` 和 `ActionState` 组件的实体：
  - 调用 `InputMap::process_actions` 处理所有输入绑定
  - 从 `CentralInputStore` 查询各输入的状态
  - 合并多个输入的结果（按钮取逻辑或，轴取累加）
  - 执行冲突解决策略，移除被覆盖的动作
  - 将计算结果写入 `ActionState`

**阶段四：手动控制** (`InputManagerSystem::ManualControl`)
- 预留时间点，允许游戏逻辑手动修改动作状态
- 必须在状态更新之后运行，以覆盖输入驱动的状态

**特殊调度：固定更新支持**：
- 框架支持 Bevy 的固定时间步长更新（FixedUpdate）
- 维护两套独立的状态副本：`update_state` 和 `fixed_update_state`
- 在 `RunFixedMainLoop` 前后通过 `swap_to_fixed_update` 和 `swap_to_update` 系统切换状态
- 确保物理系统和渲染系统看到一致的输入状态

**组件关系图（概念描述）**：
- 实体层级：玩家实体 → InputMap 组件 + ActionState 组件
- 资源层级：ClashStrategy（全局冲突策略）、CentralInputStore（当前帧输入数据）
- 数据流向：设备输入 → CentralInputStore → InputMap 处理 → ActionState 输出 → 游戏逻辑消费

### 2.3. 核心设计模式

**策略模式 (Strategy Pattern)**：
- **应用场景**：输入冲突解决
- **实现细节**：`ClashStrategy` 枚举定义了不同的冲突处理策略（`PressAll`、`PrioritizeLongest`）
- **优势**：运行时可切换策略，无需修改核心逻辑
- **扩展点**：可添加新的策略变体（如基于优先级的策略）

**组合模式 (Composite Pattern)**：
- **应用场景**：输入组合（Chords）
- **实现细节**：`ButtonlikeChord` 可以包含多个 `Buttonlike` 输入，本身也是 `Buttonlike`
- **递归结构**：和弦可以嵌套其他和弦，形成复杂组合
- **统一接口**：所有组合结构都通过相同的特质接口查询状态

**适配器模式 (Adapter Pattern)**：
- **应用场景**：设备输入适配
- **实现细节**：每种设备（键盘、鼠标、手柄）都通过适配器将原生事件转换为统一的特质接口
- **好处**：隔离设备差异，核心系统只依赖抽象接口

**观察者模式 (Observer Pattern)**：
- **应用场景**：状态变化通知
- **实现细节**：`ActionDiff` 机制监控状态变化并生成差异消息
- **应用场景**：网络游戏中的输入同步、回放系统、输入日志记录

**状态模式 (State Pattern)**：
- **应用场景**：按钮状态机
- **实现细节**：`ButtonState` 枚举表示四种状态（刚按下、按住、刚释放、释放）
- **状态转换**：通过 `tick()` 方法实现确定性的状态迁移
- **时间语义**："just" 前缀的状态只持续一帧，自动转换为持续状态

**责任链模式 (Chain of Responsibility)**：
- **应用场景**：输入处理器链
- **实现细节**：`AxisProcessor` 和 `DualAxisProcessor` 可以串联多个处理步骤
- **处理流程**：原始输入 → 死区过滤 → 灵敏度调整 → 范围限制 → 最终值
- **可配置性**：每个处理器独立配置，灵活组合

**工厂模式 (Factory Pattern)**：
- **应用场景**：输入创建
- **实现细节**：虚拟输入（VirtualDPad、VirtualAxis）通过工厂方法创建预设配置
- **便利性**：提供 `wasd()`, `arrow_keys()` 等快捷构造函数

**多态性应用**：
- **特质对象集合**：InputMap 存储 `Box<dyn Buttonlike>` 等特质对象向量
- **运行时扩展**：可以在运行时添加任意实现了相应特质的输入类型
- **性能权衡**：使用动态分发换取灵活性，但在热路径上使用泛型避免开销

**类型驱动设计**：
- **泛型约束**：`InputManagerPlugin<A: Actionlike>` 使用泛型参数保证类型安全
- **编译期检查**：错误的动作类型在编译期就会被捕获
- **多动作系统**：可以为不同的动作类型（玩家动作、菜单动作、相机动作）注册多个插件实例

---

## 3. 执行流与生命周期

### 3.1. 应用入口与启动流程

**插件安装过程**：

**步骤一：创建插件实例**
- 开发者调用 `InputManagerPlugin::<MyAction>::default()` 或 `::server()` 创建插件
- 泛型参数 `MyAction` 必须实现 `Actionlike` 特质
- 插件内部存储一个 `Machine` 枚举标记（Client 或 Server）

**步骤二：注册到 Bevy App**
- 通过 `App::add_plugins()` 将插件添加到应用
- Bevy 调用插件的 `build` 方法，传入 `App` 的可变引用

**步骤三：类型注册**
- 将 `ActionState<A>`、`InputMap<A>`、`ButtonData` 等类型注册到 Bevy 反射系统
- 注册输入处理器类型（AxisProcessor、DualAxisProcessor 等）
- 如果启用 timing 特性，注册 `Timing` 类型

**步骤四：资源初始化**
- 插入 `ClashStrategy` 资源，默认值为 `PrioritizeLongest`
- 确保 `CentralInputStore` 存在（由 `CentralInputStorePlugin` 管理）

**步骤五：系统注册**（客户端模式）
- 将 `tick_action_state<A>` 添加到 `PreUpdate::InputManagerSystem::Tick`
- 将 `update_action_state<A>` 添加到 `PreUpdate::InputManagerSystem::Update`
- 将 `release_on_input_map_removed<A>` 添加到 `PostUpdate`
- 如果启用 UI 特性，添加 `filter_captured_input` 系统
- 为固定更新添加 `swap_to_fixed_update` 和 `swap_to_update` 系统

**步骤六：设备类型注册**
- 根据特性标志注册鼠标输入类型（MouseButton、MouseMove、MouseScroll 等）
- 注册键盘输入类型（KeyCode、ModifierKey）
- 注册手柄输入类型（GamepadButton、GamepadStick、GamepadControlAxis 等）
- 注册虚拟输入类型（VirtualAxis、VirtualDPad）
- 注册和弦输入类型（ButtonlikeChord、AxislikeChord 等）

**步骤七：系统执行顺序配置**
- 配置 `InputManagerSystem::Tick` 在 `InputManagerSystem::Update` 之前运行
- 配置 `InputManagerSystem::Update` 在 Bevy 的 `InputSystems` 之后运行
- 配置 `InputManagerSystem::Unify` 在 `InputSystems` 之后收集输入
- 如果启用 UI，配置 `Filter` 集在 `UiSystems::Focus` 之后运行
- 如果启用 picking，配置 `Update` 在 `PickingSystems::Hover` 之前运行

**步骤八：服务器模式特殊处理**
- 如果是服务器模式，只添加 `tick_action_state<A>` 系统
- 跳过所有输入采集和处理系统
- 假设服务器通过网络接收客户端的 `ActionState` 或 `ActionDiff`

**插件生命周期钩子**：
- `build()` 方法只在启动时调用一次
- 不提供卸载钩子，插件一旦注册就持续有效
- 可以通过运行条件（Run Conditions）动态控制系统激活

**多插件实例共存**：
- 可以为不同的 `Actionlike` 类型注册多个插件实例
- 例如：`InputManagerPlugin::<PlayerAction>`、`InputManagerPlugin::<CameraAction>`、`InputManagerPlugin::<MenuAction>`
- 每个插件实例维护独立的系统集和类型注册
- 资源（如 `ClashStrategy`）是全局共享的

### 3.2. 输入处理的生命周期

**单帧输入处理完整时间线**：

**T0：帧开始前**
- Bevy 的事件循环检测到新的输入硬件事件（键盘按键、鼠标移动、手柄摇杆等）
- 原始事件被缓冲在 Bevy 的事件队列中

**T1：Bevy InputSystems 阶段**
- Bevy 内置的输入系统运行（位于 `PreUpdate` 调度）
- 更新 `ButtonInput<KeyCode>`、`ButtonInput<MouseButton>` 等资源
- 更新 `Axis<GamepadAxis>` 资源
- 处理鼠标移动事件，累积 `MouseMotion` 事件流
- 此阶段属于 Bevy 框架层，不由本框架控制

**T2：中央输入存储清理**（`InputManagerSystem::Tick`）
- `clear_central_input_store` 系统清空上一帧的输入数据
- 确保 `CentralInputStore` 不包含陈旧数据
- 准备接收新一帧的输入快照

**T3：动作状态时钟滴答**（`InputManagerSystem::Tick`）
- `tick_action_state<A>` 系统对所有 `ActionState<A>` 组件调用 `tick()` 方法
- 状态转换：`JustPressed` → `Pressed`，`JustReleased` → `Released`
- 如果启用 timing，更新按钮按压时长计数器
- 记录当前帧的时间戳，用于时长计算

**T4：可选的 UI 输入过滤**（`InputManagerSystem::Filter`）
- 如果启用 UI 特性，`filter_captured_input` 系统运行
- 查询所有 `Interaction` 组件，检测是否有 UI 元素被交互
- 如果有 UI 交互，清空 `ButtonInput<MouseButton>` 资源
- 防止点击 UI 按钮时触发游戏内动作

**T5：输入统一收集**（`InputManagerSystem::Unify`）
- 各种 `UpdatableInput::compute` 系统并行运行
- 每个系统从 Bevy 输入资源读取原始数据，写入 `CentralInputStore`
- 键盘系统：遍历所有 `KeyCode`，将按下的键存储为 `ButtonValue`
- 鼠标系统：读取 `MouseMotion` 事件流，累积为 `MouseMove` 的 `Vec2` 值
- 手柄系统：遍历所有手柄实体，读取按钮和轴状态
- 此阶段完成后，`CentralInputStore` 包含当前帧所有设备的输入快照

**T6：动作状态更新**（`InputManagerSystem::Update`）
- `update_action_state<A>` 系统是核心处理逻辑
- 遍历所有拥有 `InputMap<A>` 和 `ActionState<A>` 的实体
- 对每个实体执行以下步骤：

**T6.1：输入映射处理**
- 调用 `InputMap::process_actions()` 方法
- 对每个动作，查找所有绑定的输入
- 从 `CentralInputStore` 查询每个输入的状态
- 对于按钮类动作：如果任一输入按下，则动作激活（逻辑或）
- 对于轴类动作：累加所有输入的值（数值求和）
- 对于双轴类动作：累加所有输入的向量（向量求和）
- 生成 `UpdatedActions` 集合，包含所有激活的动作及其值

**T6.2：冲突检测与解决**
- 调用 `InputMap::handle_clashes()` 方法
- 遍历预计算的可能冲突列表（在映射修改时缓存）
- 对每对冲突的动作，检查它们是否同时激活
- 如果激活，分解输入为基本按键集合（BasicInputs）
- 判断是否存在真实冲突（一个是另一个的严格子集）
- 根据 `ClashStrategy` 决定保留哪个动作：
  - `PressAll`：保留两者，不做处理
  - `PrioritizeLongest`：保留按键组合更长的动作，移除较短的
- 从 `UpdatedActions` 中移除被覆盖的动作

**T6.3：状态写入**
- 调用 `ActionState::update()` 方法，将 `UpdatedActions` 写入状态
- 对每个更新的动作：
  - 按钮类：调用 `press()` 或 `release()` 更新状态和值
  - 轴类：调用 `set_value()` 更新值
  - 双轴类：调用 `set_axis_pair()` 更新向量
  - 三轴类：调用 `set_axis_triple()` 更新三维向量
- 如果动作被禁用（`disabled` 标志），强制设为未激活状态

**T7：手动控制窗口**（`InputManagerSystem::ManualControl`）
- 这是一个预留的系统集，框架本身不在此阶段运行系统
- 游戏逻辑可以在此时间点直接修改 `ActionState`
- 用途：UI 触发动作（点击虚拟按钮）、剧情强制动作、作弊码、AI 输入模拟
- 必须在 `Update` 之后运行，否则会被输入覆盖

**T8：游戏逻辑消费**（`Update` 调度）
- 游戏逻辑系统查询 `ActionState<A>` 组件
- 调用 `pressed()`、`just_pressed()`、`value()` 等方法读取动作状态
- 根据动作状态驱动游戏行为（移动角色、播放动画、发射子弹等）
- 此时状态已经稳定，不会再被修改

**T9：固定更新特殊处理**（如果使用物理）
- 在 `RunFixedMainLoop::BeforeFixedMainLoop` 调用 `swap_to_fixed_update<A>`
- 将当前 `state` 保存到 `update_state`，切换到 `fixed_update_state`
- 固定更新循环运行 `update_action_state<A>` 一次（即使循环多次也只更新一次）
- 在 `FixedPostUpdate` 调用 `tick_action_state<A>` 清理固定更新的状态
- 在 `RunFixedMainLoop::AfterFixedMainLoop` 调用 `swap_to_update<A>` 切回主循环状态
- 保证物理系统和渲染系统看到一致的输入状态，避免时间步长差异导致的抖动

**T10：清理与准备下一帧**（`PostUpdate`）
- `release_on_input_map_removed<A>` 系统运行
- 检测 `InputMap<A>` 组件被移除的实体
- 对这些实体的 `ActionState<A>` 调用 `reset_all()` 释放所有动作
- 防止组件移除后输入仍保持按下状态

**网络同步扩展流程**（可选）：
- 如果添加了 `generate_action_diffs<A>` 系统（需手动添加）
- 在 `PostUpdate` 调度，生成当前帧与上一帧的状态差异
- 将 `ActionDiff` 序列化为 `ActionDiffMessage` 并发送到网络
- 服务器接收后通过 `ActionState::apply_diff()` 重建客户端输入状态
- 支持增量传输，仅发送变化的动作，节省带宽

**性能优化点**：
- 输入统一收集阶段可并行执行（不同设备类型无依赖）
- 冲突检测使用预计算的冲突列表，避免运行时遍历所有组合
- 状态更新只处理激活的动作，未使用的动作不消耗计算
- 中央输入存储使用 HashMap 缓存，避免重复查询 Bevy 资源

---

## 4. 核心模块/组件深度剖析

### 4.1. 输入抽象层 (User Input Abstraction)

#### 4.1.1. 职责与边界

**核心职责**：
- 定义设备无关的输入接口规范，屏蔽底层输入设备差异
- 提供统一的输入查询 API，游戏逻辑无需关心输入来源
- 支持运行时扩展，允许注册自定义输入类型
- 实现输入模拟接口，用于测试和回放

**边界划分**：
- **内部边界**：仅定义抽象特质和基础类型，不包含具体设备实现
- **外部边界**：不处理输入值的业务逻辑转换（由输入处理器负责）
- **上游依赖**：依赖 `CentralInputStore` 提供当前帧的输入数据
- **下游消费**：被 `InputMap` 使用，将抽象输入转换为动作状态

**设计约束**：
- 所有输入类型必须实现序列化/反序列化，支持配置文件存储
- 必须实现克隆、相等性比较和哈希，用于集合操作
- 必须支持 Bevy 反射系统，允许运行时类型检查
- 必须提供输入分解方法，用于冲突检测

#### 4.1.2. 关键抽象与数据结构

**基础特质体系**：

**UserInput 特质（根特质）**：
- 所有输入类型的基类
- 定义两个核心方法：
  - `kind()`：返回输入控制类型（按钮、轴、双轴、三轴）
  - `decompose()`：分解为基本输入集合，用于冲突检测

**Buttonlike 特质（按钮类输入）**：
- 继承 UserInput，添加按钮语义
- 核心查询方法：
  - `pressed()`：是否当前按下
  - `get_pressed()`：返回 Option<bool>，未设置时为 None
  - `released()`：是否当前释放
  - `value()`：按压力度（0.0 到 1.0）
- 输入模拟方法：
  - `press()`、`release()`：模拟按下/释放
  - `press_as_gamepad()`、`release_as_gamepad()`：指定手柄模拟
  - `set_value()`：设置模拟力度
- 允许实现类型重写默认行为，适配不同输入源

**Axislike 特质（轴类输入）**：
- 表示单轴模拟输入（如鼠标滚轮、手柄扳机）
- 核心方法：
  - `value()`：返回 -1.0 到 1.0 的浮点值
  - `get_value()`：返回 Option<f32>
  - `set_value()`：模拟设置轴值

**DualAxislike 特质（双轴输入）**：
- 表示二维输入（如手柄摇杆、鼠标移动）
- 核心方法：
  - `axis_pair()`：返回 Vec2（X 和 Y 轴值）
  - `get_axis_pair()`：返回 Option<Vec2>
  - `set_axis_pair()`：模拟设置双轴值

**TripleAxislike 特质（三轴输入）**：
- 表示三维输入（如 3D 鼠标、VR 控制器）
- 核心方法：
  - `axis_triple()`：返回 Vec3（X、Y、Z 轴值）
  - `get_axis_triple()`：返回 Option<Vec3>
  - `set_axis_triple()`：模拟设置三轴值

**关键数据结构**：

**BasicInputs 枚举**：
- 表示输入的分解形式，用于冲突检测
- 变体：
  - `None`：无按键成分（纯轴类输入）
  - `Simple`：单个基础按键
  - `Composite`：多个可选按键（虚拟 D-Pad）
  - `Chord`：必须同时按下的按键组合
- 核心方法：
  - `len()`：逻辑按键数量（Composite 计为 1）
  - `clashes_with()`：判断两个输入是否冲突
  - `inputs()`：提取包含的所有物理按键

**ButtonValue 结构体**：
- 表示按钮的当前值
- 字段：
  - `pressed`：布尔值，是否按下
  - `value`：浮点值（0.0 到 1.0），按压力度
- 用于在 `CentralInputStore` 中缓存按钮状态

**输入控制类型枚举**（InputControlKind）：
- 四种类型：`Button`、`Axis`、`DualAxis`、`TripleAxis`
- 用于类型检查，确保输入和动作类型匹配
- 在插入映射时验证类型兼容性

#### 4.1.3. 内部交互逻辑

**输入查询流程**：
1. 游戏逻辑调用输入特质方法（如 `pressed()`）
2. 方法从 `CentralInputStore` 查询对应类型的缓存
3. 使用输入对象作为 HashMap 的键查找值
4. 返回查询结果（如果未缓存则返回默认值）

**输入缓存机制**：
- `CentralInputStore` 使用 `TypeId` 区分不同的输入类型
- 每种类型维护独立的 HashMap：`HashMap<Box<dyn Buttonlike>, ButtonValue>`
- 键是特质对象的 Box，值是实际输入状态
- 通过 `dyn-eq` 和 `dyn-hash` 实现特质对象的相等性和哈希

**输入注册与更新流程**：
1. 插件初始化时调用 `register_input_kind::<T>()` 注册输入类型
2. 创建 `UpdatableInput::compute` 系统并添加到调度
3. 每帧该系统从 Bevy 输入资源读取原始数据
4. 调用 `CentralInputStore::update_buttonlike()` 等方法写入缓存
5. 写入时使用默认构造的输入对象作为键（如 `KeyCode::Space`）

**输入模拟流程**：
1. 测试代码调用 `press()` 或 `set_value()` 方法
2. 方法获取 `World` 的可变引用
3. 找到对应的 Bevy 输入资源（如 `ButtonInput<KeyCode>`）
4. 调用资源的 `press()` 方法模拟输入
5. 下一帧 `UpdatableInput::compute` 会读取模拟的输入并写入缓存

**特质对象序列化策略**：
- 使用 `typetag` crate 为特质对象生成序列化代码
- 每个具体类型注册一个类型标签（如 "KeyCode"）
- 序列化时写入类型标签和数据
- 反序列化时根据标签查找类型并构造对象
- 需要为每个具体类型标注 `#[typetag::serde]` 属性

#### 4.1.4. 观察到的设计模式

**适配器模式**：
- 每个具体设备类型（KeyCode、MouseButton、GamepadButton）都是一个适配器
- 将 Bevy 的原生输入资源适配为统一的特质接口
- 隔离了设备差异，核心系统只依赖抽象接口

**策略模式**：
- 不同的输入类型实现不同的查询策略
- 例如：键盘从 `ButtonInput` 资源查询，手柄需要先找到手柄实体再查询
- 策略封装在具体类型的特质实现中

**模板方法模式**：
- 输入特质定义了查询的模板流程
- 默认实现提供通用逻辑（如 `pressed()` 调用 `get_pressed()`）
- 子类型可以重写关键步骤（如手柄需要检查手柄实体）

**享元模式**：
- 输入对象本身是轻量级的（大多只是枚举值）
- 通过 `Box<dyn Trait>` 共享接口代码
- 避免为每个输入类型复制相同的逻辑

### 4.2. 动作状态管理 (Action State Management)

#### 4.2.1. 职责与边界

**核心职责**：
- 存储和维护所有游戏动作的运行时状态（按下/释放、值、时长等）
- 提供查询 API 供游戏逻辑读取动作状态
- 管理状态生命周期，处理状态转换（刚按下 → 按住 → 刚释放 → 释放）
- 支持手动状态修改，允许非输入驱动的动作触发
- 支持固定更新和主循环的独立状态，避免时间步长不同步问题

**边界划分**：
- **不负责输入采集**：输入由 `CentralInputStore` 和 `InputMap` 负责
- **不负责输入映射**：映射关系由 `InputMap` 管理
- **仅负责状态存储和查询**：是纯粹的状态容器
- **上游输入源**：接收来自 `InputMap::process_actions()` 的更新数据
- **下游消费者**：被游戏逻辑系统查询，驱动游戏行为

**设计约束**：
- 必须支持每帧状态重置（清除 just_pressed/just_released）
- 必须支持动作禁用/启用（全局和单个动作级别）
- 必须支持网络序列化（用于状态同步和回放）
- 必须支持 ECS 组件和资源两种使用模式

#### 4.2.2. 关键抽象与数据结构

**ActionState 结构体**（泛型容器）：
- 泛型参数 `A: Actionlike`，每个 ActionState 对应一种动作枚举
- 核心字段：
  - `disabled`：全局禁用标志，为 true 时所有动作强制为未激活
  - `action_data`：HashMap，存储每个动作的详细状态数据

**ActionData 结构体**（单个动作的状态）：
- 字段：
  - `disabled`：该动作的禁用标志（独立于全局标志）
  - `kind_data`：ActionKindData 枚举，根据动作类型存储不同的数据

**ActionKindData 枚举**（类型特化的状态）：
- 四种变体对应四种输入控制类型：
  - `Button(ButtonData)`：按钮类动作的状态
  - `Axis(AxisData)`：轴类动作的状态
  - `DualAxis(DualAxisData)`：双轴类动作的状态
  - `TripleAxis(TripleAxisData)`：三轴类动作的状态

**ButtonData 结构体**（按钮状态详情）：
- 状态字段：
  - `state`：当前状态（ButtonState 枚举：JustPressed/Pressed/JustReleased/Released）
  - `update_state`：主循环状态副本
  - `fixed_update_state`：固定更新状态副本
- 值字段：
  - `value`：当前按压力度（0.0 到 1.0）
  - `update_value`：主循环值副本
  - `fixed_update_value`：固定更新值副本
- 时间字段（如果启用 timing）：
  - `timing`：Timing 结构体，记录按压开始时间和持续时长

**ButtonState 枚举**（状态机）：
- 四种状态形成循环状态机：
  - `Released`：释放状态（稳定态）
  - `JustPressed`：刚按下（过渡态，下一帧变为 Pressed）
  - `Pressed`：按住状态（稳定态）
  - `JustReleased`：刚释放（过渡态，下一帧变为 Released）
- 状态转换规则：
  - `tick()` 方法：JustPressed → Pressed，JustReleased → Released
  - `press()` 方法：非 Pressed 状态 → JustPressed，Pressed 保持不变
  - `release()` 方法：非 Released 状态 → JustReleased，Released 保持不变

**AxisData、DualAxisData、TripleAxisData 结构体**：
- 简化的状态结构，仅存储值，无状态机
- 同样维护三份副本：`value/pair/triple`、`update_*`、`fixed_update_*`
- 用于表示连续值的动作（如摇杆、鼠标移动）

**Timing 结构体**（可选特性）：
- 字段：
  - `instant_started`：动作开始的时间点（Option<Instant>）
  - `current_duration`：当前持续时长（Duration）
  - `previous_duration`：上次状态切换时的时长（Duration）
- 方法：
  - `tick()`：更新时长计数器
  - `flip()`：状态切换时记录当前时长到 previous_duration

#### 4.2.3. 内部交互逻辑

**状态更新流程**：
1. `InputMap::process_actions()` 生成 `UpdatedActions` 集合
2. `ActionState::update()` 接收 `UpdatedActions`
3. 遍历 `UpdatedActions` 中的每个动作：
   - 如果动作被禁用，跳过更新（值强制为 0）
   - 如果是按钮类动作：
     - 调用 `press()` 或 `release()` 更新状态机
     - 如果启用 timing，记录状态切换时间
   - 如果是轴类动作：
     - 调用 `set_value()` 更新值
   - 如果是双轴类动作：
     - 调用 `set_axis_pair()` 更新 Vec2
   - 如果是三轴类动作：
     - 调用 `set_axis_triple()` 更新 Vec3
4. 未在 `UpdatedActions` 中出现的动作保持上一帧状态

**状态查询流程**：
1. 游戏逻辑调用查询方法（如 `pressed(&Action::Jump)`）
2. 方法检查全局禁用标志和单个动作禁用标志
3. 如果动作禁用，返回默认值（false 或 0）
4. 从 `action_data` HashMap 获取动作数据
5. 如果动作从未触发过（未在 HashMap 中），返回默认值
6. 根据查询类型返回相应字段：
   - `pressed()`：检查 `ButtonData::state.pressed()`
   - `just_pressed()`：检查 `ButtonData::state.just_pressed()`
   - `value()`：返回 `AxisData::value`
   - `axis_pair()`：返回 `DualAxisData::pair`

**时钟滴答流程**：
1. `tick_action_state<A>` 系统每帧运行
2. 获取当前时间戳和上一帧时间戳
3. 遍历所有 `ActionState<A>` 组件
4. 对每个组件的每个动作数据调用 `tick()`：
   - 对按钮类动作：调用 `ButtonState::tick()` 进行状态转换
   - 如果启用 timing：更新 `current_duration`，计算时间差
5. 存储当前时间戳供下一帧使用

**固定更新同步流程**：
1. 在进入固定更新循环前（`RunFixedMainLoop::Before`）：
   - 调用 `swap_to_fixed_update_state()`
   - 将当前 `state/value` 保存到 `update_state/update_value`
   - 从 `fixed_update_state/fixed_update_value` 加载到 `state/value`
   - 现在状态反映的是固定更新的独立时间线
2. 固定更新循环运行，可能执行多次或零次：
   - 输入系统更新固定更新的状态
   - 物理系统读取固定更新的状态
3. 在退出固定更新循环后（`RunFixedMainLoop::After`）：
   - 调用 `swap_to_update_state()`
   - 将当前 `state/value` 保存到 `fixed_update_state/fixed_update_value`
   - 从 `update_state/update_value` 加载到 `state/value`
   - 恢复主循环的状态，渲染系统看到主循环状态

**状态禁用机制**：
- 全局禁用：设置 `ActionState::disabled = true`，所有查询返回默认值
- 单个动作禁用：设置 `ActionData::disabled = true`，该动作查询返回默认值
- 禁用不影响底层状态更新，只是查询时被屏蔽
- 重新启用后，状态会恢复到真实值，不会丢失输入

**状态重置机制**：
- `reset(&action)`：将单个动作重置为默认状态（按钮释放，轴为 0）
- `reset_all()`：重置所有动作
- `release_on_input_map_removed` 系统在 `InputMap` 移除时自动调用 `reset_all()`
- 防止组件移除后输入仍保持激活状态

#### 4.2.4. 观察到的设计模式

**状态模式**：
- `ButtonState` 枚举实现了经典状态模式
- 四种状态表示不同的生命周期阶段
- 状态转换规则清晰，通过 `tick()`、`press()`、`release()` 触发
- 避免了布尔标志的复杂组合

**享元模式**：
- 未触发的动作不占用 HashMap 空间
- 只有实际使用的动作才会创建 `ActionData`
- 节省内存，特别是当动作集很大但只使用少数动作时

**观察者模式（隐式）**：
- `ActionState` 不主动通知变化
- 但可以通过 `generate_action_diffs` 系统生成变化事件
- 支持网络同步和回放系统

**命令模式（手动控制）**：
- `press()`、`release()`、`set_value()` 等方法允许手动修改状态
- 可以将这些调用封装为命令对象
- 支持 UI 按钮、作弊码、AI 输入等场景

**双缓冲模式**：
- 维护 `update_state` 和 `fixed_update_state` 两套状态副本
- 避免固定更新和主循环相互干扰
- 类似于图形渲染中的双缓冲技术

### 4.3. 输入映射引擎 (Input Mapping Engine)

#### 4.3.1. 职责与边界

**核心职责**：
- 管理游戏动作到物理输入的多对多映射关系
- 处理输入绑定的增删改查操作
- 执行输入到动作的实时转换计算
- 检测并解决输入冲突（如 Ctrl+S 与 S 的冲突）
- 支持手柄设备绑定（多人游戏场景）

**边界划分**：
- **不负责输入采集**：输入数据由 `CentralInputStore` 提供
- **不负责状态存储**：动作状态由 `ActionState` 管理
- **核心职责是映射计算**：将输入状态转换为动作状态
- **上游依赖**：`CentralInputStore`（输入数据）、`ClashStrategy`（冲突策略）
- **下游输出**：`UpdatedActions` 集合，供 `ActionState` 消费

**设计约束**：
- 必须支持多对多映射（一个动作多个输入，一个输入多个动作）
- 必须支持四种输入控制类型（按钮、轴、双轴、三轴）
- 必须支持序列化/反序列化（配置文件、网络传输）
- 必须支持运行时动态修改（热加载输入配置）

#### 4.3.2. 关键抽象与数据结构

**InputMap 结构体**（映射容器）：
- 泛型参数 `A: Actionlike`
- 核心字段：
  - `buttonlike_map`：HashMap<A, Vec<Box<dyn Buttonlike>>>，按钮类动作的映射
  - `axislike_map`：HashMap<A, Vec<Box<dyn Axislike>>>，轴类动作的映射
  - `dual_axislike_map`：HashMap<A, Vec<Box<dyn DualAxislike>>>，双轴类动作的映射
  - `triple_axislike_map`：HashMap<A, Vec<Box<dyn TripleAxislike>>>，三轴类动作的映射
  - `associated_gamepad`：Option<Entity>，关联的手柄实体（本地多人支持）
- 设计特点：
  - 一个动作对应一个向量的输入绑定
  - 使用特质对象向量允许异构输入类型（如键盘和手柄同时绑定）
  - 四个 HashMap 分别处理不同输入控制类型，避免类型擦除

**UpdatedActions 结构体**（映射输出）：
- 包装 HashMap<A, UpdatedValue>
- 表示当前帧激活的动作及其值
- 由 `InputMap::process_actions()` 生成，传递给 `ActionState::update()`

**UpdatedValue 枚举**（动作值）：
- 四种变体对应四种输入控制类型：
  - `Button(bool)`：按钮是否按下
  - `Axis(f32)`：轴值（-1.0 到 1.0）
  - `DualAxis(Vec2)`：双轴向量
  - `TripleAxis(Vec3)`：三轴向量
- 类型安全：枚举变体确保类型匹配

**Clash 结构体**（冲突表示）：
- 内部使用，表示两个动作的潜在冲突
- 字段：
  - `action_a`：第一个动作
  - `action_b`：第二个动作
  - `inputs_a`：导致冲突的动作 A 的输入列表
  - `inputs_b`：导致冲突的动作 B 的输入列表
- 用于缓存可能的冲突，避免运行时重复计算

#### 4.3.3. 内部交互逻辑

**映射插入流程**（以按钮为例）：
1. 调用 `InputMap::insert(action, input)`
2. 检查动作类型是否为 `Button`（通过 `action.input_control_kind()`）
3. 如果类型不匹配，记录错误日志并返回
4. 将 `input` 装箱为 `Box<dyn Buttonlike>`
5. 检查 `buttonlike_map` 中是否已有该动作的条目：
   - 如果有，检查输入是否已存在（通过 `dyn-eq` 比较）
   - 如果不存在，将输入追加到向量
   - 如果没有，创建新向量并插入
6. 保证幂等性：重复插入相同绑定不会重复添加

**动作处理流程**（核心算法）：
1. `process_actions()` 方法接收参数：
   - `gamepads`：可选的手柄实体查询
   - `input_store`：中央输入存储
   - `clash_strategy`：冲突解决策略
2. 创建空的 `UpdatedActions` 集合
3. 确定使用的手柄实体：
   - 如果 `associated_gamepad` 已设置，使用它
   - 否则调用 `find_gamepad(gamepads)` 找到第一个手柄
   - 如果没有手柄，使用占位实体
4. 处理按钮类动作：
   - 遍历 `buttonlike_map` 的每个动作
   - 对每个动作的每个输入绑定：
     - 调用 `input.get_pressed(input_store, gamepad)` 查询状态
     - 使用逻辑或合并多个输入（任一按下则动作激活）
   - 将结果插入 `UpdatedActions::Button(pressed)`
5. 处理轴类动作：
   - 遍历 `axislike_map` 的每个动作
   - 对每个动作的每个输入绑定：
     - 调用 `input.get_value(input_store, gamepad)` 查询值
     - 使用加法合并多个输入（值累加）
   - 将结果插入 `UpdatedActions::Axis(value)`
6. 处理双轴类动作：
   - 遍历 `dual_axislike_map` 的每个动作
   - 对每个动作的每个输入绑定：
     - 调用 `input.get_axis_pair(input_store, gamepad)` 查询向量
     - 使用向量加法合并多个输入
   - 将结果插入 `UpdatedActions::DualAxis(pair)`
7. 处理三轴类动作（同双轴，使用 Vec3）
8. 调用 `handle_clashes()` 解决冲突

**冲突解决流程**：
1. `handle_clashes()` 方法接收参数：
   - `updated_actions`：当前激活的动作集合（可变引用）
   - `input_store`：中央输入存储
   - `clash_strategy`：冲突策略
   - `gamepad`：当前手柄实体
2. 调用 `possible_clashes()` 获取预计算的冲突列表：
   - 遍历所有按钮类动作的两两组合
   - 对每对动作，检查它们的输入是否存在包含关系
   - 使用 `BasicInputs::clashes_with()` 判断冲突
   - 缓存所有可能冲突的动作对
3. 过滤出实际发生的冲突：
   - 遍历可能冲突列表
   - 检查两个动作是否都在 `updated_actions` 中（都激活）
   - 检查导致激活的具体输入是否真的冲突（可能通过不同输入激活）
   - 记录实际冲突列表
4. 解决每个冲突：
   - 调用 `resolve_clash()` 根据策略决定保留哪个动作
   - `PressAll`：不做处理，保留两者
   - `PrioritizeLongest`：
     - 计算两个动作的最长输入组合长度
     - 移除组合较短的动作
     - 如果长度相等，保留两者
   - 从 `updated_actions` 中移除被覆盖的动作

**冲突检测算法**（`BasicInputs::clashes_with()`）：
- 两个输入冲突的条件：一个是另一个的严格子集
- 各种组合的冲突规则：
  - Simple vs Simple：不冲突（相同长度）
  - Simple vs Chord：Simple 是 Chord 的成员则冲突
  - Chord vs Chord：一个是另一个的真子集则冲突
  - Composite vs Simple：Simple 是 Composite 的成员则冲突
  - Composite vs Chord：任意 Composite 成员是 Chord 成员则冲突
  - Composite vs Composite：有公共成员则冲突
- 通过递归分解和集合操作实现复杂组合的冲突检测

**手柄绑定机制**：
- `set_gamepad(entity)` 设置关联手柄
- 处理动作时，手柄相关输入只查询指定手柄实体
- 支持本地多人游戏，每个玩家实体有独立的 `InputMap` 和手柄绑定
- 未指定手柄时，使用第一个可用手柄（单人游戏便利性）

#### 4.3.4. 观察到的设计模式

**多对多关系模式**：
- 通过向量存储一对多关系（一个动作多个输入）
- 通过遍历所有映射实现多对一关系（一个输入多个动作）
- 使用 HashMap 提供高效查找

**策略模式**：
- `ClashStrategy` 封装不同的冲突解决算法
- 运行时可切换策略，影响行为但不影响结构
- 未来可扩展更多策略（如基于优先级、基于上下文等）

**构建器模式**：
- `InputMap::new()` 和 `with()` 系列方法实现链式构建
- 提供流畅的 API 体验
- 支持多种插入方式（单个、批量、迭代器）

**工厂模式**：
- `InputMap::new()` 接受迭代器，灵活构造映射
- `InputMap::from()` 实现从 HashMap 转换
- `FromIterator` 特质提供更多构造方式

**缓存模式**：
- `possible_clashes()` 缓存可能冲突列表
- 避免运行时重复计算两两组合
- 映射修改时需重新计算（但框架未实现自动失效）

**组合模式**：
- 输入可以是简单输入（KeyCode）或组合输入（ButtonlikeChord）
- 组合输入本身也实现 Buttonlike 特质，可以嵌套
- 统一的特质接口使组合透明化

### 4.4. 冲突解决模块 (Clash Resolution)

#### 4.4.1. 职责与边界

**核心职责**：
- 检测输入组合之间的潜在冲突（一个是另一个的子集）
- 根据策略决定保留哪些动作，移除哪些动作
- 提供灵活的冲突解决策略，支持不同游戏需求
- 优化冲突检测性能，避免运行时全量遍历

**边界划分**：
- **仅处理按钮类输入的冲突**：轴类输入不存在冲突概念（值是累加的）
- **不修改输入映射**：冲突解决是运行时行为，不改变配置
- **不生成警告或错误**：静默处理冲突，开发者需主动检查映射
- **上游输入**：接收 `InputMap` 和 `UpdatedActions`
- **下游输出**：修改 `UpdatedActions`，移除被覆盖的动作

**设计约束**：
- 必须支持复杂输入组合（单键、和弦、虚拟 D-Pad、修饰键等）
- 必须高效执行（每帧运行，性能敏感）
- 必须可配置（不同游戏有不同需求）
- 必须确定性（相同输入总是产生相同结果）

#### 4.4.2. 关键抽象与数据结构

**ClashStrategy 枚举**（冲突策略）：
- 两种策略：
  - `PressAll`：所有匹配的输入都触发动作，不解决冲突
  - `PrioritizeLongest`：只触发最长的输入组合，短组合被覆盖
- 作为全局资源存在，影响所有输入映射
- 可以运行时切换策略，立即生效

**BasicInputs 枚举**（输入分解）：
- 将复杂输入分解为基本形式，用于冲突检测
- 四种变体：
  - `None`：无按键成分（纯轴类输入）
  - `Simple(Box<dyn Buttonlike>)`：单个基础按键
  - `Composite(Vec<Box<dyn Buttonlike>>)`：可选按键组（虚拟 D-Pad）
  - `Chord(Vec<Box<dyn Buttonlike>>)`：必需按键组（和弦）
- 关键方法：
  - `len()`：逻辑长度（Composite 计为 1，因为只需按一个）
  - `clashes_with(&BasicInputs)`：判断是否与另一个输入冲突
  - `inputs()`：提取所有物理按键

**Clash 结构体**（冲突记录）：
- 表示两个动作的潜在或实际冲突
- 字段：
  - `action_a`、`action_b`：冲突的两个动作
  - `inputs_a`、`inputs_b`：导致冲突的输入列表
- 用途：
  - 缓存可能冲突（编译时或配置修改时计算）
  - 记录实际冲突（运行时根据当前输入状态确定）

#### 4.4.3. 内部交互逻辑

**冲突检测详细算法**（`BasicInputs::clashes_with()`）：

**None 类型处理**：
- `None` 与任何类型都不冲突
- 轴类输入不参与冲突检测

**Simple vs Simple**：
- 两个单键永不冲突（长度相等，非子集关系）
- 即使是相同的键也不冲突（一个输入触发多个动作是合法的）

**Simple vs Chord**：
- 如果 Chord 长度大于 1（真正的和弦）且包含 Simple 的键，则冲突
- 例如：`S` 与 `Ctrl+S` 冲突（S 是 Ctrl+S 的子集）
- 反向检查：`Chord vs Simple` 也是同样逻辑

**Chord vs Chord**：
- 如果两个和弦都长度大于 1，且不相等，且一个是另一个的子集，则冲突
- 例如：`Ctrl+S` 与 `Ctrl+Shift+S` 冲突
- 使用 `all()` 迭代器方法检查子集关系

**Simple vs Composite**：
- 如果 Simple 是 Composite 的任一成员，则冲突
- 例如：`W` 与 `VirtualDPad::wasd()` 冲突（W 是 WASD 之一）
- 反向检查：`Composite vs Simple` 同理

**Composite vs Chord**：
- 如果 Chord 长度大于 1，且 Chord 的任一键是 Composite 的成员，则冲突
- 例如：`VirtualDPad::wasd()` 与 `Ctrl+W` 冲突（W 是 WASD 之一）
- 反向检查：`Chord vs Composite` 同理

**Composite vs Composite**：
- 如果两个 Composite 有公共成员，则冲突
- 例如：`VirtualDPad::wasd()` 与 `VirtualDPad::arrow_keys()` 不冲突（无公共键）
- 使用嵌套迭代器检查公共成员

**冲突解决详细流程**（`resolve_clash()`）：

**步骤一：收集激活原因**
- 遍历冲突中记录的 `inputs_a` 和 `inputs_b`
- 过滤出当前真正按下的输入（查询 `CentralInputStore`）
- 生成两个列表：`reasons_a_is_pressed` 和 `reasons_b_is_pressed`

**步骤二：检查虚假冲突**
- 遍历两个原因列表的笛卡尔积
- 如果存在任一原因对不冲突，则整体不是真冲突
- 例如：动作 A 可由 S 或 Ctrl+S 触发，动作 B 可由 W 或 Ctrl+W 触发
  - 如果当前按下 S 和 W，两者不冲突，不需要解决
  - 如果当前按下 Ctrl+S 和 W，冲突存在，需要解决
- 返回 None 表示无需处理

**步骤三：应用策略**
- 如果是 `PressAll`：返回 None，保留所有动作
- 如果是 `PrioritizeLongest`：
  - 计算动作 A 的最长输入组合长度（遍历原因列表，取最大 len()）
  - 计算动作 B 的最长输入组合长度
  - 比较长度：
    - A 更长：移除动作 B
    - B 更长：移除动作 A
    - 长度相等：保留两者（返回 None）

**可能冲突缓存机制**（`possible_clashes()`）：
- 在输入映射构建或修改时调用（框架未自动调用，需手动优化）
- 遍历所有按钮类动作的两两组合 (O(n²) 复杂度)
- 对每对动作，检查它们的所有输入绑定
- 使用 `BasicInputs::clashes_with()` 判断是否可能冲突
- 生成 `Clash` 对象，缓存到列表
- 运行时只需遍历缓存列表，不需要重新计算组合

**实际冲突过滤**（`get_clashes()`）：
- 接收可能冲突列表和当前激活的动作
- 过滤出两个动作都激活的冲突
- 对这些冲突，调用 `check_clash()` 验证当前输入是否真的冲突
- 只返回实际发生的冲突

#### 4.4.4. 观察到的设计模式

**策略模式**：
- `ClashStrategy` 封装不同的解决算法
- 策略对象作为参数传递，运行时可切换
- 符合开闭原则，扩展新策略无需修改现有代码

**模板方法模式**：
- `handle_clashes()` 定义冲突解决的总体流程
- `resolve_clash()` 是可变部分，根据策略执行不同逻辑
- 固定流程：检测 → 过滤 → 解决 → 移除

**享元模式**：
- `Clash` 对象缓存在内存中，共享冲突信息
- 避免每帧重新计算可能冲突
- 代价：映射修改时需要失效缓存（框架未实现）

**责任链模式（隐式）**：
- 冲突检测是多层过滤的过程
- 可能冲突 → 激活动作过滤 → 真实冲突验证 → 策略解决
- 每一层都可能决定不处理冲突

**规则引擎模式**：
- `BasicInputs::clashes_with()` 是一个规则引擎
- 大量的 if-else 分支表示不同组合的冲突规则
- 规则是硬编码的，未来可以考虑数据驱动

### 4.5. 输入处理器模块 (Input Processors)

#### 4.5.1. 职责与边界

**核心职责**：
- 对原始输入值进行标准化处理（死区、灵敏度、范围限制等）
- 提供可组合的处理器链，支持多步处理
- 适配不同输入设备的特性（如手柄摇杆的死区）
- 提供预设配置，简化常见场景的使用

**边界划分**：
- **仅处理数值转换**：不涉及输入逻辑（如按键组合）
- **独立于设备类型**：处理器不知道输入来源
- **无状态**：每次处理都是纯函数，不保存历史
- **上游输入**：原始输入值（来自 `CentralInputStore`）
- **下游输出**：处理后的值（写回 `CentralInputStore` 或直接用于动作计算）

**设计约束**：
- 必须支持序列化（配置文件存储）
- 必须支持反射（运行时检查）
- 必须高效（每帧处理大量输入）
- 必须可组合（多个处理器串联）

#### 4.5.2. 关键抽象与数据结构

**AxisProcessor 枚举**（单轴处理器）：
- 六种变体：
  - `Digital`：数字化，将连续值转为 -1/0/1
  - `Inverted`：反转符号
  - `Sensitivity(f32)`：灵敏度缩放
  - `Value(f32, f32)`：线性映射到新范围
  - `TargetValue(f32, f32)`：朝目标值缩放
  - `Custom(Box<dyn CustomAxisProcessor>)`：用户自定义处理器
- 核心方法：
  - `process(&self, input_value: f32) -> f32`：执行处理

**DualAxisProcessor 枚举**（双轴处理器）：
- 七种变体：
  - `Digital`：双轴数字化
  - `Inverted(DualAxisInverted)`：反转 X/Y 轴
  - `Sensitivity(DualAxisSensitivity)`：独立调整 X/Y 灵敏度
  - `Circle(CircleProcessor)`：圆形死区/限制
  - `Range(DualAxisBounds/DualAxisExclusion/DualAxisDeadZone)`：矩形区域处理
  - `Custom(Box<dyn CustomDualAxisProcessor>)`：用户自定义处理器
- 核心方法：
  - `process(&self, input_value: Vec2) -> Vec2`：执行处理

**死区处理器家族**：

**AxisExclusion、AxisDeadZone**：
- 单轴死区，定义一个忽略区间
- `AxisExclusion`：未缩放版本，区间内的值直接变为 0
- `AxisDeadZone`：缩放版本，区间外的值线性缩放到全范围
- 例如：死区 0.1，输入 0.05 → 0，输入 0.2 → 缩放为 0.111

**DualAxisExclusion、DualAxisDeadZone**：
- 双轴死区，定义一个十字形忽略区域（独立 X/Y 死区）
- 与单轴死区类似，但分别处理两个轴

**CircleExclusion、CircleDeadZone**：
- 圆形死区，基于向量长度
- 忽略半径内的所有输入
- 缩放版本将半径外的值缩放到单位圆
- 更符合摇杆的物理特性

**范围处理器家族**：

**AxisBounds**：
- 单轴范围限制，定义最小值和最大值
- 超出范围的值被裁剪到边界
- 用于防止输入超出预期范围

**DualAxisBounds**：
- 双轴范围限制，定义矩形区域
- 独立限制 X 和 Y 轴

**CircleBounds**：
- 圆形范围限制，定义最大半径
- 超出圆的输入被投影到圆周
- 确保输入向量长度不超过半径

**自定义处理器特质**：

**CustomAxisProcessor**：
- 用户实现该特质定义自定义单轴处理逻辑
- 方法：`process(&self, input_value: f32) -> f32`
- 必须实现克隆、相等性、哈希、序列化和反射

**CustomDualAxisProcessor**：
- 用户实现该特质定义自定义双轴处理逻辑
- 方法：`process(&self, input_value: Vec2) -> Vec2`
- 同样需要实现各种特质

#### 4.5.3. 内部交互逻辑

**处理器应用流程**：
1. 输入值从 `CentralInputStore` 读取（原始值）
2. 如果输入绑定指定了处理器，调用处理器的 `process()` 方法
3. 处理器根据类型执行相应的数值转换
4. 返回处理后的值，用于后续计算

**数字化处理算法**：
- 输入值取符号：`signum()`
- 结果为 -1、0 或 1
- 用于将模拟输入转为数字输入（如摇杆模拟方向键）

**反转处理算法**：
- 单轴：`-input_value`
- 双轴：可以独立反转 X 或 Y 轴
  - `Inverted::X`：`Vec2::new(-value.x, value.y)`
  - `Inverted::Y`：`Vec2::new(value.x, -value.y)`
  - `Inverted::XY`：`Vec2::new(-value.x, -value.y)`

**灵敏度处理算法**：
- 单轴：`input_value * sensitivity`
- 双轴：可以独立缩放 X 和 Y 轴
  - `Vec2::new(value.x * sensitivity.x, value.y * sensitivity.y)`

**死区处理算法**（未缩放）：
- 检查输入是否在死区范围内
- 单轴：`if abs(value) < threshold { 0 } else { value }`
- 圆形：`if length(value) < radius { Vec2::ZERO } else { value }`

**死区处理算法**（缩放）：
- 先排除死区
- 然后缩放到活动区（live zone）
- 单轴：`(value - sign(value) * threshold) / (1.0 - threshold)`
- 圆形：`value.normalize() * ((length - radius) / (1.0 - radius))`
- 确保输出仍在合法范围内

**范围限制算法**：
- 单轴：`value.clamp(min, max)`
- 矩形：`Vec2::new(value.x.clamp(min_x, max_x), value.y.clamp(min_y, max_y))`
- 圆形：`if length > radius { value.normalize() * radius } else { value }`

**处理器组合**：
- 当前框架不支持多个处理器串联（一个输入只能配置一个处理器）
- 如果需要多步处理，可以使用自定义处理器内部组合
- 未来可以扩展为处理器向量，按顺序执行

#### 4.5.4. 观察到的设计模式

**策略模式**：
- 不同的处理器变体是不同的处理策略
- 枚举封装策略选择
- 运行时可切换处理器类型

**装饰器模式**：
- 处理器本质上是对输入值的装饰
- 可以（理论上）多个处理器嵌套
- 每个处理器独立添加一种转换

**工厂方法模式**：
- 死区处理器提供预设工厂方法（如 `symmetric()`）
- 简化常见配置的创建
- 隐藏构造细节

**模板方法模式**：
- `process()` 方法定义处理流程
- 具体算法由子类型（枚举变体）实现
- 统一的接口，不同的实现

**空对象模式**：
- 不配置处理器时，输入值直接传递
- 相当于一个恒等处理器
- 避免了 Option 的复杂性

### 4.6. 网络同步模块 (Network Synchronization)

#### 4.6.1. 职责与边界

**核心职责**：
- 生成动作状态的增量差异（ActionDiff）
- 序列化差异为紧凑的网络消息
- 在接收端重建完整的动作状态
- 支持实体映射（Entity Remapping），处理客户端/服务器实体 ID 不一致

**边界划分**：
- **仅负责状态差异计算**：不处理网络传输层
- **不负责状态更新**：差异应用由 `ActionState` 负责
- **仅提供数据结构和算法**：网络库（如 bevy_replicon）负责实际发送
- **上游输入**：每帧的 `ActionState` 快照
- **下游输出**：`ActionDiffMessage` 消息流

**设计约束**：
- 必须高效（最小化带宽消耗）
- 必须可靠（能完整重建状态）
- 必须支持实体映射（客户端和服务器实体 ID 不同）
- 必须支持增量更新（只发送变化的部分）

#### 4.6.2. 关键抽象与数据结构

**ActionDiff 枚举**（状态差异）：
- 五种变体对应五种状态变化：
  - `Pressed { action: A, value: f32 }`：按钮被按下
  - `Released { action: A }`：按钮被释放
  - `AxisChanged { action: A, value: f32 }`：轴值改变
  - `DualAxisChanged { action: A, axis_pair: Vec2 }`：双轴值改变
  - `TripleAxisChanged { action: A, axis_triple: Vec3 }`：三轴值改变
- 设计特点：
  - 使用枚举避免类型擦除
  - 只存储变化的动作，未变化的动作不出现
  - 释放事件不携带值，进一步节省空间

**ActionDiffMessage 结构体**（网络消息）：
- 字段：
  - `owner`：Option<Entity>，拥有该状态的实体（None 表示全局资源）
  - `action_diffs`：Vec<ActionDiff<A>>，该实体的所有状态变化
- 实现 `Message` 特质（Bevy 的消息系统）
- 实现 `MapEntities` 特质，支持实体映射

**SummarizedActionState 结构体**（状态摘要）：
- 表示当前帧所有实体的动作状态快照
- 字段：
  - `button_state_map`：HashMap<Entity, HashMap<A, ButtonValue>>
  - `axis_state_map`：HashMap<Entity, HashMap<A, f32>>
  - `dual_axis_state_map`：HashMap<Entity, HashMap<A, Vec2>>
  - `triple_axis_state_map`：HashMap<Entity, HashMap<A, Vec3>>
- 使用 `Entity::PLACEHOLDER` 表示全局资源状态
- 用于逐帧比较，生成差异

#### 4.6.3. 内部交互逻辑

**状态摘要生成流程**（`SummarizedActionState::summarize()`）：
1. 创建空的四个状态映射（按钮、轴、双轴、三轴）
2. 如果全局 `ActionState<A>` 资源存在：
   - 遍历所有动作数据
   - 根据动作类型将值插入相应映射
   - 使用 `Entity::PLACEHOLDER` 作为实体键
3. 查询所有带有 `ActionState<A>` 组件的实体：
   - 遍历每个实体的所有动作数据
   - 根据动作类型将值插入相应映射
   - 使用实际实体 ID 作为键
4. 返回包含所有状态的摘要结构

**差异生成流程**（`send_diffs()`）：
1. 获取当前帧摘要和上一帧摘要
2. 遍历当前帧的所有实体（包括 PLACEHOLDER）：
   - 调用 `entity_diffs()` 生成该实体的差异列表
   - 对每个动作类型（按钮、轴、双轴、三轴）：
     - 获取当前帧和上一帧的值
     - 调用相应的 `*_diff()` 方法比较
     - 如果值不同，生成 `ActionDiff` 并添加到列表
   - 如果差异列表非空，构造 `ActionDiffMessage` 并写入消息流
3. 将当前帧摘要保存为下一帧的"上一帧摘要"

**按钮差异算法**（`button_diff()`）：
- 比较上一帧和当前帧的 `ButtonValue`
- 如果当前帧按下且上一帧未按下/释放：生成 `Pressed` 差异
- 如果当前帧释放且上一帧按下：生成 `Released` 差异
- 如果状态相同：返回 None（无差异）
- 特殊处理：上一帧不存在时视为释放状态

**轴差异算法**（`axis_diff()`、`dual_axis_diff()`、`triple_axis_diff()`）：
- 比较上一帧和当前帧的值
- 如果值不同：生成相应的 `*Changed` 差异
- 如果值相同：返回 None
- 上一帧不存在时视为默认值（0 或 ZERO 向量）

**差异应用流程**（`ActionState::apply_diff()`）：
1. 接收 `ActionDiff` 对象
2. 根据差异类型调用相应方法：
   - `Pressed`：调用 `set_button_value(action, value)`
   - `Released`：调用 `release(action)`
   - `AxisChanged`：调用 `set_value(action, value)`
   - `DualAxisChanged`：调用 `set_axis_pair(action, pair)`
   - `TripleAxisChanged`：调用 `set_axis_triple(action, triple)`
3. 状态被修改，无需其他操作

**实体映射流程**（`ActionDiffMessage::map_entities()`）：
1. 接收 `EntityMapper` 引用（由网络库提供）
2. 检查 `owner` 字段是否为 Some
3. 如果是，调用 `entity_mapper.get_mapped(entity)` 获取映射后的实体 ID
4. 更新 `owner` 字段为映射后的 ID
5. 动作本身不包含实体引用，无需映射

**系统集成流程**（用户手动添加）：
1. 在 `PostUpdate` 调度添加 `generate_action_diffs<A>` 系统
2. 系统使用 `Local<SummarizedActionState<A>>` 存储上一帧状态
3. 每帧生成新摘要并与上一帧比较
4. 将差异写入 `MessageWriter<ActionDiffMessage<A>>`
5. 网络库（如 bevy_replicon）从消息资源读取并发送

#### 4.6.4. 观察到的设计模式

**备忘录模式 (Memento Pattern)**：
- `SummarizedActionState` 是状态的备忘录
- 存储完整的状态快照，用于后续比较
- 不暴露状态内部细节，只提供比较和生成差异的方法

**命令模式 (Command Pattern)**：
- `ActionDiff` 是一个命令对象
- 封装状态变化操作（按下、释放、设置值）
- 可以序列化传输，在远程执行

**观察者模式 (Observer Pattern)**：
- `generate_action_diffs` 系统是观察者
- 监控 `ActionState` 的变化
- 生成变化通知（ActionDiff）发布到消息系统

**享元模式 (Flyweight Pattern)**：
- 差异只存储变化的部分，共享未变化的部分
- 节省带宽和内存
- 重建时与本地状态合并

**增量同步模式**：
- 不传输完整状态，只传输变化
- 接收端维护状态副本，应用增量更新
- 典型的分布式系统同步策略

---

## 5. 横切关注点 (Cross-Cutting Concerns)

### 5.1. 状态持久化

**序列化策略**：
- 框架完整支持 Serde 序列化
- `InputMap<A>` 可以序列化为 JSON、TOML、RON 等格式
- `ActionState<A>` 可以序列化（但通常不需要持久化）

**特质对象序列化挑战**：
- `InputMap` 包含 `Box<dyn Buttonlike>` 等特质对象
- Serde 默认不支持特质对象序列化
- 解决方案：使用 `typetag` crate
  - 为每个具体类型注册序列化标签
  - 序列化时写入类型标识符和数据
  - 反序列化时根据标识符构造对象

**配置文件工作流**：
1. 游戏提供默认输入映射（硬编码）
2. 用户修改输入映射（游戏内设置菜单）
3. 序列化修改后的 `InputMap` 到配置文件
4. 下次启动时反序列化配置文件
5. 合并默认映射和用户映射（`InputMap::merge()`）

**资产加载支持**（可选特性）：
- 启用 `asset` 特性后，`InputMap` 实现 `Asset` 特质
- 可以作为 Bevy 资产加载（.ron 文件等）
- 支持热重载，修改配置文件立即生效

**持久化最佳实践**：
- 只持久化 `InputMap`，不持久化 `ActionState`（运行时状态）
- 使用人类可读的格式（RON 或 TOML）便于手动编辑
- 提供配置验证，检测不合法的映射

### 5.2. 状态管理

**状态存储位置**：
- **组件存储**：`ActionState<A>` 和 `InputMap<A>` 作为组件附加到实体
  - 用于需要独立输入的实体（玩家角色、车辆等）
  - 支持本地多人游戏，每个玩家实体独立配置
- **资源存储**：作为全局资源
  - 用于全局动作（暂停菜单、截图等）
  - 所有实体共享一个输入配置

**状态生命周期管理**：
- **创建**：实体生成时手动添加组件或通过插件要求（`#[require]` 属性）
- **更新**：每帧自动更新（通过系统调度）
- **销毁**：实体销毁时自动清理
- **清理钩子**：`release_on_input_map_removed` 系统确保组件移除时释放输入

**状态一致性保证**：
- 固定更新和主循环使用独立状态副本
- `swap_to_fixed_update` 和 `swap_to_update` 系统确保切换
- 避免时间步长不同步导致的状态不一致

**状态查询 API 设计**：
- 提供多层次查询方法：
  - 简单查询：`pressed()`、`just_pressed()`、`value()`
  - 详细查询：`button_data()`、`axis_data()` 等
  - 批量查询：`get_pressed()`、`get_just_pressed()` 等
- 所有查询方法处理未初始化状态（返回默认值）
- 查询方法遵循 Rust 命名惯例（`get_` 前缀表示可能失败）

**状态修改控制**：
- 禁用机制：
  - 全局禁用：`ActionState::disable()`
  - 单个动作禁用：`ActionState::disable_action()`
  - 禁用时查询返回默认值，但底层状态继续更新
- 手动修改：
  - `press()`、`release()`、`set_value()` 等方法
  - 用于 UI 触发、作弊码、AI 输入等场景
  - 在 `InputManagerSystem::ManualControl` 阶段执行

### 5.3. 错误处理与弹性设计

**编译期错误防护**：
- 泛型约束：`Actionlike` 特质确保类型安全
- 类型检查：插入映射时验证动作类型与输入类型匹配
- 调试断言：关键方法使用 `debug_assert!` 检查前提条件

**运行时错误处理**：
- **类型不匹配错误**：
  - 尝试为按钮类动作插入轴类输入时，记录错误日志并忽略
  - 不会 panic，保证系统鲁棒性
- **缺失输入数据**：
  - 查询 `CentralInputStore` 失败时返回 None 或默认值
  - 未注册的输入类型不会导致崩溃
- **实体不存在**：
  - 查询不存在的手柄实体时使用占位符实体
  - 系统查询失败时跳过，不影响其他实体

**防御性编程实践**：
- 使用 `Option` 和 `Result` 处理可能失败的操作
- 所有查询方法提供 `get_*` 版本返回 `Option`
- 提供 `*_or_default` 方法自动处理缺失数据

**用户友好的错误消息**：
- 类型不匹配时打印清晰的错误信息（包含动作和输入类型）
- 使用 `bevy::log` 系统，遵循 Bevy 日志级别
- 错误消息包含调用栈信息（通过 `#[track_caller]` 属性）

**弹性设计原则**：
- **优雅降级**：输入系统失败时游戏仍可运行（输入全部视为释放）
- **部分可用**：一个输入设备失败不影响其他设备
- **状态隔离**：一个玩家的输入问题不影响其他玩家

**测试友好设计**：
- 提供输入模拟 API（`press()`、`set_value()` 等）
- 支持完全确定性的状态更新（给定输入产生固定输出）
- 可以禁用实际输入采集，仅使用模拟输入

### 5.4. 并发模型

**Bevy ECS 并发特性**：
- 系统查询可以并行执行（读取不同组件或只读访问）
- 框架的系统遵循 Bevy 并发规则，避免数据竞争

**系统并行性分析**：
- **可并行系统**：
  - 不同设备的 `UpdatableInput::compute` 系统（写入不同的 `CentralInputStore` 分区）
  - 处理不同 `Actionlike` 类型的 `update_action_state` 系统
- **串行依赖**：
  - `tick_action_state` 必须在 `update_action_state` 之前
  - `clear_central_input_store` 必须在输入采集之前
  - UI 过滤必须在状态更新之前

**资源访问模式**：
- **独占访问资源**：
  - `CentralInputStore`：写入时独占（但不同设备类型可能访问不同分区）
  - `ActionState`：每个实体独立，无冲突
- **共享访问资源**：
  - `ClashStrategy`：只读访问
  - Bevy 输入资源（`ButtonInput` 等）：只读访问

**并发优化策略**：
- 使用 `ParallelCommands` 异步修改状态（框架未使用，但可扩展）
- 将计算密集型操作（如冲突检测）异步化（框架未实现，但可扩展）
- 缓存可能冲突列表，避免运行时计算

**线程安全保证**：
- 所有公共类型实现 `Send + Sync`（ECS 组件要求）
- 使用 Bevy 的资源管理系统，避免手动锁
- 不使用全局可变状态

**固定更新与主循环隔离**：
- 两个循环使用独立的状态副本，避免同步问题
- 切换点明确定义（`swap_to_*` 系统）
- 固定更新可能运行多次，主循环只看到最终结果

---

## 6. 接口与通信

### 6.1. API 契约

**公共 API 设计原则**：
- **类型安全**：大量使用泛型和特质约束，编译期捕获错误
- **零成本抽象**：关键路径无运行时开销（内联、泛型单态化）
- **符合习惯**：遵循 Rust 和 Bevy 生态的命名和设计惯例
- **文档完备**：所有公共 API 都有详细文档（`#![forbid(missing_docs)]`）

**核心 API 类别**：

**插件 API**：
- `InputManagerPlugin::<A>::default()`：创建客户端插件
- `InputManagerPlugin::<A>::server()`：创建服务器插件
- `App::add_plugins(plugin)`：注册插件

**动作定义 API**：
- `#[derive(Actionlike)]`：派生动作枚举
- `#[actionlike(Button/Axis/DualAxis/TripleAxis)]`：指定动作类型
- `MyAction::input_control_kind(&self) -> InputControlKind`：查询动作类型

**输入映射 API**：
- `InputMap::new(bindings)`：从迭代器构造映射
- `InputMap::insert(action, input)`：插入单个绑定
- `InputMap::insert_axis/dual_axis/triple_axis()`：插入轴类绑定
- `InputMap::with(action, input)`：链式构建
- `InputMap::set_gamepad(entity)`：绑定手柄
- `InputMap::clear_action(action)`：清除动作的所有绑定
- `InputMap::merge(other)`：合并两个映射

**动作状态查询 API**：
- `ActionState::pressed(&action) -> bool`：是否按下
- `ActionState::just_pressed(&action) -> bool`：是否刚按下
- `ActionState::released(&action) -> bool`：是否释放
- `ActionState::just_released(&action) -> bool`：是否刚释放
- `ActionState::value(&action) -> f32`：轴值
- `ActionState::axis_pair(&action) -> Vec2`：双轴向量
- `ActionState::axis_triple(&action) -> Vec3`：三轴向量

**动作状态修改 API**：
- `ActionState::press(&action)`：手动按下
- `ActionState::release(&action)`：手动释放
- `ActionState::set_value(&action, value)`：设置轴值
- `ActionState::set_axis_pair(&action, pair)`：设置双轴值
- `ActionState::disable()`：禁用所有动作
- `ActionState::disable_action(&action)`：禁用单个动作

**输入模拟 API**（测试用）：
- `KeyCode::Space.press(world)`：模拟按键
- `MouseButton::Left.release(world)`：模拟鼠标释放
- `GamepadButton.set_value(world, 0.5)`：模拟手柄按压力度

**扩展 API**：
- `App::register_input_kind::<T>(kind)`：注册自定义输入类型
- `impl UpdatableInput for MyInput`：实现输入更新逻辑
- `impl CustomAxisProcessor for MyProcessor`：自定义处理器

**API 稳定性承诺**：
- 公共 API 遵循语义化版本
- 破坏性变更只在主版本更新中出现
- 弃用 API 会先标记 `#[deprecated]` 一个版本周期

### 6.2. 内部通信协议

**组件间通信方式**：
- **基于 ECS 查询**：系统通过查询组件读写数据
- **资源共享**：`ClashStrategy`、`CentralInputStore` 作为全局资源
- **消息传递**：`ActionDiffMessage` 通过 Bevy 消息系统传递

**系统调度顺序依赖**：
- 使用 Bevy 的 SystemSet 定义执行顺序
- 关键系统集：
  - `InputManagerSystem::Tick`：状态清理
  - `InputManagerSystem::Unify`：输入采集
  - `InputManagerSystem::Update`：状态更新
  - `InputManagerSystem::ManualControl`：手动控制窗口
- 顺序链：Tick → Unify → Update → ManualControl

**数据流向图（概念描述）**：
```
硬件输入事件
    ↓
Bevy InputSystems（更新 ButtonInput、Axis 等资源）
    ↓
UpdatableInput::compute 系统（写入 CentralInputStore）
    ↓
InputMap::process_actions（读取 CentralInputStore，生成 UpdatedActions）
    ↓
InputMap::handle_clashes（应用 ClashStrategy，修改 UpdatedActions）
    ↓
ActionState::update（将 UpdatedActions 写入状态）
    ↓
游戏逻辑系统（查询 ActionState，驱动游戏行为）
```

**事件驱动模式**：
- 框架不使用 Bevy 事件系统传递输入（使用资源和组件）
- 网络同步使用消息系统（类似事件，但更高效）
- 游戏逻辑可以自行定义事件响应输入（框架不强制）

**模块解耦机制**：
- 通过特质定义接口，隐藏实现细节
- 使用依赖注入（插件系统）动态组装功能
- 核心逻辑不依赖具体输入设备，只依赖抽象特质

**扩展点设计**：
- **输入类型扩展**：实现 `UpdatableInput` 特质并注册
- **处理器扩展**：实现 `CustomAxisProcessor` 特质
- **冲突策略扩展**：修改 `ClashStrategy` 枚举（需修改框架）
- **动作扩展**：定义新的 `Actionlike` 枚举

**性能优化的通信策略**：
- 避免克隆大对象，使用引用传递
- 缓存计算结果（如可能冲突列表）
- 使用 HashMap 快速查找，避免线性搜索
- 只处理激活的动作，跳过未使用的动作

---

## 结语

**Leafwing Input Manager** 是一个设计精良、功能完备的输入管理框架，其核心优势在于：

**抽象层次清晰**：从底层设备输入到高层游戏动作，层层抽象，职责明确。

**灵活性与易用性并重**：既支持简单的单人游戏场景，也支持复杂的本地多人和网络多人场景。

**与 Bevy 深度集成**：充分利用 Bevy 的 ECS、插件、反射、资源管理等特性，原生支持 Bevy 工作流。

**可扩展性强**：通过特质和插件系统，可以轻松添加新的输入设备、处理器和功能。

**类型安全**：大量使用 Rust 类型系统，编译期捕获错误，减少运行时 bug。

该框架特别适合需要支持多种输入设备、本地多人游戏、网络同步、输入重映射等复杂需求的 Bevy 项目。其设计模式和架构决策值得其他 ECS 框架的输入系统借鉴。