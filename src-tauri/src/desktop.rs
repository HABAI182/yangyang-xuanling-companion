use serde::{Serialize,Deserialize};
use std::{sync::atomic::Ordering,time::Duration};
use tauri::{Manager,PhysicalPosition};
use crate::{app::AppState,window_layout::{self,Rect}};

#[derive(Clone,Copy,Debug,PartialEq,Serialize,Deserialize)]pub struct Position{pub x:i32,pub y:i32}
#[derive(Clone,Default,Serialize,Deserialize)]#[serde(default)]pub struct SavedDesktop{pub last:Option<Position>,pub slots:[Option<Position>;3]}
#[derive(Default)]pub struct Visibility{pub manual_hidden:bool,pub auto_hidden:bool,pub fullscreen_override:bool}
fn store_path(app:&tauri::AppHandle)->Result<std::path::PathBuf,String>{Ok(app.path().app_data_dir().map_err(|e|e.to_string())?.join("desktop-state.json"))}
pub fn load(app:&tauri::AppHandle)->SavedDesktop{store_path(app).ok().and_then(|p|std::fs::read(p).ok()).and_then(|b|serde_json::from_slice(&b).ok()).unwrap_or_default()}
fn persist(app:&tauri::AppHandle,saved:&SavedDesktop)->Result<(),String>{let path=store_path(app)?;std::fs::create_dir_all(path.parent().unwrap()).map_err(|e|e.to_string())?;let tmp=path.with_extension("tmp");std::fs::write(&tmp,serde_json::to_vec_pretty(saved).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;std::fs::rename(tmp,path).map_err(|e|e.to_string())}
pub fn work(window:&tauri::WebviewWindow)->Result<Option<(Rect,f64)>,String>{let m=window.current_monitor().map_err(|e|e.to_string())?.or(window.primary_monitor().map_err(|e|e.to_string())?);Ok(m.map(|m|{let a=m.work_area();(Rect{x:a.position.x,y:a.position.y,width:a.size.width as i32,height:a.size.height as i32},m.scale_factor())}))}
pub fn place(app:&tauri::AppHandle,pos:Option<Position>)->Result<(),String>{
 let pet=app.get_webview_window("pet").ok_or("桌宠窗口不存在")?;let size=pet.outer_size().map_err(|e|e.to_string())?;
 let monitor=if let Some(p)=pos{pet.available_monitors().map_err(|e|e.to_string())?.into_iter().find(|m|{let a=m.work_area();p.x>=a.position.x&&p.x<a.position.x+a.size.width as i32&&p.y>=a.position.y&&p.y<a.position.y+a.size.height as i32})}else{None}.or(pet.primary_monitor().map_err(|e|e.to_string())?);
 if let Some(m)=monitor{let a=m.work_area();let area=Rect{x:a.position.x,y:a.position.y,width:a.size.width as i32,height:a.size.height as i32};let fit=if let Some(p)=pos{window_layout::fit(Rect{x:p.x,y:p.y,width:size.width as i32,height:size.height as i32},area)}else{window_layout::corner(area,size.width as i32,size.height as i32,(24.*m.scale_factor()) as i32)};pet.set_position(PhysicalPosition::new(fit.x,fit.y)).map_err(|e|e.to_string())?;}Ok(())
}
pub fn beside(app:&tauri::AppHandle,panel:&tauri::WebviewWindow)->Result<(),String>{
 if let Some(pet)=app.get_webview_window("pet"){if let Some((area,scale))=work(&pet)?{let p=pet.outer_position().map_err(|e|e.to_string())?;let s=pet.outer_size().map_err(|e|e.to_string())?;let q=panel.outer_size().map_err(|e|e.to_string())?;let target=window_layout::beside(Rect{x:p.x,y:p.y,width:s.width as i32,height:s.height as i32},q.width as i32,q.height as i32,area,(16.*scale) as i32);panel.set_position(PhysicalPosition::new(target.x,target.y)).map_err(|e|e.to_string())?;}}Ok(())
}
pub fn show(app:&tauri::AppHandle,visible:bool)->Result<(),String>{let state=app.state::<AppState>();let mut v=state.visibility.lock().map_err(|_|"窗口状态锁失败")?;v.manual_hidden=!visible;v.auto_hidden=false;v.fullscreen_override=visible;if let Some(pet)=app.get_webview_window("pet"){if visible{pet.unminimize().map_err(|e|e.to_string())?;pet.show().map_err(|e|e.to_string())?;}else{pet.hide().map_err(|e|e.to_string())?;}}Ok(())}
pub fn renderer_ready(app:&tauri::AppHandle)->Result<(),String>{app.state::<AppState>().ready.store(true,Ordering::Release);visibility_tick(app)}
fn desired_hidden(manual:bool,fullscreen:bool,override_fullscreen:bool,dragging:bool)->bool{manual||(fullscreen&&!override_fullscreen&&!dragging)}
pub fn visibility_tick(app:&tauri::AppHandle)->Result<(),String>{
 let state=app.state::<AppState>();if !state.ready.load(Ordering::Acquire){return Ok(());}let p=state.prefs.lock().unwrap_or_else(|x|x.into_inner()).clone();let full=p.fullscreen_hide&&crate::platform::fullscreen(app,&p);let mut v=state.visibility.lock().unwrap_or_else(|x|x.into_inner());
 if !full{v.fullscreen_override=false;}let hidden=desired_hidden(v.manual_hidden,full,v.fullscreen_override,state.dragging.load(Ordering::Acquire));
 if let Some(w)=app.get_webview_window("pet"){if hidden{if w.is_visible().unwrap_or(false){w.hide().map_err(|e|e.to_string())?;}}else if !w.is_visible().unwrap_or(false){w.show().map_err(|e|e.to_string())?;}}v.auto_hidden=hidden&&!v.manual_hidden;Ok(())
}
pub fn save_current(app:&tauri::AppHandle)->Result<(),String>{let pet=app.get_webview_window("pet").ok_or("桌宠窗口不存在")?;let p=pet.outer_position().map_err(|e|e.to_string())?;let state=app.state::<AppState>();let mut saved=state.saved.lock().map_err(|_|"位置锁失败")?;let current=Some(Position{x:p.x,y:p.y});if saved.last!=current{saved.last=current;persist(app,&saved)?;}Ok(())}
pub fn snap_axis(value:i32,start:i32,length:i32,size:i32,distance:i32)->i32{let end=start+(length-size).max(0);let v=value.clamp(start,end);if v-start<=distance{start}else if end-v<=distance{end}else{v}}
pub fn finish_drag(app:&tauri::AppHandle)->Result<(),String>{
 let state=app.state::<AppState>();state.dragging.store(false,Ordering::Release);let pet=app.get_webview_window("pet").ok_or("桌宠窗口不存在")?;let p=pet.outer_position().map_err(|e|e.to_string())?;place(app,Some(Position{x:p.x,y:p.y}))?;
 let snap=state.prefs.lock().unwrap_or_else(|x|x.into_inner()).edge_snap;if snap{if let Some((a,scale))=work(&pet)?{let p=pet.outer_position().map_err(|e|e.to_string())?;let s=pet.outer_size().map_err(|e|e.to_string())?;let d=(24.*scale) as i32;pet.set_position(PhysicalPosition::new(snap_axis(p.x,a.x,a.width,s.width as i32,d),snap_axis(p.y,a.y,a.height,s.height as i32,d))).map_err(|e|e.to_string())?;}}save_current(app)
}
#[tauri::command]pub fn list_positions(app:tauri::AppHandle)->Vec<bool>{app.state::<AppState>().saved.lock().unwrap_or_else(|x|x.into_inner()).slots.iter().map(Option::is_some).collect()}
#[tauri::command]pub fn save_position(app:tauri::AppHandle,slot:usize)->Result<(),String>{if slot>=3{return Err("位置编号无效".into());}let pet=app.get_webview_window("pet").ok_or("桌宠窗口不存在")?;let p=pet.outer_position().map_err(|e|e.to_string())?;let state=app.state::<AppState>();let mut saved=state.saved.lock().map_err(|_|"位置锁失败")?;saved.slots[slot]=Some(Position{x:p.x,y:p.y});persist(&app,&saved)}
#[tauri::command]pub fn restore_position(app:tauri::AppHandle,slot:usize)->Result<(),String>{if slot>=3{return Err("位置编号无效".into());}let pos=app.state::<AppState>().saved.lock().map_err(|_|"位置锁失败")?.slots[slot].ok_or("这个位置尚未保存")?;place(&app,Some(pos))?;show(&app,true)?;save_current(&app)}
pub fn watch(app:tauri::AppHandle){std::thread::spawn(move||loop{
 let state=app.state::<AppState>();
 #[cfg(windows)]{let down=unsafe{windows_sys::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState(1)} as u16&0x8000!=0;if !down&&state.dragging.load(Ordering::Acquire){let _=finish_drag(&app);}if !down{state.menu_dragging.store(false,Ordering::Release);}}
 let _=visibility_tick(&app);if !state.dragging.load(Ordering::Acquire){let _=save_current(&app);}std::thread::sleep(Duration::from_millis(300));
});}
#[cfg(test)]mod tests{use super::*;#[test]fn snap_respects_negative_monitors_and_oversized_windows(){assert_eq!(snap_axis(-1000,-1920,1920,420,24),-1000);assert_eq!(snap_axis(-12,-1920,1920,420,24),-420);assert_eq!(snap_axis(200,100,200,420,24),100);}#[test]fn manual_hide_wins_while_fullscreen_drag_and_override_are_independent(){for full in [true,false]{for dragging in [true,false]{assert!(desired_hidden(true,full,true,dragging));}}assert!(desired_hidden(false,true,false,false));assert!(!desired_hidden(false,false,false,false));assert!(!desired_hidden(false,true,true,false));assert!(!desired_hidden(false,true,false,true));}}
