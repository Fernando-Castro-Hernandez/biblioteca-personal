import { useCallback, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { toast } from 'sonner';
import type { ReaderState } from './storage';
import { createMarkupHistory, type Markup } from './drawings';

export function useMarkupHistory(state:RefObject<ReaderState>,setState:Dispatch<SetStateAction<ReaderState>>) {
  const history=useRef(createMarkupHistory());
  const [,refresh]=useState(0);
  const apply=useCallback((markup:Markup)=>{
    state.current={...state.current,...markup};
    setState(s=>({...s,...markup}));refresh(n=>n+1);
  },[setState,state]);
  const commit=useCallback((change:(s:Markup)=>Markup)=>{
    const before={annotations:state.current.annotations,drawings:state.current.drawings};
    const next=change(before);
    if(next.annotations===before.annotations&&next.drawings===before.drawings)return;
    toast.dismiss('markup-action');history.current.record(before);apply(next);
  },[state,apply]);
  const undo=useCallback(()=>{
    const previous=history.current.undo({annotations:state.current.annotations,drawings:state.current.drawings});
    if(previous){toast.dismiss('markup-action');apply(previous);}
  },[state,apply]);
  const redo=useCallback(()=>{
    const next=history.current.redo({annotations:state.current.annotations,drawings:state.current.drawings});
    if(next){toast.dismiss('markup-action');apply(next);}
  },[state,apply]);
  return {commit,undo,redo,canUndo:history.current.canUndo,canRedo:history.current.canRedo};
}
