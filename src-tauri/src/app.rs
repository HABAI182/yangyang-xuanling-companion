use std::{fs,sync::{Mutex,atomic::{AtomicU64,AtomicBool,Ordering}}};
use serde::Serialize;
use tauri::{Emitter,Manager,WebviewWindowBuilder,WebviewUrl,LogicalSize};
use tauri::{menu::{Menu,MenuItem},tray::{TrayIconBuilder,TrayIconEvent,MouseButton,MouseButtonState}};
use crate::{desktop,platform,preferences::{Preferences,ACTIONS,shortcut_key}};
pub struct AppState{
 pub prefs:Mutex<Preferences>,pub window_gate:Mutex<()>,pub keyboard_presses:AtomicU64,pub mouse_presses:AtomicU64,pub samples:AtomicU64,
 pub hit_mask:Mutex<crate::hit_test::HitMask>,pub cursor_ignored:AtomicBool,pub saved:Mutex<desktop::SavedDesktop>,pub visibility:Mutex<desktop::Visibility>,pub dragging:AtomicBool,pub menu_dragging:AtomicBool,pub ready:AtomicBool,pub gamepad_connected:AtomicBool,
}
#[derive(Clone,Serialize,Default,PartialEq)]#[serde(rename_all="camelCase")]
struct InputFrame{keys_held:u16,mouse_down:bool,new_press:bool,new_mouse_press:bool,key_label:String,reach:f32,target_x:f32,target_y:f32,target_zone:String,cursor_x:f32,cursor_y:f32,cursor_moved:bool,presses:Vec<String>,repeats:Vec<String>,hovering:bool}
fn prefs_path(app:&tauri::AppHandle)->Result<std::path::PathBuf,String>{Ok(app.path().app_data_dir().map_err(|e|e.to_string())?.join("preferences.json"))}
fn apply_preferences(app:&tauri::AppHandle,p:&Preferences)->Result<(),String>{
 if let Some(w)=app.get_webview_window("pet"){w.set_always_on_top(p.always_on_top).map_err(|e|e.to_string())?;w.set_ignore_cursor_events(p.click_through).map_err(|e|e.to_string())?;app.state::<AppState>().cursor_ignored.store(p.click_through,Ordering::Release);w.set_size(LogicalSize::new(p.size,p.size*1.025)).map_err(|e|e.to_string())?;let pos=w.outer_position().map_err(|e|e.to_string())?;desktop::place(app,Some(desktop::Position{x:pos.x,y:pos.y}))?;}Ok(())
}
#[tauri::command]pub fn read_preferences(state:tauri::State<AppState>)->Preferences{state.prefs.lock().unwrap_or_else(|x|x.into_inner()).clone()}
#[tauri::command]pub fn save_preferences(app:tauri::AppHandle,state:tauri::State<AppState>,mut prefs:Preferences)->Result<Preferences,String>{
 prefs.validate()?;let mut guard=state.prefs.lock().map_err(|_|"设置锁失败")?;let old=guard.clone();
 let result=(||{let path=prefs_path(&app)?;fs::create_dir_all(path.parent().unwrap()).map_err(|e|e.to_string())?;let tmp=path.with_extension("tmp");fs::write(&tmp,serde_json::to_vec_pretty(&prefs).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;apply_preferences(&app,&prefs)?;if prefs.autostart!=old.autostart{platform::set_autostart(prefs.autostart)?;}fs::rename(tmp,path).map_err(|e|e.to_string())?;Ok::<(),String>(())})();
 if let Err(e)=result{let _=apply_preferences(&app,&old);if prefs.autostart!=old.autostart{let _=platform::set_autostart(old.autostart);}return Err(format!("设置未保存：{e}"));}
 *guard=prefs.clone();let _=app.emit("preferences",&prefs);Ok(prefs)
}
#[tauri::command]fn preview_size(app:tauri::AppHandle,size:f64)->Result<(),String>{if !size.is_finite(){return Err("大小无效".into());}let mut p=read_preferences(app.state());p.size=size.clamp(210.,840.);apply_preferences(&app,&p)}
fn open_panel(app:&tauri::AppHandle,kind:&str)->Result<(),String>{
 let state=app.state::<AppState>();let _guard=state.window_gate.lock().map_err(|_|"窗口锁失败")?;
 if kind=="settings"{if let Some(menu)=app.get_webview_window("menu"){let _=menu.close();}}
 if let Some(w)=app.get_webview_window(kind){desktop::beside(app,&w)?;w.show().map_err(|e|e.to_string())?;return w.set_focus().map_err(|e|e.to_string());}
 let (title,width,height):(&str,f64,f64) = if kind=="settings"{("秧秧玄翎 · 设置",620.,760.)}else{("秧秧玄翎 · 互动",356.,470.)};
 let height=app.get_webview_window("pet").and_then(|w|desktop::work(&w).ok().flatten()).map(|(a,s)|height.min(a.height as f64/s-48.)).unwrap_or(height).max(if kind=="settings"{420.}else{180.});
 let w=WebviewWindowBuilder::new(app,kind,WebviewUrl::App(format!("index.html?{kind}").into())).title(title).inner_size(width,height).resizable(false).decorations(kind=="settings").always_on_top(true).visible(false).build().map_err(|e|e.to_string())?;
 desktop::beside(app,&w)?;w.show().map_err(|e|e.to_string())?;w.set_focus().map_err(|e|e.to_string())
}
fn request_panel(app:&tauri::AppHandle,kind:&'static str){let handle=app.clone();tauri::async_runtime::spawn_blocking(move||{if let Err(e)=open_panel(&handle,kind){eprintln!("打开面板失败：{e}");}});}
#[tauri::command]async fn show_settings(app:tauri::AppHandle)->Result<(),String>{tauri::async_runtime::spawn_blocking(move||open_panel(&app,"settings")).await.map_err(|e|e.to_string())?}
#[tauri::command]async fn show_menu(app:tauri::AppHandle)->Result<(),String>{tauri::async_runtime::spawn_blocking(move||open_panel(&app,"menu")).await.map_err(|e|e.to_string())?}
#[tauri::command]fn fit_menu(app:tauri::AppHandle,window:tauri::WebviewWindow,height:f64)->Result<f64,String>{
 if window.label()!="menu"{return Err("只能调整互动菜单自身的高度".into());}
 let scale=window.scale_factor().map_err(|e|e.to_string())?;
 let available=desktop::work(&window)?.map(|(a,s)|a.height as f64/s-24.).unwrap_or(960.);
 let target=crate::window_layout::menu_height(height,available).ok_or("菜单高度无效")?;
 let width=window.inner_size().map_err(|e|e.to_string())?.to_logical::<f64>(scale).width;
 window.set_size(LogicalSize::new(width,target)).map_err(|e|e.to_string())?;desktop::beside(&app,&window)?;Ok(target)
}
#[tauri::command]fn close_panel(app:tauri::AppHandle,label:String)->Result<(),String>{if !["menu","settings"].contains(&label.as_str()){return Err("窗口无效".into());}if let Some(w)=app.get_webview_window(&label){w.close().map_err(|e|e.to_string())?;}Ok(())}
#[tauri::command]fn update_hit_mask(window:tauri::WebviewWindow,state:tauri::State<AppState>,width:u16,height:u16,runs:Vec<[u16;3]>)->Result<(),String>{
 if window.label()!="pet"{return Err("只能更新桌宠自身的点击轮廓".into());}
 state.hit_mask.lock().map_err(|_|"轮廓锁失败")?.replace(width,height,&runs)
}
#[tauri::command]fn pet_ready(app:tauri::AppHandle)->Result<(),String>{desktop::renderer_ready(&app)}
#[tauri::command]fn drag_pet(app:tauri::AppHandle)->Result<(),String>{app.state::<AppState>().dragging.store(true,Ordering::Release);let result=app.get_webview_window("pet").ok_or("桌宠窗口不存在")?.start_dragging().map_err(|e|e.to_string());if result.is_err(){app.state::<AppState>().dragging.store(false,Ordering::Release);}result}
#[tauri::command]fn drag_menu(app:tauri::AppHandle)->Result<(),String>{app.state::<AppState>().menu_dragging.store(true,Ordering::Release);app.get_webview_window("menu").ok_or("互动窗口不存在")?.start_dragging().map_err(|e|e.to_string())}
#[tauri::command]fn hide_pet(app:tauri::AppHandle)->Result<(),String>{desktop::show(&app,false)}
#[tauri::command]fn show_pet(app:tauri::AppHandle)->Result<(),String>{desktop::show(&app,true)}
#[tauri::command]pub fn reset_pet(app:tauri::AppHandle)->Result<(),String>{let mut p=read_preferences(app.state());p.click_through=false;save_preferences(app.clone(),app.state(),p)?;desktop::place(&app,None)?;desktop::show(&app,true)?;desktop::save_current(&app)}
#[tauri::command]fn pet_action(app:tauri::AppHandle,action:String)->Result<(),String>{if !ACTIONS.contains(&action.as_str()){return Err("动作无效".into());}if !crate::edition::action_allowed(&action){return Err("此动作属于表情完整版".into());}app.emit_to("pet","pet-action",action).map_err(|e|e.to_string())}
#[tauri::command]fn open_project_link(page:String)->Result<(),String>{platform::open_link(&page)}
#[tauri::command]fn restart_elevated(app:tauri::AppHandle)->Result<(),String>{platform::elevated_restart()?;app.exit(0);Ok(())}
#[tauri::command]fn quit_app(app:tauri::AppHandle){app.exit(0)}
#[tauri::command]fn play_sound(state:tauri::State<AppState>){let p=state.prefs.lock().unwrap_or_else(|x|x.into_inner());if p.sfx_enabled{crate::sound::play(p.sfx_volume);}}
#[tauri::command]fn test_sound(state:tauri::State<AppState>){if crate::edition::STATIC{return;}let volume=state.prefs.lock().unwrap_or_else(|x|x.into_inner()).sfx_volume;crate::sound::play(volume);}
#[tauri::command]fn input_metrics(state:tauri::State<AppState>)->serde_json::Value{
 #[cfg(windows)]let active=crate::keyboard_edges::active();#[cfg(not(windows))]let active=false;
 serde_json::json!({"edition":crate::edition::NAME,"samples":state.samples.load(Ordering::Relaxed),"keyboardPresses":state.keyboard_presses.load(Ordering::Relaxed),"mousePresses":state.mouse_presses.load(Ordering::Relaxed),"keyboardHookActive":active,"gamepadConnected":state.gamepad_connected.load(Ordering::Relaxed),"ownEditorForeground":platform::own_editor_foreground(),"transparentCursor":state.cursor_ignored.load(Ordering::Acquire),"hitMaskUpdates":state.hit_mask.lock().unwrap_or_else(|x|x.into_inner()).updates})
}
#[tauri::command]fn window_diagnostics(app:tauri::AppHandle)->Result<serde_json::Value,String>{let mut result=serde_json::Map::new();for label in ["pet","settings","menu"]{if let Some(w)=app.get_webview_window(label){let p=w.outer_position().map_err(|e|e.to_string())?;let s=w.outer_size().map_err(|e|e.to_string())?;let work=desktop::work(&w)?.map(|(r,scale)|serde_json::json!({"x":r.x,"y":r.y,"width":r.width,"height":r.height,"scale":scale}));result.insert(label.into(),serde_json::json!({"x":p.x,"y":p.y,"width":s.width,"height":s.height,"visible":w.is_visible().map_err(|e|e.to_string())?,"minimized":w.is_minimized().map_err(|e|e.to_string())?,"alwaysOnTop":w.is_always_on_top().map_err(|e|e.to_string())?,"work":work}));}}Ok(result.into())}

#[cfg(windows)]fn key_label(code:usize)->String{match code{65..=90|48..=57=>char::from_u32(code as u32).unwrap().to_string(),112..=135=>format!("F{}",code-111),32=>"Space".into(),13=>"Enter".into(),8=>"Backspace".into(),9=>"Tab".into(),27=>"Esc".into(),37=>"←".into(),38=>"↑".into(),39=>"→".into(),40=>"↓".into(),160|161=>"Shift".into(),162|163=>"Ctrl".into(),164|165=>"Alt".into(),96..=105=>format!("Num {}",code-96),20=>"CapsLock".into(),33=>"PageUp".into(),34=>"PageDown".into(),35=>"End".into(),36=>"Home".into(),45=>"Insert".into(),46=>"Delete".into(),_=>String::new()}}
#[cfg(windows)]fn reach(code:usize)->f32{match code{32=>0.,65..=71|81..=84|90|88|86|49..=53=>0.6,72..=80|85|87|89|54..=57=>-0.6,_=>0.}}
#[cfg(windows)]fn start_input(app:tauri::AppHandle){std::thread::spawn(move||{
 use windows_sys::Win32::UI::{Input::KeyboardAndMouse::GetAsyncKeyState,WindowsAndMessaging::GetCursorPos};
 let mut key_order=vec![];let mut held=[false;256];let mut last=InputFrame::default();let mut position=0.;let mut recover_held=false;let mut last_emit=std::time::Instant::now();let mut pad_before=0u16;let mut cursor_anchor=(i32::MIN,i32::MIN);
 loop{
  let prefs=read_preferences(app.state());let editing=platform::own_editor_foreground();let allowed=prefs.input_enabled&&!editing;
  let mut now=[false;256];for k in 1..256{now[k]=unsafe{GetAsyncKeyState(k as i32)} as u16&0x8000!=0;}
  let mut pressed_codes=vec![];let mut presses=vec![];let mut repeats=vec![];let mut count=0u16;let mut new_press=false;
  for k in 8..256{let edge=crate::keyboard_edges::take_press(k);let repeated=crate::keyboard_edges::take_repeat(k);if matches!(k,16|17|18|229){continue;}
   if allowed{if now[k]||(edge&&!held[k]){count+=1;}if edge||(!crate::keyboard_edges::active()&&now[k]&&!held[k]){new_press=true;pressed_codes.push(k);let label=key_label(k);if !label.is_empty(){presses.push(label);}position=reach(k);
    for slot in prefs.shortcuts.iter().filter(|s|s.enabled){if let Some((code,ctrl,alt,shift))=shortcut_key(&slot.chord){if k==code&&ctrl==(now[162]||now[163])&&alt==(now[164]||now[165])&&shift==(now[160]||now[161]){let _=app.emit_to("pet","pet-action",&slot.action);}}}
   }if repeated&&prefs.repeat_keys{let label=key_label(k);if !label.is_empty(){repeats.push(label);}}}
  }
  if !allowed{key_order.clear();}let selected=crate::key_target::update_order(&mut key_order,&now,&pressed_codes);let mut landing=crate::key_target::target(selected.unwrap_or(32));
  let mouse_enabled=allowed&&prefs.input_mode=="keyboard_mouse";let mut mouse_down=mouse_enabled&&(now[1]||now[2]||now[4]);let mut new_mouse_press=mouse_enabled&&((now[1]&&!held[1])||(now[2]&&!held[2])||(now[4]&&!held[4]));
  let state=app.state::<AppState>();if prefs.gamepad_enabled{if let Some((buttons,x,_y))=platform::controller(){state.gamepad_connected.store(true,Ordering::Relaxed);if allowed{if buttons&0x1000!=0{count+=1;position=x as f32/32768.;if selected.is_none(){landing=crate::key_target::Target{x:position,y:0.35,zone:if position>=0.{"left-near"}else{"right-near"}};}}if buttons&0x1000!=0&&pad_before&0x1000==0{new_press=true;presses.push("A".into());}if buttons&0x2000!=0&&prefs.input_mode=="keyboard_mouse"{mouse_down=true;new_mouse_press|=pad_before&0x2000==0;}}pad_before=buttons;}else{state.gamepad_connected.store(false,Ordering::Relaxed);pad_before=0;}}else{state.gamepad_connected.store(false,Ordering::Relaxed);pad_before=0;}
  state.samples.fetch_add(1,Ordering::Relaxed);if new_press{state.keyboard_presses.fetch_add(1,Ordering::Relaxed);}if new_mouse_press{state.mouse_presses.fetch_add(1,Ordering::Relaxed);}
  let mut pt=windows_sys::Win32::Foundation::POINT{x:0,y:0};unsafe{GetCursorPos(&mut pt);}let cursor_moved=(pt.x as i64-cursor_anchor.0 as i64).abs()+(pt.y as i64-cursor_anchor.1 as i64).abs()>1;if cursor_moved{cursor_anchor=(pt.x,pt.y);}let mut cursor_x=0.;let mut cursor_y=0.;let mut hovering=false;
  if let Some(pet)=app.get_webview_window("pet"){if let (Ok(p),Ok(s))=(pet.outer_position(),pet.outer_size()){let w=s.width.max(1) as f32;let h=s.height.max(1) as f32;cursor_x=((pt.x-p.x) as f32/w*2.-1.).clamp(-1.,1.);cursor_y=((pt.y-p.y) as f32/h*2.-1.).clamp(-1.,1.);hovering=state.hit_mask.lock().unwrap_or_else(|x|x.into_inner()).contains(pt.x-p.x,pt.y-p.y,s.width,s.height);
    let before=state.cursor_ignored.load(Ordering::Acquire);let ignore=crate::hit_test::ignore_cursor(prefs.click_through,hovering,state.dragging.load(Ordering::Acquire),held[1]||held[2]||held[4],before);
    if before!=ignore&&pet.set_ignore_cursor_events(ignore).is_ok(){state.cursor_ignored.store(ignore,Ordering::Release);}}}
  if (now[1]&&!held[1]||now[2]&&!held[2])&&!state.menu_dragging.load(Ordering::Acquire){if let Some(menu)=app.get_webview_window("menu"){if let (Ok(p),Ok(s))=(menu.outer_position(),menu.outer_size()){if pt.x<p.x||pt.y<p.y||pt.x>=p.x+s.width as i32||pt.y>=p.y+s.height as i32{let _=menu.close();}}}}
  presses.truncate(6);repeats.truncate(6);let frame=InputFrame{keys_held:count,mouse_down,new_press,new_mouse_press,key_label:presses.last().cloned().unwrap_or_default(),reach:position,target_x:landing.x,target_y:landing.y,target_zone:landing.zone.into(),cursor_x,cursor_y,cursor_moved,presses,repeats,hovering};
  let recover=(now[162]||now[163])&&(now[164]||now[165])&&now[89];if recover&&!recover_held{let handle=app.clone();tauri::async_runtime::spawn_blocking(move||{let _=reset_pet(handle);});}recover_held=recover;
  if frame!=last||last_emit.elapsed().as_millis()>100{let _=app.emit_to("pet","native-input",&frame);last_emit=std::time::Instant::now();}last=frame;held=now;std::thread::sleep(std::time::Duration::from_millis(8));
 }
});}

// Static artwork only needs desktop hit testing, menu dismissal and recovery.
// Do not install the keyboard hook, scan the keyboard or emit animation input.
#[cfg(windows)]fn start_static_desktop(app:tauri::AppHandle){std::thread::spawn(move||{
 use windows_sys::Win32::UI::{Input::KeyboardAndMouse::GetAsyncKeyState,WindowsAndMessaging::GetCursorPos};
 let down=|key|unsafe{GetAsyncKeyState(key)} as u16&0x8000!=0;
 let mut previous=[false;3];let mut recover_before=false;
 loop{
  let p=read_preferences(app.state());let state=app.state::<AppState>();let mouse=[down(1),down(2),down(4)];
  let mut pt=windows_sys::Win32::Foundation::POINT{x:0,y:0};unsafe{GetCursorPos(&mut pt);}
  if let Some(pet)=app.get_webview_window("pet"){if let (Ok(pos),Ok(size))=(pet.outer_position(),pet.outer_size()){
   let hit=state.hit_mask.lock().unwrap_or_else(|x|x.into_inner()).contains(pt.x-pos.x,pt.y-pos.y,size.width,size.height);
   let before=state.cursor_ignored.load(Ordering::Acquire);
   let ignore=crate::hit_test::ignore_cursor(p.click_through,hit,state.dragging.load(Ordering::Acquire),previous.iter().any(|x|*x),before);
   if before!=ignore&&pet.set_ignore_cursor_events(ignore).is_ok(){state.cursor_ignored.store(ignore,Ordering::Release);}
  }}
  if (mouse[0]&&!previous[0]||mouse[1]&&!previous[1])&&!state.menu_dragging.load(Ordering::Acquire){if let Some(menu)=app.get_webview_window("menu"){if let (Ok(pos),Ok(size))=(menu.outer_position(),menu.outer_size()){if pt.x<pos.x||pt.y<pos.y||pt.x>=pos.x+size.width as i32||pt.y>=pos.y+size.height as i32{let _=menu.close();}}}}
  let recover=down(17)&&down(18)&&down(89);if recover&&!recover_before{let handle=app.clone();tauri::async_runtime::spawn_blocking(move||{let _=reset_pet(handle);});}recover_before=recover;previous=mouse;
  std::thread::sleep(std::time::Duration::from_millis(16));
 }
});}

pub fn run(){tauri::Builder::default().invoke_handler(tauri::generate_handler![read_preferences,save_preferences,preview_size,show_settings,show_menu,fit_menu,close_panel,update_hit_mask,pet_ready,drag_pet,drag_menu,hide_pet,show_pet,reset_pet,pet_action,open_project_link,restart_elevated,quit_app,play_sound,test_sound,input_metrics,window_diagnostics,desktop::list_positions,desktop::save_position,desktop::restore_position])
 .setup(|app|{
  let mut p=prefs_path(app.handle()).ok().and_then(|f|fs::read(f).ok()).and_then(|s|serde_json::from_slice::<Preferences>(&s).ok()).unwrap_or_default();if p.validate().is_err(){p.shortcuts=Preferences::default().shortcuts;p.fullscreen_exceptions.clear();p.validate().map_err(std::io::Error::other)?;}
  let saved=desktop::load(app.handle());let last=saved.last;app.manage(AppState{prefs:Mutex::new(p.clone()),hit_mask:Mutex::new(crate::hit_test::HitMask::default()),cursor_ignored:AtomicBool::new(false),window_gate:Mutex::new(()),keyboard_presses:AtomicU64::new(0),mouse_presses:AtomicU64::new(0),samples:AtomicU64::new(0),saved:Mutex::new(saved),visibility:Mutex::new(desktop::Visibility::default()),dragging:AtomicBool::new(false),menu_dragging:AtomicBool::new(false),ready:AtomicBool::new(false),gamepad_connected:AtomicBool::new(false)});
  apply_preferences(app.handle(),&p)?;desktop::place(app.handle(),last)?;if p.autostart{platform::set_autostart(true)?;}
  let show=MenuItem::with_id(app,"show","显示桌宠",true,None::<&str>)?;let hide=MenuItem::with_id(app,"hide","隐藏桌宠",true,None::<&str>)?;let settings=MenuItem::with_id(app,"settings","设置与个性化",true,None::<&str>)?;let interact=MenuItem::with_id(app,"interact",if crate::edition::STATIC{"桌面菜单"}else{"和秧秧互动"},true,None::<&str>)?;let through=MenuItem::with_id(app,"through","切换鼠标穿透",true,None::<&str>)?;let reset=MenuItem::with_id(app,"reset","找回桌宠 / 关闭穿透",true,None::<&str>)?;let quit=MenuItem::with_id(app,"quit","退出",true,None::<&str>)?;
  let menu=Menu::with_items(app,&[&show,&hide,&interact,&settings,&through,&reset,&quit])?;
  TrayIconBuilder::new().icon(app.default_window_icon().unwrap().clone()).tooltip("秧秧玄翎 · 右键互动").menu(&menu).show_menu_on_left_click(false).on_menu_event(|app,e|{match e.id.as_ref(){"settings"=>request_panel(app,"settings"),"interact"=>request_panel(app,"menu"),"show"=>{let _=desktop::show(app,true);},"hide"=>{let _=desktop::show(app,false);},"reset"=>{let _=reset_pet(app.clone());},"through"=>{let mut p=read_preferences(app.state());p.click_through=!p.click_through;let _=save_preferences(app.clone(),app.state(),p);},"quit"=>app.exit(0),_=>{}}}).on_tray_icon_event(|tray,e|{if let TrayIconEvent::Click{button:MouseButton::Left,button_state:MouseButtonState::Up,..}=e{request_panel(tray.app_handle(),"menu");}}).build(app)?;
  #[cfg(windows)]{if crate::edition::STATIC{start_static_desktop(app.handle().clone());}else{crate::keyboard_edges::start();start_input(app.handle().clone());}}desktop::watch(app.handle().clone());
  let handle=app.handle().clone();std::thread::spawn(move||{std::thread::sleep(std::time::Duration::from_secs(8));let _=desktop::renderer_ready(&handle);});Ok(())
 }).run(tauri::generate_context!()).expect("秧秧玄翎启动失败");}
