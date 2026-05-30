'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface UMetric { score:number; desempeno_score:number; comportamiento_score:number; incidencias_score:number; ingresoReal:number; metaMensual:number; }
interface Proveedor { nombre:string; categoria:string; estado:'verde'|'amarillo'|'rojo'; nota:string; }

const UNIDADES=[{id:'la-cruz',nombre:'La Cruz',emoji:'☕'},{id:'oaxaca-manana',nombre:'Oaxaca Mañana',emoji:'🌅'},{id:'oaxaca-vespertino',nombre:'Oaxaca Vespertino',emoji:'🌇'},{id:'ixtlan-del-rio',nombre:'Ixtlán del Río',emoji:'🏔️'},{id:'panaderia',nombre:'Panadería',emoji:'🥐'}];

function sc(s:number){return s>=80?'#10b981':s>=60?'#d97706':'#ef4444';}
function slabel(s:number){return s>=90?'Excelente':s>=80?'Muy bien':s>=70?'Bien':s>=60?'Regular':'Requiere atención';}
function fmt(n:number){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(n||0);}

function ReporteContent(){
  const router=useRouter();
  const params=useSearchParams();
  const periodo=params.get('periodo')||new Date().toISOString().slice(0,7);
  const [metrics,setMetrics]=useState<Record<string,UMetric|null>>({});
  const [proveedores,setProveedores]=useState<Proveedor[]>([]);
  const [loading,setLoading]=useState(true);

  const load=useCallback(async()=>{
    const [mResults,pRes]=await Promise.all([
      Promise.all(UNIDADES.map(async u=>{
        try{const r=await fetch(`/api/piloncillo/evaluaciones-gerencia?unidad=${u.id}&periodo=${periodo}`);const j=await r.json();return{id:u.id,m:j.latest as UMetric|null};}catch{return{id:u.id,m:null};}
      })),
      fetch('/api/piloncillo/proveedores').then(r=>r.json()).catch(()=>({data:[]})),
    ]);
    const map:Record<string,UMetric|null>={};
    mResults.forEach(r=>{map[r.id]=r.m;});
    setMetrics(map);
    setProveedores(pRes.data||[]);
    setLoading(false);
  },[periodo]);

  useEffect(()=>{load();},[load]);

  const scores=UNIDADES.map(u=>metrics[u.id]?.score).filter((s):s is number=>s!=null);
  const promedio=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
  const ingresoTotal=UNIDADES.reduce((a,u)=>a+(metrics[u.id]?.ingresoReal||0),0);
  const metaTotal=UNIDADES.reduce((a,u)=>a+(metrics[u.id]?.metaMensual||0),0);
  const fechaGen=new Date().toLocaleDateString('es-MX',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  return(
    <div className="min-h-screen bg-white">
      {/* Barra acciones - solo pantalla */}
      <div className="print:hidden bg-stone-900 text-white px-4 py-3 flex items-center justify-between">
        <button onClick={()=>router.back()} className="text-stone-400 hover:text-white text-sm">← Volver</button>
        <span className="text-sm font-medium">Reporte {periodo}</span>
        <button onClick={()=>window.print()} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium">📄 Guardar PDF</button>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 print:px-8 print:py-6">
        {/* Header reporte */}
        <div className="border-b-2 border-stone-900 pb-4 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-black text-stone-900">🍬 Piloncillo</div>
              <div className="text-stone-500 text-sm mt-1">Reporte ejecutivo mensual</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-stone-700">{periodo}</div>
              <div className="text-xs text-stone-400 mt-1">Generado: {fechaGen}</div>
            </div>
          </div>
        </div>

        {loading?(
          <div className="text-center py-16 text-stone-400">Cargando datos...</div>
        ):(
          <>
            {/* KPIs globales */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                {label:'Score global',val:promedio,unit:'/ 100',color:sc(promedio)},
                {label:'Ingresos totales',val:fmt(ingresoTotal),unit:''},
                {label:'Meta global',val:metaTotal>0?`${Math.round((ingresoTotal/metaTotal)*100)}%`:'N/A',unit:'logrado'},
              ].map(({label,val,unit,color})=>(
                <div key={label} className="border border-stone-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black" style={color?{color}:{}}>{val}</div>
                  {unit&&<div className="text-xs text-stone-400">{unit}</div>}
                  <div className="text-xs text-stone-500 mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Unidades */}
            <h2 className="font-bold text-stone-800 mb-3 text-sm uppercase tracking-wide">Desempeño por unidad</h2>
            <div className="space-y-3 mb-8">
              {[...UNIDADES].sort((a,b)=>(metrics[b.id]?.score??-1)-(metrics[a.id]?.score??-1)).map(u=>{
                const m=metrics[u.id];
                const pct=m&&m.metaMensual>0?Math.round((m.ingresoReal/m.metaMensual)*100):0;
                return(
                  <div key={u.id} className="border border-stone-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{u.emoji}</span>
                        <div>
                          <div className="font-bold text-stone-800 text-sm">{u.nombre}</div>
                          {m&&<div className="text-xs text-stone-400">{slabel(m.score)}</div>}
                        </div>
                      </div>
                      <div className="text-right">
                        {m?<div className="text-2xl font-black" style={{color:sc(m.score)}}>{m.score}</div>:<div className="text-stone-300 text-sm">Sin evaluación</div>}
                      </div>
                    </div>
                    {m&&(
                      <>
                        <div className="flex gap-4 text-xs text-stone-500 mb-2">
                          <span>Desempeño <strong>{m.desempeno_score}</strong></span>
                          <span>Comportamiento <strong>{m.comportamiento_score}</strong></span>
                          <span>Asistencia <strong>{m.incidencias_score}</strong></span>
                        </div>
                        {m.metaMensual>0&&(
                          <div className="flex justify-between text-xs">
                            <span className="text-stone-400">{fmt(m.ingresoReal)} de {fmt(m.metaMensual)}</span>
                            <span className="font-bold" style={{color:sc(pct>=100?80:pct>=80?70:50)}}>{pct}% logrado</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Proveedores */}
            {proveedores.length>0&&(
              <>
                <h2 className="font-bold text-stone-800 mb-3 text-sm uppercase tracking-wide">Estado de proveedores</h2>
                <div className="space-y-2 mb-8">
                  {[...proveedores].sort((a,b)=>({'rojo':0,'amarillo':1,'verde':2}[a.estado]-{'rojo':0,'amarillo':1,'verde':2}[b.estado])).map((p,i)=>{
                    const dot=p.estado==='verde'?'🟢':p.estado==='amarillo'?'🟡':'🔴';
                    return(
                      <div key={i} className="flex items-center gap-3 border border-stone-100 rounded-lg px-4 py-2.5">
                        <span>{dot}</span>
                        <div className="flex-1">
                          <span className="font-semibold text-stone-800 text-sm">{p.nombre}</span>
                          {p.categoria&&<span className="text-stone-400 text-xs ml-2">{p.categoria}</span>}
                        </div>
                        {p.nota&&<span className="text-xs text-stone-400 italic">{p.nota}</span>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="border-t border-stone-200 pt-4 text-center text-xs text-stone-400">
              Reporte generado por KAII · Piloncillo · {fechaGen}
            </div>
          </>
        )}
      </div>

      <style>{`@media print{.print\\:hidden{display:none!important;}body{-webkit-print-color-adjust:exact;}}`}</style>
    </div>
  );
}

export default function ReportePage(){
  return(
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-stone-400">Cargando reporte...</div>}>
      <ReporteContent/>
    </Suspense>
  );
}
