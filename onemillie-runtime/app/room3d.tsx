"use client";
import {useEffect,useRef,useState} from 'react';
import {createRoom} from '../lib/concept-scene.mjs';

export default function Room3D({view,motion,records,models=[],navigation=false,onReady,onError,onRecord,onTransition}:{view:string;motion:boolean;records:any[];models?:any[];navigation?:boolean;onReady:(ready:boolean)=>void;onError:(message:string)=>void;onRecord?:(id:string)=>void;onTransition?:(phase:string|null)=>void}){
  const canvas=useRef<HTMLCanvasElement>(null), engine=useRef<any>(null);
  const [ready,setReady]=useState(false);
  const callbacks=useRef({onReady,onError,onRecord,onTransition});callbacks.current={onReady,onError,onRecord,onTransition};
  useEffect(()=>{let disposed=false;createRoom(canvas.current!,{onError:(message:string)=>callbacks.current.onError(message),onRecord:(id:string)=>callbacks.current.onRecord?.(id),onTransition:(phase:string|null)=>callbacks.current.onTransition?.(phase)}).then(e=>{if(disposed){e?.destroy();return;}engine.current=e;setReady(!!e);callbacks.current.onReady(!!e);}).catch(error=>{console.error('3D scene unavailable',error);if(!disposed)callbacks.current.onError('De 3D-ruimte kon niet worden geladen.');});return()=>{disposed=true;engine.current?.destroy();engine.current=null;};},[]);
  useEffect(()=>{if(ready)engine.current?.setView(view);},[view,ready]);
  useEffect(()=>{if(ready)engine.current?.setMotion(motion);},[motion,ready]);
  useEffect(()=>{if(ready)engine.current?.setNavigation(navigation);},[navigation,ready]);
  useEffect(()=>{if(ready)engine.current?.setRecords(records).catch(()=>{callbacks.current.onTransition?.(null);callbacks.current.onError('Een platenhoes kon niet worden geladen.');});},[records,ready]);
  useEffect(()=>{if(ready)engine.current?.setModels(models);},[models,ready]);
  return <canvas ref={canvas} className={`room-canvas ${ready?'ready':''} ${navigation?'navigation-enabled':''}`} aria-label="3D-werkplaats" tabIndex={navigation?0:-1} />;
}
