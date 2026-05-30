'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UnidadMetric { score:number; desempeno_score:number; comportamiento_score:number; incidencias_score:number; ingresoReal:number; metaMensual:number; periodo:string; }
interface Proveedor { id:string; nombre:string; categoria:string; estado:'verde'|'amarillo'|'rojo'; nota:string; }
interface Alerta { tipo:'score'|'proveedor'; mensaje:string; detalle:string; }

const UNIDADES=[{id:'la-cruz',nombre:'La Cruz',emoji:'☕',color:'from-amber-500 to-amber-400'},{id:'oaxaca-manana',nombre:'Oaxaca Mañana',emoji:'🌅',color:'from-orange-500 to-orange-400'},{id:'oaxaca-vespertino',nombre:'Oaxaca Vespertino',emoji:'🌇',color:'from-rose-500 to-rose-400'},{id:'ixtlan-del-rio',nombre:'Ixtlán del Río',emoji:'🏔️',color:'from-teal-500 to-teal-400'},{id:'panaderia',nombre:'Panadería',emoji:'🥐',color:'from-yellow-500 to-yellow-400'}];
const PERIODOS=(()=>{const p:string[]=[],now=new Date();for(let i=0;i<6;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1);p.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}return p;})();
const SEMAFORO={verde:{label:'En foco',dot:'bg-emerald-500',bg:'bg-emerald-50',text:'text-emerald-700',border:'border-emerald-200'},amarillo:{label:'Atención',dot:'bg-amber-500',bg:'bg-amber-50',text:'text-amber-700',border:'border-amber-200'},rojo:{label:'Crítico',dot:'bg-red-500',bg:'bg-red-50',text:'text-red-700',border:'border-red-200'}};

function sc(s:number){return s>=80?'text-emerald-600':s>=60?'text-amber-600':'text-red-500';}
function fmt(n:number){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(n);}

export default function DireccionPage(){
  const router=useRouter();
  const [tab,setTab]=useState<'resumen'|'unidades'|'proveedores'|'metas'>('resumen');
  const [periodo,setPeriodo]=useState(PERIODOS[0]);
  const [metrics,setMetrics]=useState<Record<string,UnidadMetric|null>>({});
  const [loading,setLoading]=useState(true);
  const [resumenIA,setResumenIA]=useState('');
  const [loadingIA,setLoadingIA]=useState(false);
  const [proveedores,setProveedores]=useState<Proveedor[]>([]);
  const [showProvForm,setShowProvForm]=useState(false);
  const [formProv,setFormProv]=useState<Omit<Proveedor,'id'>>({nombre:'',categoria:'',estado:'verde',nota:''});
  const [metas,setMetas]=useState<Record<string,number>>({});
  const [savingMetas,setSavingMetas]=useState(false);
  const [savedMetas,setSavedMetas]=useState(false);

  useEffect(()=>{
    if(typeof window!=='undefined'&&!sessionStorage.getItem('pillo_direccion')){
      router.push('/piloncillo-dashboard');
    }
  },[router]);

  const loadMetrics=useCallback(async()=>{
    setLoading(true);
    const results=await Promise.all(UNIDADES.map(async u=>{
      try{const res=await fetch(`/api/piloncillo/evaluaciones-gerencia?unidad=${u.id}&periodo=${periodo}`);const json=await res.json();return{id:u.id,m:json.latest as UnidadMetric|null};}catch{return{id:u.id,m:null};}
    }));
    const map:Record<string,UnidadMetric|null>={};
    results.forEach(r=>{map[r.id]=r.m;});
    setMetrics(map);
    setLoading(false);
  },[periodo]);

  const loadProveedores=useCallback(async()=>{
    try{const res=await fetch('/api/piloncillo/proveedores');const json=await res.json();setProveedores(json.data||[]);}catch{}
  },[]);

  useEffect(()=>{loadMetrics();},[loadMetrics]);
  useEffect(()=>{loadProveedores();},[loadProveedores]);
  useEffect(()=>{loadMetas();},[loadMetas]);

  // Alertas automáticas
  const alertas:Alerta[]=[
    ...UNIDADES.filter(u=>metrics[u.id]&&(metrics[u.id]?.score??100)<70)
      .map(u=>({tipo:'score' as const,mensaje:`⚠️ ${u.nombre}`,detalle:`Score ${metrics[u.id]?.score}/100 — requiere atención inmediata`})),
    ...proveedores.filter(p=>p.estado==='rojo')
      .map(p=>({tipo:'proveedor' as const,mensaje:`🔴 ${p.nombre}`,detalle:`${p.categoria||'Proveedor'} en estado crítico${p.nota?` · ${p.nota}`:''}`})),
  ];

  const generarResumen=async()=>{
    setLoadingIA(true);setResumenIA('');
    try{
      const res=await fetch('/api/piloncillo/resumen-direccion',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({periodo,unidades:UNIDADES.map(u=>({nombre:u.nombre,...(metrics[u.id]||{})})),proveedores:proveedores.map(p=>({nombre:p.nombre,estado:p.estado,categoria:p.categoria}))}),
      });
      const json=await res.json();
      setResumenIA(json.resumen||json.error||'No se pudo generar.');
    }catch{setResumenIA('Error de conexión.');}
    finally{setLoadingIA(false);}
  };

  const saveProveedor=async()=>{
    const res=await fetch('/api/piloncillo/proveedores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(formProv)});
    if(res.ok){setShowProvForm(false);setFormProv({nombre:'',categoria:'',estado:'verde',nota:''});loadProveedores();}
  };
  const deleteProveedor=async(id:string)=>{
    await fetch(`/api/piloncillo/proveedores?id=${id}`,{method:'DELETE'});loadProveedores();
  };

  const loadMetas=useCallback(async()=>{
    try{const res=await fetch(`/api/piloncillo/metas?periodo=${periodo}`);const json=await res.json();setMetas(json.unidades||{});}catch{}
  },[periodo]);

  const saveMetas=async()=>{
    setSavingMetas(true);
    try{
      const res=await fetch('/api/piloncillo/metas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({periodo,unidades:metas})});
      if(res.ok){setSavedMetas(true);setTimeout(()=>setSavedMetas(false),3000);}
    }finally{setSavingMetas(false);}
  };

  const scores=UNIDADES.map(u=>metrics[u.id]?.score).filter((s):s is number=>s!=null);
  const promedio=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
  const ingresoTotal=UNIDADES.reduce((a,u)=>a+(metrics[u.id]?.ingresoReal||0),0);
  const metaTotal=UNIDADES.reduce((a,u)=>a+(metrics[u.id]?.metaMensual||0),0);
  const provRojos=proveedores.filter(p=>p.estado==='rojo').length;
  const provAmarillos=proveedores.filter(p=>p.estado==='amarillo').length;

  return(
    <div className="min-h-screen bg-stone-50">
      <header className="bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900 text-white px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={()=>router.push('/piloncillo-dashboard')} className="text-amber-300/70 text-lg hover:text-white">←</button>
            <div className="text-2xl">🧭</div>
            <div className="flex-1">
              <h1 className="font-bold text-xl">Dirección</h1>
              <p className="text-amber-300/60 text-xs">Panel estratégico · Visión global</p>
            </div>
            {alertas.length>0&&(
              <div className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                {alertas.length} {alertas.length===1?'alerta':'alertas'}
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className={`text-2xl font-black ${sc(promedio)} `} style={{color:'white'}}>{promedio}</div>
              <div className="text-white/50 text-xs">Score global</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-white">{metaTotal>0?Math.round((ingresoTotal/metaTotal)*100):0}%</div>
              <div className="text-white/50 text-xs">Meta global</div>
            </div>
            <div className={`rounded-xl p-3 text-center ${provRojos>0?'bg-red-500/30':'bg-white/10'}`}>
              <div className="text-2xl font-black text-white">{provRojos+provAmarillos}</div>
              <div className="text-white/50 text-xs">Prov. alerta</div>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-stone-100 px-4 flex gap-1 sticky top-0 z-10">
        {([['resumen','🤖 Resumen IA'],['unidades','🏪 Unidades'],['proveedores','🚚 Proveedores'],['metas','🎯 Metas']] as const).map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              tab===t?'border-amber-500 text-amber-700':'border-transparent text-stone-400 hover:text-stone-600'
            }`}>{label}</button>
        ))}
      </div>

      <main className="max-w-lg mx-auto px-4 py-5 pb-20">
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-semibold text-stone-500">Período</span>
          <div className="flex items-center gap-2">
            <select value={periodo} onChange={e=>setPeriodo(e.target.value)} className="border border-amber-200 rounded-xl px-3 py-1.5 text-sm bg-white text-stone-700 font-medium">
              {PERIODOS.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={()=>router.push(`/piloncillo-dashboard/reporte?periodo=${periodo}`)} className="border border-stone-200 bg-white text-stone-500 px-3 py-1.5 rounded-xl text-sm hover:border-amber-300" title="Exportar PDF">📄</button>
          </div>
        </div>

        {/* ALERTAS */}
        {alertas.length>0&&(
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-5">
            <div className="font-bold text-red-700 text-sm mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-black">{alertas.length}</span>
              Alertas activas — acción requerida
            </div>
            <div className="space-y-2">
              {alertas.map((a,idx)=>(
                <div key={idx} className="bg-white rounded-xl p-3 border border-red-100">
                  <div className="font-semibold text-stone-800 text-sm">{a.mensaje}</div>
                  <div className="text-xs text-stone-400 mt-0.5">{a.detalle}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESUMEN IA */}
        {tab==='resumen'&&(
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl">🤖</div>
                <div><h2 className="font-bold text-stone-800">Resumen ejecutivo semanal</h2><p className="text-xs text-stone-500 mt-0.5">Análisis generado por KAII con los datos del período</p></div>
              </div>
              <button onClick={generarResumen} disabled={loadingIA} className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-50 transition-colors">
                {loadingIA?'✨ Analizando datos...':resumenIA?'↻ Regenerar análisis':'✨ Generar resumen con IA'}
              </button>
            </div>
            {resumenIA&&(
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
                <div className="whitespace-pre-wrap text-stone-700 text-sm leading-relaxed">{resumenIA}</div>
              </div>
            )}
            {!resumenIA&&!loadingIA&&(
              <div className="text-center py-8 text-stone-400">
                <p className="text-sm">Toca el botón para que KAII analice:</p>
                <div className="text-xs mt-3 space-y-1">
                  <p>✓ Eficiencia operacional por sucursal</p>
                  <p>✓ Mermas y control de insumos</p>
                  <p>✓ Administración y contabilidad</p>
                  <p>✓ Estado de proveedores</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* UNIDADES */}
        {tab==='unidades'&&(
          loading?<div className="text-center py-16 text-amber-400">Cargando...</div>:(
            <div className="space-y-3">
              {[...UNIDADES].sort((a,b)=>(metrics[b.id]?.score??-1)-(metrics[a.id]?.score??-1)).map(u=>{
                const m=metrics[u.id];
                const metaPct=m&&m.metaMensual>0?Math.round((m.ingresoReal/m.metaMensual)*100):0;
                const esAlerta=m&&m.score<70;
                return(
                  <div key={u.id} className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${esAlerta?'border-red-200':'border-stone-100'}`}>
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`w-12 h-12 bg-gradient-to-br ${u.color} rounded-xl flex items-center justify-center text-xl`}>{u.emoji}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-stone-800">{u.nombre}</div>
                          {esAlerta&&<span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Alerta</span>}
                        </div>
                        {m?<div className="text-xs text-stone-400">Eval. {m.periodo}</div>:<div className="text-xs text-stone-300">Sin evaluación</div>}
                      </div>
                      {m&&<div className={`text-3xl font-black ${sc(m.score)}`}>{m.score}</div>}
                    </div>
                    {m&&(
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {[{v:m.desempeno_score,l:'Desemp.',c:'text-emerald-700',bg:'bg-emerald-50'},{v:m.comportamiento_score,l:'Comport.',c:'text-blue-700',bg:'bg-blue-50'},{v:m.incidencias_score,l:'Asist.',c:'text-stone-700',bg:'bg-stone-50'}].map(({v,l,c,bg})=>(
                            <div key={l} className={`${bg} rounded-lg py-2`}><div className={`text-sm font-bold ${c}`}>{v}</div><div className="text-xs text-stone-400">{l}</div></div>
                          ))}
                        </div>
                        {m.metaMensual>0&&(
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-stone-400">{fmt(m.ingresoReal)} / {fmt(m.metaMensual)}</span>
                              <span className={`font-bold ${metaPct>=100?'text-emerald-600':'text-amber-600'}`}>{metaPct}%</span>
                            </div>
                            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${metaPct>=100?'bg-emerald-400':'bg-amber-400'}`} style={{width:`${Math.min(100,metaPct)}%`}}/>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* PROVEEDORES */}
        {tab==='proveedores'&&(
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-3">
                {(['verde','amarillo','rojo'] as const).map(e=>(
                  <div key={e} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full ${SEMAFORO[e].dot}`}/>
                    <span className="text-xs font-semibold text-stone-500">{proveedores.filter(p=>p.estado===e).length}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>setShowProvForm(true)} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-700">+ Proveedor</button>
            </div>
            <div className="space-y-3">
              {[...proveedores].sort((a,b)=>({'rojo':0,'amarillo':1,'verde':2}[a.estado]-{'rojo':0,'amarillo':1,'verde':2}[b.estado])).map(p=>{
                const s=SEMAFORO[p.estado];
                return(
                  <div key={p.id} className={`rounded-2xl p-4 border-2 ${s.bg} ${s.border}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full ${s.dot} mt-1.5`}/>
                        <div>
                          <div className="font-bold text-stone-800">{p.nombre}</div>
                          <div className="text-xs text-stone-500">{p.categoria}</div>
                          <div className={`text-xs font-semibold mt-1 ${s.text}`}>{s.label}</div>
                          {p.nota&&<p className="text-xs text-stone-400 mt-1 italic">{p.nota}</p>}
                        </div>
                      </div>
                      <button onClick={()=>deleteProveedor(p.id)} className="text-stone-300 hover:text-red-400">✕</button>
                    </div>
                  </div>
                );
              })}
              {proveedores.length===0&&<div className="text-center py-12 text-stone-400"><div className="text-4xl mb-2">🚚</div><p>Sin proveedores registrados</p></div>}
            </div>
          </div>
        )}

        {/* METAS */}
        {tab==='metas'&&(
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <h2 className="font-bold text-stone-800 mb-1">🎯 Metas de ingresos — {periodo}</h2>
              <p className="text-xs text-stone-500 mt-1">Fija la meta mensual de cada unidad. Los gerentes la verán pre-cargada en su evaluación y no podrán modificarla.</p>
            </div>
            <div className="space-y-3">
              {UNIDADES.map(u=>{
                const m=metrics[u.id];
                const metaVal=metas[u.id]||0;
                const pct=metaVal>0&&m?.ingresoReal?Math.round((m.ingresoReal/metaVal)*100):null;
                return(
                  <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${u.color} rounded-xl flex items-center justify-center text-lg`}>{u.emoji}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-stone-800">{u.nombre}</div>
                        {pct!==null&&<div className={`text-xs font-medium ${pct>=100?'text-emerald-600':pct>=80?'text-amber-600':'text-red-500'}`}>{pct}% de meta actual</div>}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-stone-400 mb-1.5 block font-medium">Meta de ingresos mensual</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-stone-400 text-sm">$</span>
                        <input type="number" value={metaVal||''} onChange={e=>setMetas(prev=>({...prev,[u.id]:Number(e.target.value)}))}
                          className="w-full border border-stone-200 rounded-xl pl-7 pr-3 py-2.5 text-sm font-bold text-stone-700 focus:outline-none focus:border-amber-400"
                          placeholder="Ej. 80000"/>
                      </div>
                      {metaVal>0&&m?.ingresoReal!=null&&(
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-stone-400">{fmt(m.ingresoReal)} de {fmt(metaVal)}</span>
                            <span className={`font-bold ${(pct||0)>=100?'text-emerald-600':(pct||0)>=80?'text-amber-600':'text-red-500'}`}>{pct}%</span>
                          </div>
                          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${(pct||0)>=100?'bg-emerald-400':(pct||0)>=80?'bg-amber-400':'bg-red-400'}`} style={{width:`${Math.min(100,pct||0)}%`}}/>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={saveMetas} disabled={savingMetas}
              className={`w-full py-4 rounded-2xl font-bold text-white transition-all ${savedMetas?'bg-emerald-500':'bg-amber-600 hover:bg-amber-700'} disabled:opacity-50`}>
              {savingMetas?'Guardando...' : savedMetas?'✅ Metas guardadas para '+periodo : '💾 Guardar metas del período'}
            </button>
          </div>
        )}
      </main>

      {/* Modal proveedor */}
      {showProvForm&&(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={()=>setShowProvForm(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h2 className="text-lg font-bold text-stone-800 mb-5">Nuevo proveedor</h2>
            <div className="space-y-4">
              <div><label className="text-xs text-stone-500 font-medium">Nombre</label><input className="w-full border border-stone-200 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-amber-400" value={formProv.nombre} onChange={e=>setFormProv(f=>({...f,nombre:e.target.value}))} placeholder="Distribuidora X"/></div>
              <div><label className="text-xs text-stone-500 font-medium">Categoría</label><input className="w-full border border-stone-200 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-amber-400" value={formProv.categoria} onChange={e=>setFormProv(f=>({...f,categoria:e.target.value}))} placeholder="Café, Lácteos..."/></div>
              <div>
                <label className="text-xs text-stone-500 font-medium block mb-2">Estado</label>
                <div className="flex gap-2">
                  {(['verde','amarillo','rojo'] as const).map(e=>(
                    <button key={e} onClick={()=>setFormProv(f=>({...f,estado:e}))} className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold capitalize flex items-center justify-center gap-2 ${formProv.estado===e?`${SEMAFORO[e].bg} ${SEMAFORO[e].border} ${SEMAFORO[e].text}`:'border-stone-100 text-stone-400'}`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${SEMAFORO[e].dot}`}/>{e}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="text-xs text-stone-500 font-medium">Nota</label><input className="w-full border border-stone-200 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-amber-400" value={formProv.nota} onChange={e=>setFormProv(f=>({...f,nota:e.target.value}))} placeholder="Pago pendiente, buen precio..."/></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setShowProvForm(false)} className="flex-1 py-3 rounded-xl border-2 border-stone-200 text-stone-500 font-medium">Cancelar</button>
              <button onClick={saveProveedor} disabled={!formProv.nombre} className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold disabled:opacity-40">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
