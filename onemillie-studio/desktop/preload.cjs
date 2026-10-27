const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('studio',{
 catalog:()=>ipcRenderer.invoke('catalog'),load:()=>ipcRenderer.invoke('load'),save:(state,as)=>ipcRenderer.invoke('save',state,!!as),open:()=>ipcRenderer.invoke('open'),import:()=>ipcRenderer.invoke('import'),dirty:value=>ipcRenderer.invoke('dirty',!!value),ensureAsset:id=>ipcRenderer.invoke('ensure-asset',id),cancelDownload:id=>ipcRenderer.invoke('cancel-download',id),moreModels:()=>ipcRenderer.invoke('more-models'),
 onDownload:fn=>{ipcRenderer.on('download-progress',(_event,data)=>fn(data));},onAsset:fn=>{ipcRenderer.on('asset-imported',(_event,data)=>fn(data));}
});
contextBridge.exposeInMainWorld('onemillieSplats',{request:message=>ipcRenderer.invoke('splats:request',message),chooseVideo:()=>ipcRenderer.invoke('splats:choose-video'),openResult:item=>ipcRenderer.invoke('splats:open-result',item)});
