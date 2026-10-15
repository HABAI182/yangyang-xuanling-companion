use std::sync::atomic::{AtomicBool,Ordering};
static BUSY:AtomicBool=AtomicBool::new(false);
fn wave(volume:f64)->Vec<u8>{
 let rate=22050u32;let samples=1102u32;let bytes=samples*2;let mut out=vec![];
 out.extend(b"RIFF");out.extend((36+bytes).to_le_bytes());out.extend(b"WAVEfmt ");out.extend(16u32.to_le_bytes());out.extend(1u16.to_le_bytes());out.extend(1u16.to_le_bytes());out.extend(rate.to_le_bytes());out.extend((rate*2).to_le_bytes());out.extend(2u16.to_le_bytes());out.extend(16u16.to_le_bytes());out.extend(b"data");out.extend(bytes.to_le_bytes());
 for i in 0..samples{let t=i as f64/rate as f64;let envelope=(1.-i as f64/samples as f64).powi(3);let tone=(t*880.*std::f64::consts::TAU).sin()*0.75+(t*1320.*std::f64::consts::TAU).sin()*0.25;out.extend(((tone*envelope*volume.clamp(0.,1.)*6000.) as i16).to_le_bytes());}out
}
pub fn play(volume:f64){if volume<=0.||BUSY.swap(true,Ordering::AcqRel){return;}std::thread::spawn(move||{
 #[cfg(windows)]unsafe{use windows_sys::Win32::Media::Audio::*;let buffer=wave(volume);PlaySoundW(buffer.as_ptr() as *const u16,std::ptr::null_mut(),SND_MEMORY|SND_SYNC|SND_NODEFAULT);}
 BUSY.store(false,Ordering::Release);
});}
#[cfg(test)]mod tests{#[test]fn generated_wave_is_bounded_pcm_without_external_assets(){let w=super::wave(0.25);assert_eq!(&w[..4],b"RIFF");assert_eq!(&w[8..12],b"WAVE");assert_eq!(w.len(),2248);}}
