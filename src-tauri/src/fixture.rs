use tauri::PhysicalPosition;
#[tauri::command]fn exit_fixture(app:tauri::AppHandle){app.exit(0)}
// Explicit QA filename only. No hooks, preferences writes, tray or startup entry.
pub fn run(){
 let mut context=tauri::generate_context!();context.config_mut().app.windows.clear();
 tauri::Builder::default().invoke_handler(tauri::generate_handler![exit_fixture]).setup(|app|{
  let w=tauri::WebviewWindowBuilder::new(app,"fullscreen-fixture",tauri::WebviewUrl::App("assets/fullscreen-fixture.html".into())).data_directory(std::env::temp_dir().join("yangyang-fullscreen-fixture-webview")).title("秧秧 · 本地全屏验收").inner_size(800.,600.).decorations(false).build()?;
  let saved=crate::desktop::load(app.handle());if let Some(p)=saved.last{if let Some(m)=w.available_monitors()?.iter().find(|m|{let a=m.work_area();p.x>=a.position.x&&p.y>=a.position.y&&p.x<a.position.x+a.size.width as i32&&p.y<a.position.y+a.size.height as i32}){w.set_position(PhysicalPosition::new(m.position().x+50,m.position().y+50))?;}}
  w.set_fullscreen(true)?;w.set_focus()?;Ok(())
 }).run(context).expect("全屏验收窗口启动失败");
}
