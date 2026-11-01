export function libraryFile(blob:Blob){
 return new File([blob],`MooSic-library-${new Date().toISOString().slice(0,10)}.zip`,{type:'application/zip'})
}
export function canShareLibrary(file:File){
 try{return typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[file]})}catch{return false}
}
export function downloadLibrary(file:File){
 const url=URL.createObjectURL(file),link=document.createElement('a')
 link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000)
}
