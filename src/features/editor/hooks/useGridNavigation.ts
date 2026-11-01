import { useState,type KeyboardEvent } from 'react'
export function useGridNavigation(rows:number,columns:number){
 const [cell,setCell]=useState(0)
 const current=Math.min(cell,rows*columns-1)
 return (row:number,column:number)=>({
  tabIndex:row*columns+column===current?0:-1,
  'data-grid-cell':row*columns+column,
  onFocus:()=>setCell(row*columns+column),
  onKeyDown:(e:KeyboardEvent<HTMLButtonElement>)=>{
   let next=row*columns+column
   if(e.key==='ArrowLeft')next=row*columns+Math.max(0,column-1)
   else if(e.key==='ArrowRight')next=row*columns+Math.min(columns-1,column+1)
   else if(e.key==='ArrowUp')next=Math.max(0,row-1)*columns+column
   else if(e.key==='ArrowDown')next=Math.min(rows-1,row+1)*columns+column
   else if(e.key==='Home')next=e.ctrlKey?0:row*columns
   else if(e.key==='End')next=e.ctrlKey?rows*columns-1:(row+1)*columns-1
   else return
   e.preventDefault();setCell(next);e.currentTarget.closest('table')?.querySelector<HTMLButtonElement>(`[data-grid-cell="${next}"]`)?.focus()
  }
 })
}
