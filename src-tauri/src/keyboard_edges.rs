// Retain very short press edges between 8 ms state samples. The callback only
// updates fixed atomic state and always passes input to the next hook; it never
// records text, stores an event history, blocks input, or calls into the WebView.
use std::sync::atomic::{AtomicBool, Ordering};
use windows_sys::Win32::{Foundation::{LPARAM,LRESULT,WPARAM}, UI::WindowsAndMessaging::*};

static DOWN:[AtomicBool;256]=[const {AtomicBool::new(false)};256];
static PRESS:[AtomicBool;256]=[const {AtomicBool::new(false)};256];
static REPEAT:[AtomicBool;256]=[const {AtomicBool::new(false)};256];
static ACTIVE:AtomicBool=AtomicBool::new(false);

fn transition(key:usize,down:bool){
    if key>=256{return;}
    let previous=DOWN[key].swap(down,Ordering::AcqRel);
    if down&&!previous{PRESS[key].store(true,Ordering::Release);}
    if down&&previous{REPEAT[key].store(true,Ordering::Release);}
}
pub fn take_press(key:usize)->bool{PRESS[key].swap(false,Ordering::AcqRel)}
pub fn take_repeat(key:usize)->bool{REPEAT[key].swap(false,Ordering::AcqRel)}
pub fn active()->bool{ACTIVE.load(Ordering::Acquire)}

unsafe extern "system" fn callback(code:i32,message:WPARAM,data:LPARAM)->LRESULT{
    if code==HC_ACTION as i32{
        let key=(*(data as *const KBDLLHOOKSTRUCT)).vkCode as usize;
        match message as u32{WM_KEYDOWN|WM_SYSKEYDOWN=>transition(key,true),WM_KEYUP|WM_SYSKEYUP=>transition(key,false),_=>{}}
    }
    CallNextHookEx(std::ptr::null_mut(),code,message,data)
}
pub fn start(){std::thread::spawn(||unsafe{
    let module=windows_sys::Win32::System::LibraryLoader::GetModuleHandleW(std::ptr::null());
    let hook=SetWindowsHookExW(WH_KEYBOARD_LL,Some(callback),module,0);
    if hook.is_null(){eprintln!("短按事件监听不可用；保留键盘状态采样");return;}
    ACTIVE.store(true,Ordering::Release);
    let mut msg:MSG=std::mem::zeroed();
    while GetMessageW(&mut msg,std::ptr::null_mut(),0,0)>0{TranslateMessage(&msg);DispatchMessageW(&msg);}
    ACTIVE.store(false,Ordering::Release);UnhookWindowsHookEx(hook);
});}

#[cfg(test)]
mod tests{
    use super::*;
    #[test]
    fn short_tap_survives_release_but_repeat_is_not_another_press(){
        let k=65;
        transition(k,true);transition(k,true);transition(k,false);
        assert!(take_press(k),"down and up between samples must remain observable");
        assert!(!take_press(k),"a consumed edge must not retrigger");
        transition(k,true);assert!(take_press(k));
        transition(k,true);assert!(!take_press(k),"OS autorepeat must not restart bounce");
        assert!(take_repeat(k),"repeat may drive the optional display only");
        assert!(!take_repeat(k),"display repeat is consumed independently");
        transition(k,false);transition(k,true);assert!(take_press(k),"a real repress must restart bounce");
        transition(k,false);
    }
}
