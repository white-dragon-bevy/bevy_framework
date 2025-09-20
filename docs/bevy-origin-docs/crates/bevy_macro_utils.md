# Bevy Macro Utils - 宏工具库详细文档

## 模块概述和主要功能

`bevy_macro_utils` 是 Bevy 引擎的宏工具库，为 Bevy 生态系统中的宏开发提供了一系列实用的辅助类型和函数。该库专门用于简化过程宏（procedural macros）的开发，提供了代码解析、错误处理、符号管理等核心功能。

### 主要特性

- **代码解析工具** - 提供解析 Rust 语法树节点的工具函数
- **错误处理** - 统一的错误收集和处理机制
- **符号管理** - 安全的符号表示和比较
- **清洁代码生成** - 防止标识符冲突和生成卫生宏
- **Bevy 清单管理** - 处理 Cargo.toml 文件和依赖解析
- **完全限定名称** - 提供标准库类型的完全限定名称

### 版本信息

- **版本**: 0.17.0-dev
- **Edition**: Rust 2024
- **安全性**: 禁用 unsafe 代码

## 核心模块和结构体

### 1. BevyManifest - Bevy 清单管理

```rust
pub struct BevyManifest {
    manifest: Document<Box<str>>,
    modified_time: SystemTime,
}
```

**功能说明**：
- 管理 Cargo.toml 文件的读取和解析
- 提供全局共享实例以优化性能
- 支持依赖路径解析和包查找
- 自动缓存并检测文件变更

**核心方法**：

#### `shared()` - 获取全局共享实例
```rust
pub fn shared() -> MappedRwLockReadGuard<'static, BevyManifest>
```
返回全局缓存的 BevyManifest 实例，自动处理文件变更检测。

#### `get_path(name: &str)` - 获取包路径
```rust
pub fn get_path(&self, name: &str) -> syn::Path
```
根据包名返回对应的语法树路径，支持 Bevy 子模块的自动路径生成。

#### `maybe_get_path(name: &str)` - 尝试获取包路径
```rust
pub fn maybe_get_path(&self, name: &str) -> Option<syn::Path>
```
安全版本的路径获取，失败时返回 None 而不是 panic。

### 2. ResultSifter - 结果筛选器

```rust
pub struct ResultSifter<T> {
    items: Vec<T>,
    errors: Option<syn::Error>,
}
```

**功能说明**：
- 处理 `Result<T, syn::Error>` 的迭代器
- 自动合并多个错误为单一错误
- 收集所有成功的结果

**使用示例**：
```rust
use bevy_macro_utils::ResultSifter;

let results: Vec<Result<String, syn::Error>> = vec![
    Ok("success1".to_string()),
    Err(syn::Error::new(proc_macro2::Span::call_site(), "error1")),
    Ok("success2".to_string()),
    Err(syn::Error::new(proc_macro2::Span::call_site(), "error2")),
];

let final_result = results
    .into_iter()
    .fold(ResultSifter::default(), ResultSifter::fold)
    .finish();

match final_result {
    Ok(items) => println!("成功项: {:?}", items),
    Err(combined_error) => println!("合并的错误: {}", combined_error),
}
```

### 3. Symbol - 符号表示

```rust
pub struct Symbol(pub &'static str);
```

**功能说明**：
- 表示单一命名值的轻量级结构
- 支持与 `syn::Ident` 和 `syn::Path` 的直接比较
- 提供类型安全的符号比较

**使用示例**：
```rust
use bevy_macro_utils::Symbol;
use syn::Ident;

const MY_SYMBOL: Symbol = Symbol("derive");

let ident = Ident::new("derive", proc_macro2::Span::call_site());
if ident == MY_SYMBOL {
    println!("符号匹配！");
}
```

### 4. 完全限定名称 (FQ Types)

该模块提供标准库类型的完全限定名称，用于生成卫生宏：

```rust
pub struct FQAny;      // ::core::any::Any
pub struct FQBox;      // ::std::boxed::Box
pub struct FQClone;    // ::core::clone::Clone
pub struct FQDefault;  // ::core::default::Default
pub struct FQOption;   // ::core::option::Option
pub struct FQResult;   // ::core::result::Result
pub struct FQSend;     // ::core::marker::Send
pub struct FQSync;     // ::core::marker::Sync
```

**使用示例**：
```rust
use bevy_macro_utils::fq_std::{FQOption, FQResult};
use quote::quote;

let tokens = quote! {
    fn process_data() -> #FQResult<#FQOption<i32>, String> {
        #FQResult::Ok(#FQOption::Some(42))
    }
};
```

## 主要API使用示例

### 1. 属性解析工具

```rust
use bevy_macro_utils::{get_lit_str, get_lit_bool, Symbol};
use syn::{Expr, parse_quote};

// 解析字符串字面量
let attr_name = Symbol("path");
let expr: Expr = parse_quote!("my_path");
let lit_str = get_lit_str(attr_name, &expr)?;
println!("路径: {}", lit_str.value());

// 解析布尔字面量
let bool_attr = Symbol("enabled");
let bool_expr: Expr = parse_quote!(true);
let bool_val = get_lit_bool(bool_attr, &bool_expr)?;
println!("启用状态: {}", bool_val);
```

### 2. 结构体字段获取

```rust
use bevy_macro_utils::get_struct_fields;
use syn::{DeriveInput, parse_quote};

let input: DeriveInput = parse_quote! {
    struct MyStruct {
        field1: i32,
        field2: String,
    }
};

let fields = get_struct_fields(&input.data, "MyMacro")?;
for field in fields {
    if let Some(ident) = &field.ident {
        println!("字段名: {}", ident);
    }
}
```

### 3. 标签派生宏

```rust
use bevy_macro_utils::derive_label;
use syn::{parse_quote, Path};

let input: syn::DeriveInput = parse_quote! {
    struct MyLabel;
};

let trait_path: Path = parse_quote!(crate::MyLabelTrait);
let tokens = derive_label(input, "MyLabelTrait", &trait_path);
```

### 4. 标识符冲突避免

```rust
use bevy_macro_utils::ensure_no_collision;
use syn::Ident;
use proc_macro::TokenStream;

let original = Ident::new("temp", proc_macro2::Span::call_site());
let haystack: TokenStream = "let temp = 5; let tempX = 10;".parse().unwrap();
let safe_ident = ensure_no_collision(original, haystack);
println!("安全标识符: {}", safe_ident); // 可能输出 "tempXX"
```

### 5. 终止解析器

```rust
use bevy_macro_utils::terminated_parser;
use syn::{parse::ParseStream, token::Comma, Ident, Result};

let parser = terminated_parser(
    Comma,
    |stream: ParseStream| -> Result<Ident> {
        stream.parse()
    }
);

// 可用于解析逗号分隔的标识符列表
```

## 与其他 Bevy 模块的集成方式

### 1. 与派生宏的集成

`bevy_macro_utils` 广泛用于 Bevy 的各种派生宏中：

```rust
// 在 bevy_ecs 的 Component 派生宏中使用
use bevy_macro_utils::{BevyManifest, derive_label};

#[proc_macro_derive(Component)]
pub fn derive_component(input: TokenStream) -> TokenStream {
    let manifest = BevyManifest::shared();
    let bevy_ecs_path = manifest.get_path("bevy_ecs");
    // ... 使用路径生成代码
}
```

### 2. 与错误处理的集成

```rust
use bevy_macro_utils::ResultSifter;

fn process_multiple_fields(fields: &[Field]) -> Result<Vec<TokenStream>, syn::Error> {
    fields
        .iter()
        .map(|field| process_single_field(field))
        .fold(ResultSifter::default(), ResultSifter::fold)
        .finish()
}
```

### 3. 与代码生成的集成

```rust
use bevy_macro_utils::fq_std::*;
use quote::quote;

fn generate_component_impl(name: &Ident) -> TokenStream {
    quote! {
        impl #FQDefault for #name {
            fn default() -> Self {
                Self::new()
            }
        }

        unsafe impl #FQSend for #name {}
        unsafe impl #FQSync for #name {}
    }
}
```

## 常见使用场景

### 1. 过程宏开发

当开发 Bevy 相关的过程宏时，该库提供了完整的工具链：

```rust
use bevy_macro_utils::*;
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

#[proc_macro_derive(MyTrait)]
pub fn derive_my_trait(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let manifest = BevyManifest::shared();

    // 获取字段
    let fields = match get_struct_fields(&input.data, "MyTrait") {
        Ok(fields) => fields,
        Err(err) => return err.to_compile_error().into(),
    };

    // 处理字段并收集错误
    let field_impls = fields
        .iter()
        .map(|field| process_field(field))
        .fold(ResultSifter::default(), ResultSifter::fold);

    let field_impls = match field_impls.finish() {
        Ok(impls) => impls,
        Err(err) => return err.to_compile_error().into(),
    };

    // 生成最终代码
    let name = &input.ident;
    quote! {
        impl MyTrait for #name {
            #(#field_impls)*
        }
    }.into()
}
```

### 2. 属性解析

解析宏属性时的典型用法：

```rust
use bevy_macro_utils::{get_lit_str, Symbol};
use syn::{Attribute, Meta, MetaNameValue};

fn parse_path_attribute(attr: &Attribute) -> syn::Result<String> {
    if let Meta::NameValue(MetaNameValue { value, .. }) = &attr.meta {
        let path_symbol = Symbol("path");
        let lit_str = get_lit_str(path_symbol, value)?;
        Ok(lit_str.value())
    } else {
        Err(syn::Error::new_spanned(attr, "期望 path = \"...\" 格式"))
    }
}
```

### 3. 依赖管理

处理 Bevy 依赖路径时：

```rust
use bevy_macro_utils::BevyManifest;

fn get_bevy_component_path() -> syn::Path {
    let manifest = BevyManifest::shared();

    // 尝试获取 bevy_ecs 路径
    if let Some(path) = manifest.maybe_get_path("bevy_ecs") {
        let mut component_path = path;
        component_path.segments.push(syn::parse_quote!(component));
        component_path.segments.push(syn::parse_quote!(Component));
        component_path
    } else {
        // 回退到默认路径
        syn::parse_quote!(::bevy_ecs::component::Component)
    }
}
```

### 4. 错误处理模式

在复杂的宏中处理多个可能的错误：

```rust
use bevy_macro_utils::ResultSifter;

fn validate_struct(input: &DeriveInput) -> Result<(), syn::Error> {
    let mut sifter = ResultSifter::default();

    // 验证结构体名称
    sifter.sift(validate_name(&input.ident));

    // 验证泛型参数
    sifter.sift(validate_generics(&input.generics));

    // 验证字段
    if let Ok(fields) = get_struct_fields(&input.data, "MyMacro") {
        for field in fields {
            sifter.sift(validate_field(field));
        }
    }

    // 返回所有验证结果
    sifter.finish().map(|_| ())
}
```

### 5. 卫生宏生成

使用完全限定名称避免名称冲突：

```rust
use bevy_macro_utils::fq_std::*;
use quote::quote;

fn generate_safe_impl(name: &Ident) -> TokenStream {
    quote! {
        impl #name {
            pub fn new() -> #FQOption<Self> {
                #FQOption::Some(Self {
                    data: #FQDefault::default(),
                })
            }

            pub fn clone_boxed(&self) -> #FQBox<dyn #FQAny + #FQSend + #FQSync> {
                #FQBox::new(#FQClone::clone(self))
            }
        }
    }
}
```

## 最佳实践

### 1. 错误处理
- 使用 `ResultSifter` 收集和合并多个错误
- 优先使用 `maybe_*` 方法避免 panic
- 为用户提供清晰的错误消息

### 2. 性能优化
- 使用 `BevyManifest::shared()` 避免重复解析
- 缓存经常使用的路径和符号

### 3. 代码安全
- 使用 `fq_std` 模块中的类型避免名称冲突
- 使用 `ensure_no_collision` 生成安全的标识符
- 避免直接使用标准库类型名称

### 4. 可维护性
- 使用 `Symbol` 类型进行符号比较
- 将复杂的解析逻辑分解为小函数
- 提供详细的错误消息帮助调试

## 总结

`bevy_macro_utils` 是 Bevy 生态系统中不可或缺的基础库，为宏开发提供了完整的工具集。通过使用这个库，开发者可以：

1. **简化宏开发** - 提供常用的解析和生成工具
2. **提高代码质量** - 统一的错误处理和安全机制
3. **增强兼容性** - 自动处理依赖路径和版本管理
4. **减少样板代码** - 复用常见的宏模式

该库的设计遵循 Rust 的最佳实践，确保生成的宏既安全又高效，是开发 Bevy 插件和扩展的重要工具。