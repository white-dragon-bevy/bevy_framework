/**
 * @fileoverview 后端接口模块
 *
 * 提供网络后端的抽象接口
 * 具体的网络传输由独立的后端插件实现
 */

export * from "./channels";
export * from "./client-messages";
export * from "./server-messages";
export * from "./backend-state";