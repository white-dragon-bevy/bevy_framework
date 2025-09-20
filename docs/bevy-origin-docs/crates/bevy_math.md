# bevy_math 数学模块文档

## 概述

`bevy_math` 是 Bevy 游戏引擎的核心数学库，提供了游戏开发中必需的数学类型和功能。该模块构建在 `glam` 数学库之上，并提供了额外的游戏开发专用功能。

### 主要特性

- **向量数学**: 2D/3D/4D 向量操作
- **矩阵运算**: 旋转、缩放、变换矩阵
- **几何图元**: 基本几何形状和碰撞检测
- **曲线系统**: 样条曲线、贝塞尔曲线和缓动函数
- **边界体系统**: 包围盒和碰撞检测
- **射线系统**: 射线投射和相交测试

## 依赖关系

该模块主要依赖以下 crate：
- `glam`: 底层数学运算库
- `thiserror`: 错误处理
- `derive_more`: 派生宏支持
- `itertools`: 迭代器工具
- `bevy_reflect`: 反射系统（可选）

## 核心类型

### 向量类型

#### Vec2, Vec3, Vec3A, Vec4
基于 `glam` 的向量类型，提供高性能的向量数学运算。

```rust
use bevy_math::prelude::*;

// 创建向量
let v2 = Vec2::new(1.0, 2.0);
let v3 = Vec3::new(1.0, 2.0, 3.0);
let v4 = Vec4::new(1.0, 2.0, 3.0, 4.0);

// 向量运算
let sum = v3 + Vec3::ONE;
let cross = v3.cross(Vec3::Y);
let dot = v3.dot(Vec3::X);
let length = v3.length();
```

#### IVec2, IVec3, IVec4
整数向量类型，用于像素坐标、网格索引等场景。

```rust
let pixel_pos = IVec2::new(100, 200);
let grid_coord = IVec3::new(5, 0, -2);
```

#### UVec2, UVec3, UVec4
无符号整数向量类型，用于大小、索引等非负数值。

```rust
let texture_size = UVec2::new(1024, 768);
let array_index = UVec3::new(0, 1, 2);
```

#### BVec2, BVec3, BVec3A, BVec4, BVec4A
布尔向量类型，用于掩码和条件操作。

```rust
let mask = BVec3::new(true, false, true);
let filtered = v3.select(Vec3::ZERO, mask);
```

### 矩阵类型

#### Mat2, Mat3, Mat3A, Mat4
变换矩阵类型，用于旋转、缩放、平移等变换操作。

```rust
use bevy_math::prelude::*;

// 创建变换矩阵
let rotation = Mat3::from_rotation_z(std::f32::consts::PI / 4.0);
let scale = Mat3::from_scale(Vec2::new(2.0, 3.0));
let translation = Mat4::from_translation(Vec3::new(10.0, 20.0, 30.0));

// 组合变换
let transform = translation * Mat4::from_mat3(rotation * scale);
```

### 旋转类型

#### Quat
四元数，用于3D旋转，避免万向节锁问题。

```rust
use bevy_math::prelude::*;

// 创建旋转
let rotation = Quat::from_rotation_y(std::f32::consts::PI / 2.0);
let from_euler = Quat::from_euler(EulerRot::XYZ, 0.1, 0.2, 0.3);

// 旋转向量
let rotated = rotation * Vec3::X;

// 插值
let slerped = rotation.slerp(Quat::IDENTITY, 0.5);
```

#### Rot2
2D旋转类型，基于复数表示。

```rust
use bevy_math::prelude::*;

// 创建2D旋转
let rotation = Rot2::degrees(45.0);
let from_radians = Rot2::radians(std::f32::consts::PI / 4.0);

// 旋转向量
let rotated = rotation * Vec2::X;

// 组合旋转
let combined = rotation * Rot2::degrees(30.0);
```

### 方向类型

#### Dir2, Dir3, Dir3A, Dir4
标准化的方向向量，保证长度为1。

```rust
use bevy_math::prelude::*;

// 创建方向
let direction = Dir3::new(Vec3::new(1.0, 1.0, 0.0)).unwrap();
let from_components = Dir2::from_xy(0.6, 0.8).unwrap();

// 预定义方向
let up = Dir3::Y;
let forward = Dir3::NEG_Z;

// 球面插值
let interpolated = Dir3::X.slerp(Dir3::Y, 0.5);
```

### 等距变换

#### Isometry2d, Isometry3d
表示平移和旋转的组合变换，不包含缩放。

```rust
use bevy_math::prelude::*;

let iso2d = Isometry2d::new(Vec2::new(10.0, 20.0), Rot2::degrees(45.0));
let iso3d = Isometry3d::new(Vec3::new(1.0, 2.0, 3.0), Quat::from_rotation_y(0.5));

// 变换点
let transformed_point = iso3d * Vec3::ZERO;
```

### 矩形类型

#### Rect, IRect, URect
不同数值类型的矩形表示。

```rust
use bevy_math::prelude::*;

// 浮点矩形
let rect = Rect::new(0.0, 0.0, 100.0, 50.0);
let from_corners = Rect::from_corners(Vec2::ZERO, Vec2::new(100.0, 50.0));

// 整数矩形
let irect = IRect::new(10, 20, 50, 30);

// 无符号整数矩形
let urect = URect::new(0, 0, 1920, 1080);

// 矩形操作
let contains_point = rect.contains(Vec2::new(50.0, 25.0));
let intersects = rect.intersect(Rect::new(80.0, 40.0, 120.0, 60.0));
```

### 射线类型

#### Ray2d, Ray3d
射线表示，用于射线投射和相交测试。

```rust
use bevy_math::prelude::*;

// 创建射线
let ray2d = Ray2d::new(Vec2::ZERO, Dir2::X);
let ray3d = Ray3d::new(Vec3::new(0.0, 5.0, 0.0), Dir3::NEG_Y);

// 获取射线上的点
let point_on_ray = ray3d.get_point(10.0);

// 平面相交测试
let plane = InfinitePlane3d::new(Dir3::Y);
if let Some(distance) = ray3d.intersect_plane(Vec3::ZERO, plane) {
    let intersection_point = ray3d.get_point(distance);
}
```

### 纵横比

#### AspectRatio
屏幕或视口的宽高比表示。

```rust
use bevy_math::prelude::*;

// 创建纵横比
let aspect = AspectRatio::try_new(1920.0, 1080.0).unwrap();
let wide_screen = AspectRatio::SIXTEEN_NINE;
let traditional = AspectRatio::FOUR_THREE;

// 查询属性
let is_landscape = aspect.is_landscape();
let ratio_value = aspect.ratio();
```

## 几何图元 (Primitives)

### 2D 图元

```rust
use bevy_math::primitives::*;

// 基本形状
let circle = Circle::new(5.0);
let ellipse = Ellipse::new(3.0, 4.0);
let rectangle = Rectangle::new(10.0, 8.0);
let triangle = Triangle2d::new(
    Vec2::new(0.0, 1.0),
    Vec2::new(-1.0, -1.0),
    Vec2::new(1.0, -1.0)
);

// 测量
let area = circle.area();
let perimeter = rectangle.perimeter();
```

### 3D 图元

```rust
use bevy_math::primitives::*;

// 基本体积
let sphere = Sphere::new(2.0);
let cube = Cuboid::new(2.0, 2.0, 2.0);
let cylinder = Cylinder::new(1.0, 3.0);
let cone = Cone::new(1.5, 2.0);

// 测量
let volume = sphere.volume();
let surface_area = cube.area();
```

## 边界体系统 (Bounding)

### 轴对齐包围盒

#### Aabb2d, Aabb3d
轴对齐包围盒，用于快速碰撞检测。

```rust
use bevy_math::bounding::*;

// 创建包围盒
let aabb2d = Aabb2d::new(Vec2::new(0.0, 0.0), Vec2::new(5.0, 3.0));
let aabb3d = Aabb3d::new(Vec3::ZERO, Vec3::new(2.0, 3.0, 4.0));

// 操作
let contains = aabb3d.contains(&other_aabb);
let merged = aabb3d.merge(&other_aabb);
let grown = aabb3d.grow(Vec3::splat(1.0));
```

### 包围球

#### BoundingSphere
球形包围体。

```rust
use bevy_math::bounding::*;

let sphere = BoundingSphere::new(Vec3::new(1.0, 2.0, 3.0), 5.0);
let visible_area = sphere.visible_area();
```

### 射线投射

```rust
use bevy_math::bounding::*;

let ray = Ray3d::new(Vec3::ZERO, Dir3::X);
let aabb = Aabb3d::new(Vec3::new(5.0, -1.0, -1.0), Vec3::new(1.0, 1.0, 1.0));

if ray.intersects(&aabb) {
    println!("射线与包围盒相交！");
}
```

## 曲线系统 (Curves)

### 基础曲线接口

`Curve<T>` trait 定义了参数化曲线的标准接口：

```rust
use bevy_math::curve::*;

// 函数曲线
let sine_curve = FunctionCurve::new(
    Interval::EVERYWHERE,
    |t| f32::sin(t)
);

// 采样曲线
let value_at_pi = sine_curve.sample(std::f32::consts::PI);
let clamped_value = sine_curve.sample_clamped(10.0);
```

### 曲线变换

```rust
use bevy_math::curve::*;

// 映射输出
let squared_curve = sine_curve.map(|x| x * x);

// 重新参数化
let stretched = sine_curve.reparametrize_linear(interval(0.0, 10.0).unwrap()).unwrap();

// 链接曲线
let combined = curve1.chain(curve2).unwrap();

// 组合曲线
let position_and_rotation = position_curve.zip(rotation_curve).unwrap();
```

### 重采样

```rust
use bevy_math::curve::*;

// 均匀重采样
let resampled = curve.resample_auto(100).unwrap();

// 不均匀重采样
let sample_times = [0.0, 0.1, 0.5, 0.8, 1.0];
let uneven_resampled = curve.resample_uneven_auto(sample_times).unwrap();
```

## 三次样条 (Cubic Splines)

### 贝塞尔曲线

```rust
use bevy_math::cubic_splines::*;

// 创建贝塞尔曲线
let control_points = [[
    Vec2::new(0.0, 0.0),
    Vec2::new(1.0, 2.0),
    Vec2::new(2.0, -1.0),
    Vec2::new(3.0, 1.0),
]];

let bezier = CubicBezier::new(control_points).to_curve().unwrap();

// 采样位置
let positions: Vec<_> = bezier.iter_positions(50).collect();
```

### 缓动曲线

```rust
use bevy_math::cubic_splines::*;

// 创建贝塞尔缓动曲线
let easing = CubicSegment::new_bezier_easing(
    Vec2::new(0.25, 0.1),  // 控制点1
    Vec2::new(0.75, 0.9)   // 控制点2
);

// 缓动值
let eased_value = easing.ease(0.5); // 在t=0.5处的缓动值
```

### Hermite 样条

```rust
use bevy_math::cubic_splines::*;

let points = [Vec2::ZERO, Vec2::X, Vec2::Y, Vec2::ONE];
let tangents = [Vec2::X, Vec2::Y, Vec2::NEG_X, Vec2::NEG_Y];

let hermite = CubicHermite::new(points, tangents).to_curve().unwrap();
```

### Cardinal/Catmull-Rom 样条

```rust
use bevy_math::cubic_splines::*;

let points = [
    Vec2::new(-1.0, 0.0),
    Vec2::new(0.0, 1.0),
    Vec2::new(1.0, 0.0),
    Vec2::new(2.0, -1.0),
];

// Cardinal样条
let cardinal = CubicCardinalSpline::new(0.5, points).to_curve().unwrap();

// Catmull-Rom样条（Cardinal的特殊情况，tension=0.5）
let catmull_rom = CubicCardinalSpline::new_catmull_rom(points).to_curve().unwrap();
```

### B样条

```rust
use bevy_math::cubic_splines::*;

let b_spline = CubicBSpline::new(points).to_curve().unwrap();

// 循环B样条
let cyclic_b_spline = CubicBSpline::new(points).to_curve_cyclic().unwrap();
```

### NURBS (非均匀有理B样条)

```rust
use bevy_math::cubic_splines::*;

let points = [
    Vec2::new(0.0, 0.0),
    Vec2::new(1.0, 1.0),
    Vec2::new(2.0, 0.0),
    Vec2::new(3.0, 1.0),
];
let weights = [1.0, 2.0, 1.0, 1.0]; // 权重
let knots = [0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0]; // 节点向量

let nurbs = CubicNurbs::new(points, Some(weights), Some(knots))
    .unwrap()
    .to_curve()
    .unwrap();
```

## 缓动函数 (Easing)

```rust
use bevy_math::curve::*;

// 基本缓动
let ease_in_out = EasingCurve::new(0.0, 100.0, EaseFunction::QuadraticInOut);
let eased_value = ease_in_out.sample(0.5).unwrap();

// 步进函数
let steps = EasingCurve::new(0.0, 1.0, EaseFunction::Steps(4, JumpAt::End));

// 弹性缓动
let elastic = EasingCurve::new(0.0, 1.0, EaseFunction::ElasticOut);
```

## 实用函数和 trait

### 公共 trait

#### VectorSpace
为向量空间类型定义基本操作。

#### StableInterpolate
提供稳定的插值操作。

```rust
use bevy_math::*;

// 线性插值
let interpolated = Vec3::ZERO.lerp(Vec3::ONE, 0.5);

// 四元数球面插值
let rotation_lerp = Quat::IDENTITY.slerp(target_rotation, 0.3);
```

### 数学操作

```rust
use bevy_math::ops;

// 基本数学函数
let sine = ops::sin(1.0);
let cosine = ops::cos(1.0);
let (sin_val, cos_val) = ops::sin_cos(1.0);

// 更多数学操作
let sqrt_val = ops::sqrt(16.0);
let abs_val = ops::abs(-5.0);
let floor_val = ops::floor(3.7);
```

## 与其他 Bevy 模块的集成

### bevy_transform
`bevy_math` 为 `bevy_transform` 提供基础数学类型：

```rust
use bevy_math::prelude::*;

// Transform组件使用的类型
let translation = Vec3::new(1.0, 2.0, 3.0);
let rotation = Quat::from_rotation_y(0.5);
let scale = Vec3::splat(2.0);
```

### bevy_render
渲染系统中的数学计算：

```rust
// 投影矩阵
let projection = Mat4::perspective_rh(
    60.0_f32.to_radians(), // fov
    16.0 / 9.0,           // aspect ratio
    0.1,                  // near
    1000.0                // far
);

// 视图矩阵
let view = Mat4::look_at_rh(
    Vec3::new(0.0, 5.0, 10.0), // eye
    Vec3::ZERO,                // center
    Vec3::Y                    // up
);
```

### bevy_physics
物理系统中的碰撞检测和运动计算。

## 常见使用场景

### 1. 对象变换

```rust
use bevy_math::prelude::*;

// 组合变换
fn transform_object(position: Vec3, rotation: Quat, scale: Vec3) -> Mat4 {
    Mat4::from_scale_rotation_translation(scale, rotation, position)
}

// 应用变换到点
let transform = transform_object(
    Vec3::new(10.0, 0.0, 0.0),
    Quat::from_rotation_y(std::f32::consts::PI / 4.0),
    Vec3::splat(2.0)
);

let transformed_point = transform.transform_point3(Vec3::ZERO);
```

### 2. 动画插值

```rust
use bevy_math::prelude::*;

// 位置插值
fn animate_position(start: Vec3, end: Vec3, t: f32) -> Vec3 {
    start.lerp(end, t)
}

// 旋转插值
fn animate_rotation(start: Quat, end: Quat, t: f32) -> Quat {
    start.slerp(end, t)
}

// 缓动动画
let easing_curve = EasingCurve::new(0.0, 1.0, EaseFunction::QuadraticInOut);
let eased_t = easing_curve.sample(t).unwrap();
let smooth_position = animate_position(start_pos, end_pos, eased_t);
```

### 3. 相机控制

```rust
use bevy_math::prelude::*;

// 环绕相机
fn orbit_camera(center: Vec3, radius: f32, angle: f32, height: f32) -> (Vec3, Quat) {
    let position = center + Vec3::new(
        radius * ops::cos(angle),
        height,
        radius * ops::sin(angle)
    );

    let look_direction = (center - position).normalize();
    let rotation = Quat::from_rotation_arc(Vec3::NEG_Z, look_direction);

    (position, rotation)
}
```

### 4. 碰撞检测

```rust
use bevy_math::{prelude::*, bounding::*};

// 点与球体碰撞
fn point_in_sphere(point: Vec3, sphere_center: Vec3, radius: f32) -> bool {
    point.distance_squared(sphere_center) <= radius * radius
}

// AABB 碰撞检测
fn aabb_collision(aabb1: &Aabb3d, aabb2: &Aabb3d) -> bool {
    aabb1.intersects(aabb2)
}

// 射线与平面相交
fn ray_plane_intersection(ray: &Ray3d, plane_point: Vec3, plane_normal: Dir3) -> Option<f32> {
    let plane = InfinitePlane3d::new(plane_normal);
    ray.intersect_plane(plane_point, plane)
}
```

### 5. 曲线路径

```rust
use bevy_math::{prelude::*, cubic_splines::*, curve::*};

// 创建路径曲线
fn create_path(waypoints: Vec<Vec3>) -> Result<CubicCurve<Vec3>, InsufficientDataError> {
    CubicCardinalSpline::new_catmull_rom(waypoints).to_curve()
}

// 沿路径移动
fn move_along_path(curve: &CubicCurve<Vec3>, t: f32) -> Vec3 {
    curve.position(t)
}

// 获取路径切线方向
fn get_path_direction(curve: &CubicCurve<Vec3>, t: f32) -> Vec3 {
    curve.velocity(t).normalize()
}
```

### 6. 几何计算

```rust
use bevy_math::{prelude::*, primitives::*};

// 计算三角形面积
fn triangle_area(a: Vec2, b: Vec2, c: Vec2) -> f32 {
    let triangle = Triangle2d::new(a, b, c);
    triangle.area()
}

// 点到线段距离
fn point_to_line_distance(point: Vec2, line_start: Vec2, line_end: Vec2) -> f32 {
    let line_vec = line_end - line_start;
    let point_vec = point - line_start;
    let line_len = line_vec.length();

    if line_len == 0.0 {
        return point_vec.length();
    }

    let t = (point_vec.dot(line_vec) / line_len.powi(2)).clamp(0.0, 1.0);
    let projection = line_start + line_vec * t;
    point.distance(projection)
}
```

## 性能优化建议

### 1. 使用适当的向量类型
- `Vec3A`: 对于需要高性能SIMD运算的3D向量
- `IVec*`: 用于整数坐标和索引
- `UVec*`: 用于非负整数值

### 2. 避免不必要的归一化
```rust
// 好：直接使用Dir3避免重复归一化
let direction = Dir3::X;

// 避免：多次归一化
let direction = some_vector.normalize().normalize();
```

### 3. 使用快速重归一化
```rust
// 对于已经接近归一化的向量
let renormalized = direction.fast_renormalize();
```

### 4. 批量操作
```rust
// 使用SIMD友好的操作
let results: Vec<_> = positions
    .iter()
    .map(|&pos| transform.transform_point3(pos))
    .collect();
```

## 特性标志

- `std`: 启用标准库功能
- `alloc`: 启用堆分配功能
- `serialize`: 启用序列化支持
- `approx`: 启用近似比较
- `mint`: 启用与mint库的互操作
- `rand`: 启用随机采样功能
- `curve`: 启用曲线系统
- `bevy_reflect`: 启用反射系统集成

## 总结

`bevy_math` 为 Bevy 引擎提供了全面的数学基础设施，从基本的向量运算到复杂的曲线系统，涵盖了游戏开发中的所有数学需求。其设计兼顾了性能和易用性，是构建现代游戏引擎的坚实基础。

通过合理使用这些类型和功能，开发者可以：
- 实现流畅的对象变换和动画
- 构建精确的碰撞检测系统
- 创建复杂的路径和曲线动画
- 优化渲染管线的数学计算
- 处理复杂的几何和物理计算

该模块的设计哲学是提供高性能、类型安全且易于使用的数学工具，让开发者能够专注于游戏逻辑而不是底层数学实现。