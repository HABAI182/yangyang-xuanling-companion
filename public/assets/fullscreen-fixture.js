document.getElementById('exit').onclick=()=>window.__TAURI_INTERNALS__.invoke('exit_fixture');
document.onkeydown=e=>{if(e.key==='Escape')window.__TAURI_INTERNALS__.invoke('exit_fixture');};
