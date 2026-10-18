use crate::preferences::Preferences;

pub const BASIC:bool=cfg!(feature="edition-basic");
pub const NAME:&str=if BASIC{"basic"}else{"full"};
pub fn action_allowed(action:&str)->bool{!BASIC||action=="default"}
pub fn restrict(p:&mut Preferences){
 if BASIC{
  p.bubbles_enabled=false;p.touch_enabled=false;p.idle_seconds=0;p.sleep_minutes=0;
  for slot in &mut p.shortcuts{slot.enabled=false;}
 }
}

#[cfg(test)]mod tests{
 use super::*;
 #[test]fn edition_controls_actions_and_restored_preferences(){
  let mut p=Preferences::default();p.shortcuts[0].enabled=true;restrict(&mut p);
  assert_eq!(p.bubbles_enabled,!BASIC);assert_eq!(p.touch_enabled,!BASIC);
  assert_eq!(p.shortcuts[0].enabled,!BASIC);assert_eq!(action_allowed("smile"),!BASIC);
  assert!(action_allowed("default"));assert!(p.input_enabled&&p.show_keys&&p.cursor_follow);
  assert_eq!(p.size,420.);assert_eq!(p.gaze_idle_seconds,3.);
 }
}
