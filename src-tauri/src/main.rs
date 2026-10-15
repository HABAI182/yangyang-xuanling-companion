#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#[cfg(windows)] mod keyboard_edges;
mod window_layout;
use serde::{Deserialize, Serialize};
use std::{fs, sync::{Mutex, atomic::{AtomicU64, Ordering}}};
use tauri::{Emitter, Manager, WebviewWindowBuilder, WebviewUrl, LogicalSize, PhysicalPosition};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct Preferences { size: f64, intensity: f64, always_on_top: bool, click_through: bool, show_keys: bool, idle_enabled: bool }
impl Default for Preferences { fn default() -> Self { Self { size: 420.0, intensity: 1.0, always_on_top: true, click_through: false, show_keys: true, idle_enabled: true } } }
struct AppState { prefs: Mutex<Preferences>, settings_gate: Mutex<()>, keyboard_presses: AtomicU64, mouse_presses: AtomicU64, samples: AtomicU64 }

#[derive(Clone, Serialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
struct InputFrame { keys_held: u16, mouse_down: bool, new_press: bool, new_mouse_press: bool, key_label: String, reach: f32, cursor_x: f32, cursor_y: f32 }

fn prefs_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf,String> { app.path().app_data_dir().map(|p|p.join("preferences.json")).map_err(|e|e.to_string()) }
fn apply_preferences(app:&tauri::AppHandle,p:&Preferences)->Result<(),String>{
    if let Some(w)=app.get_webview_window("pet") {
        w.set_always_on_top(p.always_on_top).map_err(|e|e.to_string())?;
        w.set_ignore_cursor_events(p.click_through).map_err(|e|e.to_string())?;
        w.set_size(LogicalSize::new(p.size,p.size*1.025)).map_err(|e|e.to_string())?;
    }
    Ok(())
}
#[tauri::command]
fn read_preferences(state:tauri::State<AppState>)->Preferences { state.prefs.lock().unwrap_or_else(|p|p.into_inner()).clone() }
#[tauri::command]
fn save_preferences(app:tauri::AppHandle,state:tauri::State<AppState>,mut prefs:Preferences)->Result<Preferences,String>{
    if !prefs.size.is_finite() || !prefs.intensity.is_finite() {return Err("设置数值无效".into());}
    prefs.size=prefs.size.clamp(260.0,720.0);prefs.intensity=prefs.intensity.clamp(0.0,1.6);
    let mut guard=state.prefs.lock().unwrap_or_else(|p|p.into_inner());
    let previous=guard.clone();
    let result=(|| {let path=prefs_path(&app)?; fs::create_dir_all(path.parent().unwrap()).map_err(|e|e.to_string())?;
        let tmp=path.with_extension("tmp");fs::write(&tmp,serde_json::to_vec_pretty(&prefs).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
        apply_preferences(&app,&prefs)?;
        fs::rename(tmp,path).map_err(|e|e.to_string())?;Ok::<(),String>(())})();
    if let Err(e)=result {let _=apply_preferences(&app,&previous);return Err(format!("保存失败：{e}"));}
    *guard=prefs.clone();let _=app.emit("preferences",&prefs);Ok(prefs)
}
fn monitor_work(window:&tauri::WebviewWindow)->Result<Option<(window_layout::Rect,f64)>,String>{
    let monitor=window.current_monitor().map_err(|e|e.to_string())?.or(window.primary_monitor().map_err(|e|e.to_string())?);
    Ok(monitor.map(|m|{let a=m.work_area();(window_layout::Rect{x:a.position.x,y:a.position.y,width:a.size.width as i32,height:a.size.height as i32},m.scale_factor())}))
}
fn place_pet(app:&tauri::AppHandle)->Result<(),String>{
    if let Some(w)=app.get_webview_window("pet"){
        if let Some((work,scale))=monitor_work(&w)?{
            let size=w.outer_size().map_err(|e|e.to_string())?;
            let p=window_layout::corner(work,size.width as i32,size.height as i32,(24.0*scale).round() as i32);
            w.set_position(PhysicalPosition::new(p.x,p.y)).map_err(|e|e.to_string())?;
        }
    }Ok(())
}
fn reveal_settings(app:&tauri::AppHandle,settings:&tauri::WebviewWindow)->Result<(),String>{
    if let Some(pet)=app.get_webview_window("pet"){
        if let Some((work,scale))=monitor_work(&pet)?{
            let p=pet.outer_position().map_err(|e|e.to_string())?;let s=pet.outer_size().map_err(|e|e.to_string())?;
            let panel=settings.outer_size().map_err(|e|e.to_string())?;
            let position=window_layout::beside(window_layout::Rect{x:p.x,y:p.y,width:s.width as i32,height:s.height as i32},panel.width as i32,panel.height as i32,work,(16.0*scale).round() as i32);
            settings.set_position(PhysicalPosition::new(position.x,position.y)).map_err(|e|e.to_string())?;
        }
        pet.unminimize().map_err(|e|e.to_string())?;pet.show().map_err(|e|e.to_string())?;
    }
    settings.show().map_err(|e|e.to_string())?;settings.set_focus().map_err(|e|e.to_string())
}
fn open_settings(app:&tauri::AppHandle)->Result<(),String>{
    // WebView2 creation must run off the Windows event loop. Serialize requests
    // so repeated tray clicks cannot create two windows with the same label.
    let state=app.state::<AppState>();
    let _guard=state.settings_gate.lock().unwrap_or_else(|p|p.into_inner());
    if let Some(w)=app.get_webview_window("settings"){return reveal_settings(app,&w);}
    let w=WebviewWindowBuilder::new(app,"settings",WebviewUrl::App("index.html?settings".into()))
        .title("秧秧玄翎 · 设置").inner_size(440.0,620.0).resizable(false).always_on_top(true).visible(false).build().map_err(|e|e.to_string())?;
    reveal_settings(app,&w)
}
#[tauri::command]
async fn show_settings(app:tauri::AppHandle)->Result<(),String>{
    tauri::async_runtime::spawn_blocking(move||open_settings(&app)).await.map_err(|e|e.to_string())?
}
fn request_settings(app:&tauri::AppHandle){
    let handle=app.clone();
    tauri::async_runtime::spawn_blocking(move||{if let Err(e)=open_settings(&handle){eprintln!("打开设置失败：{e}");}});
}
#[tauri::command]
fn close_settings(app:tauri::AppHandle)->Result<(),String>{if let Some(w)=app.get_webview_window("settings"){w.close().map_err(|e|e.to_string())?;}Ok(())}
#[tauri::command]
fn pet_ready(app:tauri::AppHandle)->Result<(),String>{app.get_webview_window("pet").ok_or("桌宠窗口不存在")?.show().map_err(|e|e.to_string())}
#[tauri::command]
fn drag_pet(app:tauri::AppHandle)->Result<(),String>{app.get_webview_window("pet").ok_or("桌宠窗口不存在")?.start_dragging().map_err(|e|e.to_string())}
#[tauri::command]
fn reset_pet(app:tauri::AppHandle,state:tauri::State<AppState>)->Result<(),String>{
    let mut p=state.prefs.lock().unwrap_or_else(|p|p.into_inner()).clone();p.click_through=false;
    let _=save_preferences(app.clone(),state,p.clone())?;
    place_pet(&app)?;
    if let Some(w)=app.get_webview_window("pet") {w.unminimize().map_err(|e|e.to_string())?;w.show().map_err(|e|e.to_string())?;}Ok(())
}
#[tauri::command]
fn window_diagnostics(app:tauri::AppHandle)->Result<serde_json::Value,String>{
    let mut result=serde_json::Map::new();
    for label in ["pet","settings"]{
        if let Some(w)=app.get_webview_window(label){
            let position=w.outer_position().map_err(|e|e.to_string())?;let size=w.outer_size().map_err(|e|e.to_string())?;
            let work=monitor_work(&w)?.map(|(r,scale)|serde_json::json!({"x":r.x,"y":r.y,"width":r.width,"height":r.height,"scale":scale}));
            result.insert(label.into(),serde_json::json!({"x":position.x,"y":position.y,"width":size.width,"height":size.height,"visible":w.is_visible().map_err(|e|e.to_string())?,"minimized":w.is_minimized().map_err(|e|e.to_string())?,"alwaysOnTop":w.is_always_on_top().map_err(|e|e.to_string())?,"work":work}));
        }
    }Ok(result.into())
}
#[tauri::command]
fn input_metrics(state:tauri::State<AppState>)->serde_json::Value{
    #[cfg(windows)] let hook_active=keyboard_edges::active();
    #[cfg(not(windows))] let hook_active=false;
    serde_json::json!({"samples":state.samples.load(Ordering::Relaxed),"keyboardPresses":state.keyboard_presses.load(Ordering::Relaxed),"mousePresses":state.mouse_presses.load(Ordering::Relaxed),"keyboardHookActive":hook_active})
}
#[tauri::command]
fn quit_app(app:tauri::AppHandle){app.exit(0)}

#[cfg(windows)]
fn key_label(code:usize)->String{match code {65..=90=>char::from_u32(code as u32).unwrap().to_string(),48..=57=>char::from_u32(code as u32).unwrap().to_string(),112..=135=>format!("F{}",code-111),32=>"Space".into(),13=>"Enter".into(),8=>"Backspace".into(),9=>"Tab".into(),27=>"Esc".into(),37=>"←".into(),38=>"↑".into(),39=>"→".into(),40=>"↓".into(),160|161=>"Shift".into(),162|163=>"Ctrl".into(),164|165=>"Alt".into(),96..=105=>format!("Num {}",code-96),_=>"按键".into()}}
#[cfg(windows)]
fn reach(code:usize)->f32{match code {32=>0.0,65..=71|81..=84|90|88|86|49..=53=>0.6,72..=80|85|87|89|54..=57=>-0.6,_=>0.0}}
#[cfg(windows)]
fn start_input(app:tauri::AppHandle){std::thread::spawn(move||{
    use windows_sys::Win32::UI::{Input::KeyboardAndMouse::GetAsyncKeyState,WindowsAndMessaging::{GetCursorPos,GetSystemMetrics,SM_XVIRTUALSCREEN,SM_YVIRTUALSCREEN,SM_CXVIRTUALSCREEN,SM_CYVIRTUALSCREEN}};
    let mut held=[false;256];let mut last=InputFrame::default();let mut label=String::new();let mut position=0.0f32;let mut chord_held=false;
    let mut last_emit=std::time::Instant::now();
    loop {let mut now=[false;256];for k in 1..256 {now[k]=unsafe{GetAsyncKeyState(k as i32)} as u16 & 0x8000 !=0;}
        let mut new_press=false;let mut count=0u16;
        for k in 8..256 {let edge=keyboard_edges::take_press(k);if matches!(k,16|17|18|229){continue;}
            if now[k]||(edge&&!held[k]){count+=1;}
            if edge||(!keyboard_edges::active()&&now[k]&&!held[k]){new_press=true;label=key_label(k);position=reach(k);}}
        let mouse_down=now[1]||now[2]||now[4];let new_mouse_press=(now[1]&&!held[1])||(now[2]&&!held[2])||(now[4]&&!held[4]);
        let state=app.state::<AppState>();state.samples.fetch_add(1,Ordering::Relaxed);if new_press{state.keyboard_presses.fetch_add(1,Ordering::Relaxed);}if new_mouse_press{state.mouse_presses.fetch_add(1,Ordering::Relaxed);}
        let mut pt=windows_sys::Win32::Foundation::POINT{x:0,y:0};unsafe{GetCursorPos(&mut pt);}
        let (left,top,width,height)=unsafe{(GetSystemMetrics(SM_XVIRTUALSCREEN),GetSystemMetrics(SM_YVIRTUALSCREEN),GetSystemMetrics(SM_CXVIRTUALSCREEN).max(1),GetSystemMetrics(SM_CYVIRTUALSCREEN).max(1))};
        let frame=InputFrame{keys_held:count,mouse_down,new_press,new_mouse_press,key_label:if new_press{label.clone()}else{String::new()},reach:position,cursor_x:(((pt.x-left)as f32/width as f32)*2.0-1.0).clamp(-1.0,1.0),cursor_y:(((pt.y-top)as f32/height as f32)*2.0-1.0).clamp(-1.0,1.0)};
        let chord=(now[162]||now[163])&&(now[164]||now[165])&&now[89];
        if chord&&!chord_held {let handle=app.clone();let _=app.run_on_main_thread(move||{let s=handle.state::<AppState>();let _=reset_pet(handle.clone(),s);});}chord_held=chord;
        if frame!=last||last_emit.elapsed().as_millis()>100 {let _=app.emit_to("pet","native-input",&frame);last_emit=std::time::Instant::now();}
        last=frame;held=now;std::thread::sleep(std::time::Duration::from_millis(8));
    }
});}

fn main(){tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![read_preferences,save_preferences,show_settings,close_settings,pet_ready,drag_pet,reset_pet,window_diagnostics,input_metrics,quit_app])
    .setup(|app|{
        let p=prefs_path(app.handle()).ok().and_then(|f|fs::read(f).ok()).and_then(|s|serde_json::from_slice::<Preferences>(&s).ok()).unwrap_or_default();
        app.manage(AppState{prefs:Mutex::new(p.clone()),settings_gate:Mutex::new(()),keyboard_presses:AtomicU64::new(0),mouse_presses:AtomicU64::new(0),samples:AtomicU64::new(0)});
        apply_preferences(app.handle(),&p)?;
        place_pet(app.handle())?;
        let settings=MenuItem::with_id(app,"settings","打开设置",true,None::<&str>)?;let show=MenuItem::with_id(app,"show","显示桌宠",true,None::<&str>)?;
        let through=MenuItem::with_id(app,"through","切换鼠标穿透",true,None::<&str>)?;let reset=MenuItem::with_id(app,"reset","找回桌宠 / 关闭穿透",true,None::<&str>)?;let quit=MenuItem::with_id(app,"quit","退出",true,None::<&str>)?;
        let menu=Menu::with_items(app,&[&show,&settings,&through,&reset,&quit])?;
        TrayIconBuilder::new().icon(app.default_window_icon().unwrap().clone()).tooltip("秧秧玄翎 · 右键设置").menu(&menu).show_menu_on_left_click(false)
            .on_menu_event(|app,event|{match event.id.as_ref(){"settings"=>request_settings(app),"show"=>{if let Some(w)=app.get_webview_window("pet"){let _=w.show();}},"reset"=>{let _=reset_pet(app.clone(),app.state::<AppState>());},"through"=>{let s=app.state::<AppState>();let mut p=s.prefs.lock().unwrap_or_else(|p|p.into_inner()).clone();p.click_through=!p.click_through;let _=save_preferences(app.clone(),s,p);},"quit"=>app.exit(0),_=>{}}})
            .on_tray_icon_event(|tray,event|{if let TrayIconEvent::Click{button:MouseButton::Left,button_state:MouseButtonState::Up,..}=event {request_settings(tray.app_handle());}}).build(app)?;
        #[cfg(windows)] {keyboard_edges::start();start_input(app.handle().clone());}
        let handle=app.handle().clone();std::thread::spawn(move||{std::thread::sleep(std::time::Duration::from_secs(8));if let Some(w)=handle.get_webview_window("pet"){let _=w.show();}});
        Ok(())
    }).run(tauri::generate_context!()).expect("秧秧玄翎启动失败");}
