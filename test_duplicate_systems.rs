use bevy::prelude::*;

fn my_system() {
    println!("System executed!");
}

fn main() {
    App::new()
        .add_plugins(MinimalPlugins)
        .add_systems(Update, my_system)
        .add_systems(Update, my_system)  // 重复注册同一个系统
        .add_systems(Update, my_system)  // 再次注册同一个系统
        .run();
}