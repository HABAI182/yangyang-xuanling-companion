"""Route real Windows mouse messages through the packaged pet to our fixture.

Uses a disposable receiver behind the pet, not an unrelated desktop app.
The pointer position is restored and the receiver removed on every exit.
This is synthetic native input acceptance, not a human-input claim.
"""
import argparse,ctypes as c,json,time,threading
from ctypes import wintypes as w
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--pid',type=int,required=True);p.add_argument('--points',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
u=c.WinDLL('user32',use_last_error=True);k=c.WinDLL('kernel32',use_last_error=True)
u.SetProcessDPIAware()
LRESULT=c.c_ssize_t;WPARAM=c.c_size_t;LPARAM=c.c_ssize_t
PROC=c.WINFUNCTYPE(LRESULT,w.HWND,w.UINT,WPARAM,LPARAM)
class WNDCLASS(c.Structure):
 _fields_=[('style',w.UINT),('lpfnWndProc',PROC),('cbClsExtra',c.c_int),('cbWndExtra',c.c_int),('hInstance',w.HINSTANCE),('hIcon',w.HICON),('hCursor',w.HANDLE),('hbrBackground',w.HBRUSH),('lpszMenuName',w.LPCWSTR),('lpszClassName',w.LPCWSTR)]
class MOUSEINPUT(c.Structure):
 _fields_=[('dx',w.LONG),('dy',w.LONG),('mouseData',w.DWORD),('dwFlags',w.DWORD),('time',w.DWORD),('dwExtraInfo',c.c_size_t)]
class INPUT_UNION(c.Union):
 _fields_=[('mi',MOUSEINPUT),('pad',c.c_byte*32)]
class INPUT(c.Structure):
 _fields_=[('type',w.DWORD),('u',INPUT_UNION)]
u.DefWindowProcW.argtypes=[w.HWND,w.UINT,WPARAM,LPARAM];u.DefWindowProcW.restype=LRESULT
u.CreateWindowExW.argtypes=[w.DWORD,w.LPCWSTR,w.LPCWSTR,w.DWORD,c.c_int,c.c_int,c.c_int,c.c_int,w.HWND,w.HMENU,w.HINSTANCE,c.c_void_p];u.CreateWindowExW.restype=w.HWND
u.GetAncestor.argtypes=[w.HWND,w.UINT];u.GetAncestor.restype=w.HWND
u.WindowFromPoint.argtypes=[w.POINT];u.WindowFromPoint.restype=w.HWND
u.SetWindowPos.argtypes=[w.HWND,w.HWND,c.c_int,c.c_int,c.c_int,c.c_int,w.UINT]
u.SendInput.argtypes=[w.UINT,c.POINTER(INPUT),c.c_int]
k.GetModuleHandleW.argtypes=[w.LPCWSTR];k.GetModuleHandleW.restype=w.HMODULE
u.DestroyWindow.argtypes=[w.HWND]
u.GetWindowRect.argtypes=[w.HWND,c.POINTER(w.RECT)]
u.GetWindowThreadProcessId.argtypes=[w.HWND,c.POINTER(w.DWORD)]
u.IsWindowVisible.argtypes=[w.HWND]
u.GetWindowTextW.argtypes=[w.HWND,w.LPWSTR,c.c_int]
u.PostMessageW.argtypes=[w.HWND,w.UINT,WPARAM,LPARAM]
u.RegisterClassW.argtypes=[c.POINTER(WNDCLASS)]
u.GetCursorPos.argtypes=[c.POINTER(w.POINT)]
windows=[]
@c.WINFUNCTYPE(w.BOOL,w.HWND,LPARAM)
def enum(hwnd,_):
 pid=w.DWORD();u.GetWindowThreadProcessId(hwnd,c.byref(pid))
 if pid.value==a.pid and u.IsWindowVisible(hwnd):
  title=c.create_unicode_buffer(256);u.GetWindowTextW(hwnd,title,256)
  if '制作预览' in title.value:windows.append(hwnd)
 return True
u.EnumWindows(enum,0);assert len(windows)==1,windows
pet=windows[0];rect=w.RECT();assert u.GetWindowRect(pet,c.byref(rect));width=rect.right-rect.left;height=rect.bottom-rect.top
old=w.POINT();u.GetCursorPos(c.byref(old));points=json.loads(a.points.read_text(encoding='utf-8'));received=[];ready=threading.Event();receiver=[None]
@PROC
def procedure(hwnd,msg,wp,lp):
 if msg==0x201:received.append([lp&65535,(lp>>16)&65535]);return 0
 if msg==0x10:u.DestroyWindow(hwnd);return 0
 if msg==2:u.PostQuitMessage(0);return 0
 return u.DefWindowProcW(hwnd,msg,wp,lp)
def message_loop():
 wc=WNDCLASS();wc.lpfnWndProc=procedure;wc.hInstance=k.GetModuleHandleW(None);wc.hbrBackground=w.HBRUSH(6);wc.lpszClassName='YangyangTransparentClickFixture'
 assert u.RegisterClassW(c.byref(wc))
 hwnd=u.CreateWindowExW(0x08000000|8,wc.lpszClassName,'秧秧 · 临时穿透测试',0x80000000|0x10000000,rect.left,rect.top,width,height,None,None,wc.hInstance,None)
 assert hwnd;receiver[0]=hwnd
 u.SetWindowPos(pet,w.HWND(-1),0,0,0,0,0x1|0x2|0x10);ready.set()
 msg=w.MSG()
 while u.GetMessageW(c.byref(msg),None,0,0)>0:u.TranslateMessage(c.byref(msg));u.DispatchMessageW(c.byref(msg))
thread=threading.Thread(target=message_loop,daemon=True);thread.start();assert ready.wait(5)
report={'passed':False,'syntheticNativeInput':True,'results':[]}
try:
 for point in points:
  x=round(point['x']*width);y=round(point['y']*height);u.SetCursorPos(rect.left+x,rect.top+y);time.sleep(.28)
  hit=u.WindowFromPoint(w.POINT(rect.left+x,rect.top+y));root=u.GetAncestor(hit,2);expected=receiver[0] if point['through'] else pet
  actual=w.POINT();u.GetCursorPos(c.byref(actual))
  row={**point,'rootMatches':root==expected,'pointerStayedAtProbe':abs(actual.x-rect.left-x)<=1 and abs(actual.y-rect.top-y)<=1,'receiverClick':None}
  assert row['pointerStayedAtProbe'],'External pointer movement interrupted the native probe'
  title=c.create_unicode_buffer(256);u.GetWindowTextW(root,title,256)
  assert root==expected,(point,root,title.value,expected,pet)
  if point.get('click',True):
   before=len(received);events=(INPUT*2)();events[0].u.mi.dwFlags=2;events[1].u.mi.dwFlags=4
   assert u.SendInput(2,events,c.sizeof(INPUT))==2,c.get_last_error();time.sleep(.18)
   row['receiverClick']=len(received)>before;assert row['receiverClick']==point['through'],row
  report['results'].append(row)
 report['passed']=True
finally:
 u.SetCursorPos(old.x,old.y)
 if receiver[0]:u.PostMessageW(receiver[0],0x10,0,0)
 thread.join(3);a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
