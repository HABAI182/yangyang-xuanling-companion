// Only an alpha silhouette is retained. Polling is native and independent of
// WebView pointer events, so the pet can become interactive again after the
// cursor has passed through a transparent part of its rectangle.
#[derive(Default)]
pub struct HitMask{pub width:u16,pub height:u16,pixels:Vec<u8>,pub updates:u64}
impl HitMask{
 pub fn replace(&mut self,width:u16,height:u16,runs:&[[u16;3]])->Result<(),String>{
  if !(1..=480).contains(&width)||!(1..=600).contains(&height)||runs.len()>30000{return Err("轮廓尺寸无效".into());}
  let mut previous=None;
  for &[y,x,end] in runs{
   if y>=height||x>=end||end>width||previous.is_some_and(|(py,pe)|y<py||(y==py&&x<pe)){return Err("轮廓行无效".into());}
   previous=Some((y,end));
  }
  let mut pixels=vec![0;width as usize*height as usize];
  for &[y,x,end] in runs{let row=y as usize*width as usize;pixels[row+x as usize..row+end as usize].fill(1);}
  self.width=width;self.height=height;self.pixels=pixels;self.updates+=1;Ok(())
 }
 pub fn contains(&self,x:i32,y:i32,width:u32,height:u32)->bool{
  if x<0||y<0||x>=width as i32||y>=height as i32||width==0||height==0||self.pixels.is_empty(){return false;}
  let mx=x as u64*self.width as u64/width as u64;let my=y as u64*self.height as u64/height as u64;
  self.pixels[(my*self.width as u64+mx) as usize]!=0
 }
}
pub fn ignore_cursor(full_through:bool,hit:bool,dragging:bool,button_held:bool,was_ignored:bool)->bool{
 if full_through{return true;}if dragging{return false;}
 // Keep the target chosen at mouse-down until release; never steal an active
 // drag or a held click from a different application as the cursor crosses us.
 if button_held{return was_ignored;}!hit
}
#[cfg(test)]mod tests{
 use super::*;
 #[test]fn alpha_holes_and_bottom_gutter_pass_at_any_dpi(){let mut m=HitMask::default();m.replace(8,6,&[[1,2,6],[2,2,3],[2,5,6],[3,2,6],[5,6,8]]).unwrap();assert!(!m.contains(40,20,80,60));assert!(m.contains(20,20,80,60));assert!(!m.contains(20,50,80,60));assert!(m.contains(60,50,80,60));assert!(m.contains(30,30,120,90));assert!(!m.contains(-1,0,80,60));assert!(!m.contains(80,60,80,60));assert!(!m.contains(0,0,0,0));}
 #[test]fn malformed_update_does_not_destroy_previous_mask(){let mut m=HitMask::default();m.replace(2,2,&[[0,0,1]]).unwrap();assert!(m.replace(2,2,&[[0,0,3]]).is_err());assert!(m.replace(2,2,&[[1,0,1],[0,0,1]]).is_err());assert!(m.contains(0,0,2,2));}
 #[test]fn transparent_hit_and_mouse_capture_are_independent(){assert!(ignore_cursor(false,false,false,false,false));assert!(!ignore_cursor(false,true,false,false,true));assert!(!ignore_cursor(false,false,true,true,false));assert!(ignore_cursor(true,true,true,true,false));assert!(ignore_cursor(false,true,false,true,true));assert!(!ignore_cursor(false,false,false,true,false));}
}
