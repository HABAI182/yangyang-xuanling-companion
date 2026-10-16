//! Fixed physical VK map. No text or input history; only current held ordering.
#[derive(Clone,Copy,Debug,PartialEq)]pub struct Target {pub x:f32,pub y:f32,pub zone:&'static str}
pub fn target(k:usize)->Target{
 if k==32{return Target{x:-0.25,y:0.,zone:"space"};}
 let left=matches!(k,49..=53|65..=71|81..=84|86|87|88|90|91|160|162|164|9|20|27|192|112..=116);
 let near=matches!(k,65|83|68|70|71|72|74..=76|90|88|67|86|66|78|77|13|20|160..=165|91..=93|186|188..=191|222|35|34|37|39|40|45|46|96..=102|107|110|19|44|145);
 let zone=match (left,near){(true,false)=>"left-far",(false,false)=>"right-far",(true,true)=>"left-near",(false,true)=>"right-near"};
 Target{x:if left{0.65}else{-0.85},y:if near{0.35}else{1.},zone}
}
pub fn update_order(order:&mut Vec<usize>,held:&[bool;256],pressed:&[usize])->Option<usize>{
 order.retain(|k|held[*k]);
 for k in pressed{order.retain(|old|old!=k);order.push(*k);}
 order.last().copied()
}
#[cfg(test)]mod tests{
 use super::*;
 #[test]fn four_zones_and_space(){for(k,zone)in [(81,"left-far"),(65,"left-near"),(85,"right-far"),(72,"right-near"),(32,"space")]{assert_eq!(target(k).zone,zone);}assert!(target(81).x>target(85).x);assert!(target(81).y>target(65).y);}
 #[test]fn extended_physical_keys_have_consistent_rows(){for(k,zone)in [(27,"left-far"),(222,"right-near"),(38,"right-far"),(40,"right-near"),(105,"right-far"),(96,"right-near"),(91,"left-near"),(117,"right-far")]{assert_eq!(target(k).zone,zone,"VK {k}");}}
 #[test]fn space_release_resumes_latest_still_held_without_repeats_reordering(){let mut o=vec![];let mut h=[false;256];h[65]=true;assert_eq!(update_order(&mut o,&h,&[65]),Some(65));h[32]=true;assert_eq!(update_order(&mut o,&h,&[32]),Some(32));assert_eq!(update_order(&mut o,&h,&[]),Some(32));h[32]=false;assert_eq!(update_order(&mut o,&h,&[]),Some(65));h[65]=false;assert_eq!(update_order(&mut o,&h,&[]),None);}
}
