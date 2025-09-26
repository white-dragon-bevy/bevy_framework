# white-dragon-bevy 和 rust-bevy 的区别

**简写**
- white-dragon-bevy: wb
- rust-bevy: rb

**区别**
- world: wb 采用 matter, 只负责ecs
- system: wb 的系统不能动态注入参数, 固定为 foo(world,context)
- context: wb 的独有概念, 用来替代 system params, 可以访问所有对象.
