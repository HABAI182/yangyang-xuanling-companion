// Physical-pixel layout supports negative monitor coordinates and DPI scaling.
#[derive(Clone,Copy,Debug,PartialEq)]
pub struct Rect {pub x:i32,pub y:i32,pub width:i32,pub height:i32}
pub fn menu_height(requested:f64,available:f64)->Option<f64>{
    if !requested.is_finite()||!available.is_finite()||available<=0.{return None;}
    Some(requested.ceil().clamp(180_f64.min(available),960_f64.min(available)))
}

pub fn fit(mut window:Rect,work:Rect)->Rect{
    window.x=window.x.clamp(work.x,work.x+(work.width-window.width).max(0));
    window.y=window.y.clamp(work.y,work.y+(work.height-window.height).max(0));
    window
}
pub fn corner(work:Rect,width:i32,height:i32,margin:i32)->Rect{
    fit(Rect{x:work.x+work.width-width-margin,y:work.y+work.height-height-margin,width,height},work)
}
fn overlap(a:Rect,b:Rect)->i64{
    let width=((a.x+a.width).min(b.x+b.width)-a.x.max(b.x)).max(0);
    let height=((a.y+a.height).min(b.y+b.height)-a.y.max(b.y)).max(0);
    width as i64*height as i64
}
pub fn beside(pet:Rect,width:i32,height:i32,work:Rect,gap:i32)->Rect{
    [(pet.x-width-gap,pet.y+pet.height-height),(pet.x+pet.width+gap,pet.y+pet.height-height),
     (pet.x+pet.width-width,pet.y-height-gap),(pet.x+pet.width-width,pet.y+pet.height+gap)]
        .map(|(x,y)|fit(Rect{x,y,width,height},work)).into_iter().min_by_key(|candidate|overlap(*candidate,pet)).unwrap()
}

#[cfg(test)]mod tests{
    use super::*;
    #[test]fn menu_content_fits_work_area_and_rejects_invalid_measurements(){
        assert_eq!(menu_height(453.2,1000.),Some(454.));assert_eq!(menu_height(620.,510.),Some(510.));
        assert_eq!(menu_height(360.,140.),Some(140.));assert_eq!(menu_height(f64::NAN,900.),None);
        assert_eq!(menu_height(450.,0.),None);
    }
    #[test]fn settings_leave_pet_visible_on_scaled_and_negative_monitors(){
        for work in [Rect{x:0,y:0,width:1920,height:1040},Rect{x:-2560,y:-160,width:2560,height:1400}]{
            for scale in [1,2]{
                let pet=corner(work,420*scale,430*scale,24*scale);
                let settings=beside(pet,440*scale,651*scale,work,16*scale);
                assert_eq!(fit(pet,work),pet);
                assert_eq!(fit(settings,work),settings);
                if scale==1{assert_eq!(overlap(pet,settings),0);}
                assert!(overlap(pet,settings)<pet.width as i64*pet.height as i64,"settings must not completely cover the pet");
            }
        }
    }
    #[test]fn small_work_area_does_not_panic_when_window_is_larger(){
        let work=Rect{x:100,y:100,width:300,height:300};
        assert_eq!(corner(work,420,430,24).x,100);
        assert_eq!(corner(work,420,430,24).y,100);
    }
}
