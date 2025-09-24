# TypeScript 到 Blink IDL 自动生成方案

## 概述

实现开发时使用 @rbxts/remo（类型安全、易调试），生产环境使用 Blink（高性能），通过 TypeScript 类型定义自动生成 Blink IDL 文件。

## 设计思路

```
开发阶段：TypeScript 类型 → @rbxts/remo → 自动序列化 + 类型安全
生产构建：TypeScript 类型 → 生成 Blink IDL → Blink 编译 → Buffer 序列化
```

### 为什么选择 @rbxts/remo

1. **类型安全** - 完整的 TypeScript 类型支持
2. **自动序列化** - 自动处理复杂数据类型
3. **开发友好** - 内置调试工具和日志
4. **成熟稳定** - 社区广泛使用的库
5. **零配置** - 开箱即用

## 实现方案

### 1. TypeScript 类型定义（源头）

```typescript
// src/protocols/types/replicon.types.ts
import { NetworkEvent, NetworkProtocol, Reliable, Unreliable, Client, Server } from "./decorators";

// 使用装饰器标记网络协议
@NetworkProtocol("Replicon")
export namespace RepliconProtocol {

    // 组件数据结构
    export interface ComponentData {
        componentId: string;
        data: Buffer;
    }

    // 实体生成事件
    @NetworkEvent({
        from: Server,
        type: Reliable,
        call: "SingleSync"
    })
    export interface EntitySpawn {
        entityId: number;
        components: ComponentData[];
    }

    // 实体销毁事件
    @NetworkEvent({
        from: Server,
        type: Reliable,
        call: "SingleSync"
    })
    export interface EntityDespawn {
        entityId: number;
    }

    // 组件更新
    @NetworkEvent({
        from: Server,
        type: Unreliable,
        call: "MultiSync"
    })
    export interface ComponentUpdate {
        entityId: number;
        componentId: string;
        data: Buffer;
    }
}
```

### 2. 装饰器实现

```typescript
// src/protocols/decorators.ts
import "reflect-metadata";

export const Server = "Server";
export const Client = "Client";
export const Reliable = "Reliable";
export const Unreliable = "Unreliable";

// 协议装饰器
export function NetworkProtocol(namespace: string) {
    return function (target: any) {
        Reflect.defineMetadata("protocol:namespace", namespace, target);
    };
}

// 事件装饰器
export function NetworkEvent(options: {
    from: string;
    type: string;
    call?: string;
}) {
    return function (target: any, propertyKey: string) {
        const events = Reflect.getMetadata("protocol:events", target) || [];
        events.push({
            name: propertyKey,
            ...options
        });
        Reflect.defineMetadata("protocol:events", events, target);
    };
}

// RPC 装饰器
export function NetworkFunction(options: {
    yield: "Coroutine" | "Future" | "Promise";
}) {
    return function (target: any, propertyKey: string) {
        const functions = Reflect.getMetadata("protocol:functions", target) || [];
        functions.push({
            name: propertyKey,
            ...options
        });
        Reflect.defineMetadata("protocol:functions", functions, target);
    };
}
```

### 3. 开发时网络层（使用 @rbxts/remo）

首先安装 remo：
```bash
npm install @rbxts/remo
```

定义网络协议（使用 remo）：
```typescript
// src/roblox_blink_network/remo-remotes.ts
import { createRemotes, remote, namespace } from "@rbxts/remo";
import { RepliconProtocol } from "../protocols/types/replicon.types";

// 使用 remo 定义远程事件
const remotes = createRemotes({
    // Replicon 命名空间
    replicon: namespace({
        // 服务器到客户端事件
        entitySpawn: remote<Server, [data: RepliconProtocol.EntitySpawn]>(),
        entityDespawn: remote<Server, [data: RepliconProtocol.EntityDespawn]>(),
        componentUpdate: remote<Server, [data: RepliconProtocol.ComponentUpdate]>(),

        // 客户端到服务器事件
        requestEntity: remote<Client, [entityId: number]>(),
    }),

    // Combat 命名空间
    combat: namespace({
        damageDealt: remote<Server, [damage: CombatProtocol.DamageDealt]>(),
        abilityUsed: remote<Client, [ability: CombatProtocol.AbilityUsed]>(),
    }),
});

export default remotes;
```

Remo 网络管理器实现：
```typescript
// src/roblox_blink_network/remo-network.ts
import remotes from "./remo-remotes";
import { INetworkManager } from "./interfaces";

export class RemoNetworkManager implements INetworkManager {
    constructor() {
        if (RunService.IsStudio()) {
            print("[RemoNetwork] Using @rbxts/remo for development");
            // Remo 自动提供调试信息
        }
    }

    // 发送事件（使用 remo）
    send<T>(eventPath: string, data: T, target?: Player): void {
        const [namespace, eventName] = eventPath.split(".");

        // 动态访问 remo 远程对象
        const ns = (remotes as any)[namespace.toLowerCase()];
        if (!ns) {
            error(`Namespace '${namespace}' not found in remo remotes`);
        }

        const remote = ns[eventName];
        if (!remote) {
            error(`Event '${eventName}' not found in namespace '${namespace}'`);
        }

        // Remo 自动处理序列化
        if (RunService.IsServer()) {
            if (target) {
                remote.fire(target, data);
            } else {
                remote.fireAll(data);
            }
        } else {
            remote.fire(data);
        }
    }

    // 监听事件
    on<T>(eventPath: string, handler: (data: T, sender?: Player) => void): void {
        const [namespace, eventName] = eventPath.split(".");

        const ns = (remotes as any)[namespace.toLowerCase()];
        if (!ns) {
            error(`Namespace '${namespace}' not found in remo remotes`);
        }

        const remote = ns[eventName];
        if (!remote) {
            error(`Event '${eventName}' not found in namespace '${namespace}'`);
        }

        // Remo 连接处理器
        if (RunService.IsServer()) {
            remote.connect((player: Player, ...args: any[]) => {
                handler(args[0] as T, player);
            });
        } else {
            remote.connect((...args: any[]) => {
                handler(args[0] as T);
            });
        }
    }

    // 批量发送
    broadcast<T>(eventPath: string, data: T): void {
        const [namespace, eventName] = eventPath.split(".");

        const ns = (remotes as any)[namespace.toLowerCase()];
        const remote = ns?.[eventName];

        if (remote && RunService.IsServer()) {
            remote.fireAll(data);
        }
    }
}

// Remo 提供的额外功能
export class RemoDebugTools {
    // 启用 remo 调试模式
    static enableDebug() {
        // Remo 会自动记录所有网络事件
        _G.REMO_DEBUG = true;
    }

    // 获取网络统计
    static getStats() {
        // Remo 内置统计功能
        return remotes.getStats();
    }

    // 设置带宽限制（用于测试）
    static setBandwidthLimit(bytesPerSecond: number) {
        remotes.setBandwidthLimit(bytesPerSecond);
    }
}
```

### 4. TypeScript 类型分析器

```typescript
// build/ts-to-blink.ts
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

export class TypeScriptToBlinkGenerator {
    private program: ts.Program;
    private checker: ts.TypeChecker;

    constructor(private sourceFiles: string[]) {
        this.program = ts.createProgram(sourceFiles, {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            experimentalDecorators: true,
            emitDecoratorMetadata: true
        });
        this.checker = this.program.getTypeChecker();
    }

    generateBlink(): Map<string, string> {
        const protocols = new Map<string, string>();

        for (const sourceFile of this.program.getSourceFiles()) {
            if (this.sourceFiles.includes(sourceFile.fileName)) {
                this.visitNode(sourceFile, protocols);
            }
        }

        return protocols;
    }

    private visitNode(node: ts.Node, protocols: Map<string, string>) {
        if (ts.isModuleDeclaration(node)) {
            const namespace = this.getNamespace(node);
            if (namespace) {
                const blinkContent = this.generateBlinkForNamespace(node, namespace);
                protocols.set(namespace, blinkContent);
            }
        }

        ts.forEachChild(node, child => this.visitNode(child, protocols));
    }

    private generateBlinkForNamespace(node: ts.ModuleDeclaration, namespace: string): string {
        let blink = `namespace ${namespace}\n\n`;

        // 收集所有接口
        const interfaces: ts.InterfaceDeclaration[] = [];
        const events: Array<{name: string, metadata: any}> = [];

        this.collectInterfaces(node, interfaces);

        // 生成结构体
        for (const iface of interfaces) {
            const metadata = this.getEventMetadata(iface);
            if (metadata) {
                events.push({name: iface.name!.text, metadata});
            } else {
                // 普通结构体
                blink += this.generateStruct(iface);
            }
        }

        // 生成事件
        for (const event of events) {
            blink += this.generateEvent(event.name, event.metadata);
        }

        return blink;
    }

    private generateStruct(iface: ts.InterfaceDeclaration): string {
        let struct = `struct ${iface.name!.text} {\n`;

        for (const member of iface.members) {
            if (ts.isPropertySignature(member)) {
                const name = member.name!.getText();
                const type = this.mapTypeToBlinkType(member.type!);
                struct += `    ${name}: ${type},\n`;
            }
        }

        struct += `}\n\n`;
        return struct;
    }

    private generateEvent(name: string, metadata: any): string {
        return `event ${name} {
    From: ${metadata.from},
    Type: ${metadata.type},
    Call: ${metadata.call || "SingleSync"},
    Data: {
${this.generateEventData(name)}
    }
}\n\n`;
    }

    private mapTypeToBlinkType(tsType: ts.TypeNode): string {
        const typeText = tsType.getText();

        // TypeScript 到 Blink 类型映射
        const typeMap: Record<string, string> = {
            "string": "string",
            "number": "f64",
            "boolean": "boolean",
            "Buffer": "buffer",
            "Vector3": "vec3",
            "CFrame": "cframe",
            "number[]": "f64[]",
            "string[]": "string[]",
        };

        // 处理泛型和复杂类型
        if (typeText.includes("Array<")) {
            const innerType = typeText.match(/Array<(.+)>/)?.[1];
            return `${this.mapTypeToBlinkType(innerType as any)}[]`;
        }

        if (typeText.includes("Map<")) {
            const match = typeText.match(/Map<(.+),\s*(.+)>/);
            if (match) {
                const keyType = this.mapTypeToBlinkType(match[1] as any);
                const valueType = this.mapTypeToBlinkType(match[2] as any);
                return `map<${keyType}, ${valueType}>`;
            }
        }

        return typeMap[typeText] || typeText;
    }
}
```

### 5. 构建脚本

```typescript
// build/generate-blink.ts
import { TypeScriptToBlinkGenerator } from "./ts-to-blink";
import * as fs from "fs";
import * as path from "path";

async function generateBlinkFromTypes() {
    console.log("🔄 Generating Blink IDL from TypeScript types...");

    // 1. 扫描所有类型文件
    const typesDir = path.join(__dirname, "../src/protocols/types");
    const typeFiles = fs.readdirSync(typesDir)
        .filter(f => f.endsWith(".types.ts"))
        .map(f => path.join(typesDir, f));

    // 2. 生成 Blink IDL
    const generator = new TypeScriptToBlinkGenerator(typeFiles);
    const protocols = generator.generateBlink();

    // 3. 写入 .blink 文件
    for (const [namespace, content] of protocols) {
        const outputPath = path.join(
            __dirname,
            `../protocols/${namespace.toLowerCase()}/${namespace.toLowerCase()}.blink`
        );

        // 创建目录
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        // 写入文件
        fs.writeFileSync(outputPath, content);
        console.log(`✅ Generated ${outputPath}`);
    }

    // 4. 更新 manifest.json
    updateManifest(Array.from(protocols.keys()));

    console.log("✨ Blink generation complete!");
}

function updateManifest(namespaces: string[]) {
    const manifestPath = path.join(__dirname, "../protocols/manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    // 添加新协议到 manifest
    for (const namespace of namespaces) {
        if (!manifest.protocols.find((p: any) => p.namespace === namespace)) {
            manifest.protocols.push({
                name: namespace.toLowerCase(),
                namespace: namespace,
                path: `${namespace.toLowerCase()}/${namespace.toLowerCase()}.blink`,
                description: `Auto-generated from ${namespace} TypeScript types`
            });
        }
    }

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

// 执行生成
generateBlinkFromTypes().catch(console.error);
```

### 6. 环境切换

```typescript
// src/roblox_blink_network/network-factory.ts
import { RemoNetworkManager } from "./remo-network";
import { ProtocolManager } from "./protocol-manager";

export class NetworkFactory {
    static create(): INetworkManager {
        const isDevelopment = RunService.IsStudio() || _G.USE_DEV_NETWORK;

        if (isDevelopment) {
            // 开发环境：使用 @rbxts/remo
            return new RemoNetworkManager();
        } else {
            // 生产环境：使用 Blink
            return new ProtocolManager();
        }
    }
}

// 统一接口
export interface INetworkManager {
    send<T>(eventPath: string, data: T, target?: Player): void;
    on<T>(eventPath: string, handler: (data: T, sender?: Player) => void): void;
    broadcast<T>(eventPath: string, data: T): void;
}
```

### 7. 从 Remo 定义生成 Blink IDL

```typescript
// build/remo-to-blink.ts
// 从 remo 定义生成 Blink IDL
import * as ts from "typescript";
import * as fs from "fs";

export class RemoToBlinkGenerator {
    generateFromRemo(remoFilePath: string): string {
        const source = fs.readFileSync(remoFilePath, "utf8");

        // 解析 remo 定义
        const remotes = this.parseRemoDefinitions(source);

        // 生成 Blink IDL
        let blink = "";

        for (const [namespace, events] of remotes) {
            blink += `namespace ${this.capitalize(namespace)}\n\n`;

            for (const event of events) {
                blink += this.generateBlinkEvent(event);
            }
        }

        return blink;
    }

    private generateBlinkEvent(event: any): string {
        return `event ${event.name} {
    From: ${event.from},
    Type: ${event.reliable ? "Reliable" : "Unreliable"},
    Call: SingleSync,
    Data: ${this.generateDataType(event.data)}
}\n\n`;
    }

    private parseRemoDefinitions(source: string): Map<string, any[]> {
        // 解析 createRemotes 调用
        // 提取 namespace 和 remote 定义
        // ... 实现细节
        return new Map();
    }
}
```

### 8. package.json 脚本

```json
{
  "scripts": {
    // 开发模式（使用 @rbxts/remo）
    "dev": "rbxtsc -w",

    // 生产构建流程
    "build:types": "tsc --declaration --emitDeclarationOnly",
    "build:blink": "ts-node build/generate-blink.ts",
    "build:compile": "ts-node build/compile-protocols.ts",
    "build:prod": "npm run build:types && npm run build:blink && npm run build:compile && rbxtsc",

    // 调试工具
    "debug:network": "ts-node scripts/enable-remo-debug.ts",

    // 切换模式
    "use:dev": "echo 'export const NETWORK_MODE = \"development\"' > src/config/network.ts",
    "use:prod": "echo 'export const NETWORK_MODE = \"production\"' > src/config/network.ts"
  },
  "dependencies": {
    "@rbxts/remo": "^1.0.0",
    "@rbxts/services": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.0.0"
  }
}
```

### 9. 使用示例（开发与生产统一）

```typescript
// src/plugins/replicon.ts
import { NetworkFactory } from "../roblox_blink_network";
import { RepliconProtocol } from "../protocols/types/replicon.types";

export class RepliconPlugin extends Plugin {
    private network: INetworkManager;

    build(app: App): void {
        // 自动选择网络实现
        this.network = NetworkFactory.create();

        // API 完全一样，不管是 JSON 还是 Blink
        this.network.on<RepliconProtocol.EntitySpawn>(
            "Replicon.EntitySpawn",
            (data) => {
                this.handleEntitySpawn(app.world, data);
            }
        );

        // 发送也一样
        this.network.send<RepliconProtocol.ComponentUpdate>(
            "Replicon.ComponentUpdate",
            {
                entityId: 123,
                componentId: "Transform",
                data: buffer.create(64)
            }
        );
    }
}
```

## 工作流程

### 开发阶段

1. **编写 TypeScript 类型** - 定义协议接口
2. **定义 Remo 远程事件** - 使用 @rbxts/remo API
3. **类型安全** - 完整的 TypeScript 类型检查
4. **实时调试** - Remo 内置调试工具

```bash
npm run dev  # 开发模式，使用 @rbxts/remo
npm run debug:network  # 启用 Remo 调试模式
```

### 发布构建

1. **生成 Blink IDL** - 从 TypeScript 类型/Remo 定义自动生成
2. **编译 Blink** - 生成高性能网络代码
3. **切换实现** - 自动使用 Blink

```bash
npm run build:prod  # 生产构建，生成并使用 Blink
```

## 优势

1. **开发体验优秀**
   - **@rbxts/remo 提供**：
     - 完整的 TypeScript 类型安全
     - 内置调试工具和网络监控
     - 自动序列化复杂数据类型
     - 零配置，开箱即用
   - 不需要手写 Blink IDL

2. **生产性能高**
   - 自动生成 Blink IDL
   - Buffer 序列化，极致性能
   - 带宽优化

3. **维护成本低**
   - 单一数据源（TypeScript 类型）
   - 自动同步
   - 避免手动维护两套定义

## Remo vs Blink 对比

| 特性 | @rbxts/remo (开发) | Blink (生产) |
|-----|-------------------|-------------|
| 类型安全 | ✅ TypeScript 原生 | ✅ IDL 生成 |
| 序列化 | 自动，支持复杂类型 | Buffer，高性能 |
| 调试 | 内置调试工具 | 需要自定义 |
| 带宽 | 标准 | 优化 1000x |
| 配置 | 零配置 | 需要编译 |
| 性能 | 良好 | 极致 |

## 类型映射表

| TypeScript | Blink | 说明 |
|-----------|-------|------|
| number | f64 | 默认浮点数 |
| number (整数) | u32/i32 | 需要装饰器指定 |
| string | string | 字符串 |
| boolean | boolean | 布尔值 |
| Buffer | buffer | 二进制数据 |
| Vector3 | vec3 | 向量 |
| CFrame | cframe | 坐标系 |
| T[] | T[] | 数组 |
| Map<K,V> | map<K,V> | 映射 |
| T? | T? | 可选类型 |

## 注意事项

1. **类型限制** - 不是所有 TypeScript 类型都能映射到 Blink
2. **装饰器依赖** - 需要 reflect-metadata
3. **构建时间** - 生产构建会增加生成步骤
4. **版本同步** - 修改类型后需要重新生成

## 扩展方案

### 自定义类型映射

```typescript
// 注册自定义类型映射
TypeMapper.register("Color3", "vec3");
TypeMapper.register("UDim2", "vec2");
```

### 验证生成的 IDL

```typescript
// 生成后验证
const validator = new BlinkValidator();
validator.validate(generatedBlink);
```

### 增量生成

```typescript
// 只重新生成修改的协议
const changed = detectChangedTypes();
generateBlinkForTypes(changed);
```

## 总结

这个方案实现了：
1. ✅ 开发时使用 @rbxts/remo（类型安全、易调试）
2. ✅ 生产时使用 Blink（高性能、带宽优化）
3. ✅ TypeScript 类型为单一数据源
4. ✅ 自动生成，无需手写 IDL
5. ✅ 统一的 API 接口

**开发流程**：
```
TypeScript 类型 → Remo 定义 → 开发调试 → 自动生成 Blink → 生产部署
```

开发者获得：
- **开发时**：Remo 的所有便利（类型安全、调试工具、自动序列化）
- **生产时**：Blink 的极致性能（Buffer 序列化、带宽优化）
- **全程**：只需维护 TypeScript 定义，无需关心底层实现

---

**文档版本**: 1.0.0
**创建日期**: 2025-01-24
**作者**: Claude Code Assistant
**状态**: 设计方案