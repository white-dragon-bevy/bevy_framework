# bevy_dylib 模块文档

## 概述

`bevy_dylib` 是 Bevy 引擎的动态链接模块，专门用于在开发过程中强制启用动态链接，以显著提高增量编译的速度。该模块通过将 Bevy 引擎构建为动态库来实现快速的开发迭代。

### 版本信息
- **版本**: 0.17.0-dev
- **Rust 版本**: 2024 edition
- **许可证**: MIT OR Apache-2.0

## 主要功能

### 1. 动态链接支持
- 强制将 Bevy 引擎编译为动态库 (dylib)
- 大幅提升增量编译速度，特别适用于开发阶段
- 通过减少链接时间来改善开发体验

### 2. 开发优化
- 专为开发环境设计，不推荐在发布版本中使用
- 简化开发过程中的编译流程
- 提供多种启用方式以适应不同的开发需求

## 核心结构

### Cargo.toml 配置

```toml
[package]
name = "bevy_dylib"
version = "0.17.0-dev"
edition = "2024"
description = "Force the Bevy Engine to be dynamically linked for faster linking"

[lib]
crate-type = ["dylib"]

[dependencies]
bevy_internal = { path = "../bevy_internal", version = "0.17.0-dev", default-features = false }
```

### 库文件结构

```rust
// 强制链接主要的 bevy crate
#[expect(
    unused_imports,
    clippy::single_component_path_imports,
    reason = "This links the main bevy crate when using dynamic linking"
)]
use bevy_internal;
```

## API 使用方法

### 方法一：推荐方式 - 命令行参数

使用 `cargo run` 命令时添加 `--features bevy/dynamic_linking` 标志：

```bash
cargo run --features bevy/dynamic_linking
```

**优点**：
- 不需要修改项目文件
- 易于在开发和发布模式之间切换
- 避免意外在发布版本中包含动态链接

### 方法二：Cargo.toml 配置（不推荐）

在项目的 `Cargo.toml` 文件中添加 `dynamic_linking` 特性：

```toml
[dependencies]
bevy = { version = "0.17", features = ["dynamic_linking"] }
```

**缺点**：
- 需要在创建发布版本时手动移除该特性
- 容易忘记移除导致发布版本包含不必要的文件

### 方法三：手动依赖方式

1. 在 `Cargo.toml` 中添加 `bevy_dylib` 依赖：

```toml
[dependencies]
# 仅在调试模式下启用
[target.'cfg(debug_assertions)'.dependencies]
bevy_dylib = "0.17"
```

2. 在 `main.rs` 中添加使用声明：

```rust
#[allow(unused_imports)]
#[cfg(debug_assertions)]  // 仅在调试模式下启用
use bevy_dylib;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .run();
}
```

## 与其他 Bevy 模块的集成

### bevy_internal 依赖关系

`bevy_dylib` 直接依赖于 `bevy_internal` 模块：

```rust
// 通过 use 语句强制链接 bevy_internal
use bevy_internal;
```

### 特性传递机制

当启用 `dynamic_linking` 特性时，会自动传递到相关模块：

```toml
# bevy_internal/Cargo.toml 中的特性配置
dynamic_linking = ["bevy_diagnostic/dynamic_linking"]
```

### 编译配置

动态链接配置会影响以下方面：
- 编译输出为 `.dll`/`.so`/`.dylib` 文件
- 运行时需要动态库文件
- 链接时间显著减少

## 常见使用场景

### 1. 日常开发

**场景描述**：开发者在编写游戏逻辑时需要频繁编译测试

**使用方式**：
```bash
# 开发时使用
cargo run --features bevy/dynamic_linking

# 或者设置别名
alias dev-run="cargo run --features bevy/dynamic_linking"
```

### 2. 快速原型开发

**场景描述**：快速验证想法和功能，需要极快的编译速度

**配置示例**：
```toml
# .cargo/config.toml
[alias]
dev = "run --features bevy/dynamic_linking"
fast = "run --features bevy/dynamic_linking --release"
```

### 3. 团队协作开发

**场景描述**：团队成员需要统一的开发环境配置

**最佳实践**：
```bash
# 项目 README.md 中的开发指南
## 开发环境启动
cargo run --features bevy/dynamic_linking

## 发布版本构建
cargo build --release
```

### 4. CI/CD 流水线

**场景描述**：在持续集成中区分开发和发布构建

**配置示例**：
```yaml
# .github/workflows/ci.yml
- name: Build Development
  run: cargo build --features bevy/dynamic_linking

- name: Build Release
  run: cargo build --release
```

## 重要注意事项

### ⚠️ 发布版本警告

**绝对不要在发布版本中启用动态链接！**

原因：
- 需要额外分发 `libstd.so` 和 `libbevy_dylib.so` 文件
- 增加发布包大小和复杂性
- 可能导致运行时依赖问题

### 📝 最佳实践

1. **开发阶段**：
   ```bash
   cargo run --features bevy/dynamic_linking
   ```

2. **测试阶段**：
   ```bash
   cargo test --features bevy/dynamic_linking
   ```

3. **发布构建**：
   ```bash
   cargo build --release  # 不包含 dynamic_linking
   ```

### 🔧 性能影响

- **编译时间**：大幅减少（可达 50-80% 的改善）
- **运行时性能**：轻微影响（动态链接开销）
- **内存使用**：可能略有增加

### 🐛 故障排除

#### 问题：找不到动态库文件
```
error while loading shared libraries: libbevy_dylib.so
```

**解决方案**：
1. 确保在相同环境下编译和运行
2. 检查 `LD_LIBRARY_PATH` 环境变量
3. 重新编译项目

#### 问题：链接错误
```
error: linking failed
```

**解决方案**：
1. 清理构建缓存：`cargo clean`
2. 重新编译：`cargo build --features bevy/dynamic_linking`
3. 检查系统动态链接器配置

## 技术实现细节

### 编译类型配置

```toml
[lib]
crate-type = ["dylib"]
```

这个配置告诉 Rust 编译器将此 crate 编译为动态库。

### 强制链接机制

```rust
#[expect(unused_imports, clippy::single_component_path_imports)]
use bevy_internal;
```

通过 `use` 语句确保 `bevy_internal` 被包含在动态库中，即使看起来没有直接使用。

### 特性传播

动态链接特性会通过依赖链传播到所有相关的 Bevy 模块，确保整个引擎以动态方式链接。

## 与 Roblox-TS 迁移的考虑

在将代码迁移到 Roblox 生态系统时，`bevy_dylib` 的概念不直接适用，因为：

1. **Roblox-TS 编译**：TypeScript 编译为 Lua，没有动态链接概念
2. **@rbxts/matter ECS**：作为 TypeScript 模块直接导入
3. **替代优化**：在 Roblox-TS 中可以考虑：
   - 模块化代码结构
   - 懒加载机制
   - 增量更新策略

## 总结

`bevy_dylib` 是一个专门为提升开发体验而设计的实用模块。它通过启用动态链接显著减少了编译时间，让开发者能够更快地迭代和测试代码。正确使用这个模块可以大幅提升开发效率，但必须注意不要在生产环境中启用它。

**关键要点**：
- ✅ 仅在开发阶段使用
- ✅ 使用命令行参数方式启用
- ✅ 定期测试发布版本构建
- ❌ 不要在发布版本中包含
- ❌ 不要在 Cargo.toml 中永久启用