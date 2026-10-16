#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod app;
mod desktop;
mod preferences;
mod platform;
mod window_layout;
#[cfg(windows)] mod keyboard_edges;
mod fixture;
fn main(){if std::env::current_exe().ok().and_then(|p|p.file_name().map(|n|n.to_string_lossy().into_owned())).as_deref()==Some("yangyang-fullscreen-fixture.exe"){fixture::run();return;}app::run();}
mod sound;
mod key_target;
