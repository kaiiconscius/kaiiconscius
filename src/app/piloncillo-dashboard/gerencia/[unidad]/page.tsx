'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface EvalDesempeno { productividad:number; ingresoReal:number; metaMensual:number; eficienciaOperativa:number; controlInsumos:number; }
interface EvalComportamiento { comunicacion:number; seguimiento:number; gestionProyectos:number; }
interface EvalIncidencias { faltasInjustificadas:number; retardosSinAvisar:number; vacacionesSinComunicar:number; descansosSinComunicar:number; }
interface EvalGerencia {
  id:string; unidad:string; periodo:string;
  desempeno:EvalDesempeno; comportamiento:EvalComportamiento; incidencias:EvalIncidencias;
  notas:string; evaluadoPor:string;
  score:number; desempeno_score:number; comportamiento_score:number; incidencias_score:number;
  createdAt:string;
}

const UNIDADES: Record<string,{nombre:string;emoji:string;bg:string}> = {
  'la-cruz':           {nombre:'La Cruz',          emoji:'☕',bg:'from-amber-600 to-amber-500'},
  'oaxaca-manana':     {nombre:'Oaxaca Mañana',    emoji:'🌅',bg:'from-orange-500 to-orange-400'},
  'oaxaca-vespertino': {nombre:'Oaxaca Vespertino',emoji:'🌇',bg:'from-rose-600 to-rose-500'},
  'ixtlan-del-rio':    {nombre:'Ixtlán del Río',   emoji:'🏔️',bg:'from-teal-600 to-teal-500'},
  'panaderia':         {nombre:'Panadería',        emoji:'🥐',bg:'from-yellow-600 to-yellow-500'},
};

const PERIODOS = (()=>{ const p:string[]=[],now=new Date(); for(let i=0;i<6;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1);p.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);} return p; })();
const D0 = {productividad:75,ingresoReal:0,metaMensual:0,eficienciaOperativa:75,controlInsumos:75};
const C0 = {comunicacion:75,seguimiento:75,gestionProyectos:75};
const I0 = {faltasInjustificadas:0,retardosSinAvisar:0,vacacionesSinComunicar:0,descansosSinComunicar:0};

function calcScores(d:EvalDesempeno,c:EvalComportamiento,i:EvalIncidencias){
  const mp=d.metaMensual>0?Math.min(100,(d.ingresoReal/d.metaMensual)*100):d.productividad;
  const ds=((d.productividad+mp+d.eficienciaOperativa+d.controlInsumos)/4)*0.5;
  const cs=((c.comunicacion+c.seguimiento+c.gestionProyectos)/3)*0.3;
  const ded=i.faltasInjustificadas*4+i.retardosSinAvisar*2+i.vacacionesSinComunicar*4+i.descansosSinComunicar*2;
  const ins=Math.max(0,20-ded);
  return {score:Math.round(ds+cs+ins),desempeno_score:Math.round(ds*10)/10,comportamiento_score:Math.round(cs*10)/10,incidencias_score:Math.round(ins*10)/10,deductions:ded};
}
function sc(s:number){return s>=80?'text-emerald-600':s>=60?'text-amber-600':'text-red-500';}
function fmt(n:number){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(n);}

// ── Evolution chart ─────────────────────────────────────────────────────────────────
function EvolChart({evals}:{evals:EvalGerencia[]}){
  const sorted=[...evals].sort((a,b)=>a.periodo.localeCompare(b.periodo)).slice(-6);
  if(sorted.length<2) return(
    <div className="text-center py-12 text-stone-400">
      <div className="text-4xl mb-2">📊</div>
      <p className="text-sm">Necesitas al menos 2 evaluaciones</p>
      <p className="text-xs mt-1">para ver la línea de evolución</p>
    </div>
  );
  const W=320,H=160,PT=24,PR=16,PB=34,PL=28;
  const plotW=W-PL-PR,plotH=H-PT-PB;
  const scores=sorted.map(e=>e.score);
  const lo=Math.max(0,Math.min(...scores)-10),hi=Math.min(100,Math.max(...scores)+10);
  const xp=(i:number)=>PL+(i/(sorted.length-1))*plotW;
  const yp=(s:number)=>PT+(1-(s-lo)/(hi-lo))*plotH;
  const pts=sorted.map((e,i)=>({x:xp(i),y:yp(e.score),score:e.score,mes:e.periodo.slice(5)}));
  const pathD=pts.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ');
  const refs=[60,70,80,90].filter(v=>v>=lo&&v<=hi);
  const dotColor=(s:number)=>s>=80?'#10b981':s>=60?'#d97706':'#ef4444';
  const trend=scores[scores.length-1]-scores[0];
  return(
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-stone-400">Evolución de score · últimos {sorted.length} períodos</div>
        <div className={`text-sm font-bold ${trend>0?'text-emerald-600':trend<0?'text-red-500':'text-stone-400'}`}>
          {trend>0?'↑':trend<0?'↓':'→'} {Math.abs(trend)} pts
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {refs.map(v=>(
            <g key={v}>
              <line x1={PL} y1={yp(v)} x2={W-PR} y2={yp(v)} stroke="#e7e5e4" strokeDasharray="4 3" strokeWidth={1}/>
              <text x={PL-4} y={yp(v)+3.5} fontSize={8} fill="#a8a29e" textAnchor="end">{v}</text>
            </g>
          ))}
          <path d={pathD} fill="none" stroke="#d97706" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
          {pts.map((p,i)=>(
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={5.5} fill={dotColor(p.score)} stroke="white" strokeWidth={2}/>
              <text x={p.x} y={p.y-11} fontSize={9} fill="#57534e" textAnchor="middle" fontWeight="bold">{p.score}</text>
              <text x={p.x} y={H-3} fontSize={7.5} fill="#a8a29e" textAnchor="middle">{p.mes}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {[{label:'Máximo',val:Math.max(...scores),color:'text-emerald-600'},{label:'Mínimo',val:Math.min(...scores),color:'text-red-500'},{label:'Promedio',val:Math.round(scores.reduce((a,b)=>a+b,0)/scores.length),color:'text-amber-600'}].map(({label,val,color})=>(
          <div key={label} className="bg-white rounded-xl p-3 text-center shadow-sm border border-stone-100">
            <div className={`text-xl font-black ${color}`}>{val}</div>
            <div className="text-xs text-stone-400">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slider({label,desc,value,onChange}:{label:string;desc:string;value:number;onChange:(v:number)=>void}){
  return(
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-3"><div className="font-semibold text-stone-700 text-sm">{label}</div><div className="text-xs text-stone-400 mt-0.5 leading-snug">{desc}</div></div>
        <div className={`text-2xl font-black flex-shrink-0 ${sc(value)}`}>{value}</div>
      </div>
      <div className="relative">
        <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden mb-1">
          <div className={`h-full rounded-full transition-all ${value>=80?'bg-emerald-400':value>=60?'bg-amber-400':'bg-red-400'}`} style={{width:`${value}%`}}/>
        </div>
        <input type="range" min={0} max={100} value={value} onChange={e=>onChange(Number(e.target.value))} className="w-full h-2.5 absolute top-0 opacity-0 cursor-pointer"/>
      </div>
      <div className="flex justify-between text-xs text-stone-300 mt-0.5"><span>Bajo</span><span>Medio</span><span>Alto</span></div>
    </div>
  );
}

function Counter({label,desc,value,onChange,pts}:{label:string;desc:string;value:number;onChange:(v:number)=>void;pts:number}){
  return(
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-stone-700 text-sm">{label}</div>
          <div className="text-xs text-stone-400 mt-0.5">{desc}</div>
          <div className="text-xs text-red-400 font-medium mt-1">−{pts} pts por ocurrencia</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={()=>onChange(Math.max(0,value-1))} className="w-9 h-9 rounded-xl bg-stone-100 text-stone-500 font-bold text-lg hover:bg-stone-200 flex items-center justify-center">−</button>
          <span className={`text-xl font-black w-7 text-center ${value>0?'text-red-500':'text-stone-300'}`}>{value}</span>
          <button onClick={()=>onChange(value+1)} className="w-9 h-9 rounded-xl bg-red-50 text-red-500 font-bold text-lg hover:bg-red-100 flex items-center justify-center">+</button>
        </div>
      </div>
    </div>
  );
}

export default function UnidadPage(){
  const router=useRouter();
  const params=useParams();
  const unidad=params.unidad as string;
  const info=UNIDADES[unidad];
  const [tab,setTab]=useState<'evaluar'|'evolucion'|'historial'>('evaluar');
  const [historial,setHistorial]=useState<EvalGerencia[]>([]);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [periodo,setPeriodo]=useState(PERIODOS[0]);
  const [d,setD]=useState(D0);
  const [c,setC]=useState(C0);
  const [i,setI]=useState(I0);
  const [evaluadoPor,setEvaluadoPor]=useState('');
  const [notas,setNotas]=useState('');
  const [metaFijada,setMetaFijada]=useState<number|null>(null);

  useEffect(()=>{
    if(typeof window!=='undefined'&&!sessionStorage.getItem(`pillo_gerencia_${unidad}`)){
      router.push('/piloncillo-dashboard/gerencia');
    }
  },[unidad,router]);

  useEffect(()=>{
    if(!unidad) return;
    fetch(`/api/piloncillo/metas?periodo=${periodo}&unidad=${unidad}`)
      .then(r=>r.json())
      .then(j=>{
        if(j.meta!=null){setMetaFijada(j.meta);setD(x=>({...x,metaMensual:j.meta}));}
        else{setMetaFijada(null);}
      })
      .catch(()=>{});
  },[periodo,unidad]);

  const fetchHistorial=useCallback(async()=>{
    const res=await fetch(`/api/piloncillo/evaluaciones-gerencia?unidad=${unidad}`);
    const json=await res.json();
    setHistorial(json.data||[]);
  },[unidad]);

  useEffect(()=>{ if(tab==='historial'||tab==='evolucion') fetchHistorial(); },[tab,fetchHistorial]);

  const scores=calcScores(d,c,i);
  const meta_pct=d.metaMensual>0?Math.round((d.ingresoReal/d.metaMensual)*100):0;

  const handleSave=async()=>{
    setSaving(true);
    const res=await fetch('/api/piloncillo/evaluaciones-gerencia',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({unidad,periodo,desempeno:d,comportamiento:c,incidencias:i,evaluadoPor,notas,...scores}),
    });
    if(res.ok){setSaved(true);setTimeout(()=>setSaved(false),4000);}
    setSaving(false);
  };

  if(!info) return null;

  return(
    <div className="min-h-screen bg-stone-50">
      <header className={`bg-gradient-to-br ${info.bg} text-white px-4 pt-10 pb-6`}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={()=>router.push('/piloncillo-dashboard/gerencia')} className="text-white/60 text-lg hover:text-white">←</button>
            <div className="text-2xl">{info.emoji}</div>
            <div><h1 className="font-bold text-xl">{info.nombre}</h1><p className="text-white/60 text-xs">Panel de gestión</p></div>
          </div>
          <div className="bg-black/20 rounded-2xl p-4">
            <div className="flex items-end justify-between mb-2">
              <div className="text-white/70 text-xs font-medium">Puntuación en tiempo real</div>
              <div className="text-5xl font-black text-white leading-none">{scores.score}</div>
            </div>
            <div className="flex gap-1">
              {[{v:scores.desempeno_score,l:'Desemp.'},{v:scores.comportamiento_score,l:'Comport.'},{v:scores.incidencias_score,l:'Asist.'}].map(({v,l})=>(
                <div key={l} className="flex-1 bg-white/10 rounded-lg p-2 text-center">
                  <div className={`text-base font-bold ${l==='Asist.'&&v<20?'text-red-300':'text-white'}`}>{v}</div>
                  <div className="text-white/50 text-xs">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-stone-100 px-4 flex gap-1 sticky top-0 z-10">
        {([['evaluar','📝 Evaluar'],['evolucion','📈 Evolución'],['historial','📋 Historial']] as const).map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              tab===t?'border-amber-500 text-amber-700':'border-transparent text-stone-400 hover:text-stone-600'
            }`}>{label}</button>
        ))}
      </div>

      <main className="max-w-lg mx-auto px-4 py-5 pb-20">
        {/* ── EVALUAR ── */}
        {tab==='evaluar'&&(
          <div className="space-y-6">
            <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
              <div className="text-xl">📅</div>
              <div className="flex-1">
                <div className="text-xs text-stone-400 font-medium">Período de evaluación</div>
                <select value={periodo} onChange={e=>setPeriodo(e.target.value)} className="font-bold text-stone-700 bg-transparent focus:outline-none mt-0.5 text-sm">
                  {PERIODOS.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-stone-700 text-sm flex items-center gap-2"><span className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-black text-xs">D</span>DESEMPEÑO</h2>
                <span className="text-sm font-bold text-emerald-600">{scores.desempeno_score} / 50</span>
              </div>
              <div className="space-y-3">
                <Slider label="Productividad general" desc="Rendimiento y output global de la unidad" value={d.productividad} onChange={v=>setD(x=>({...x,productividad:v}))}/>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-semibold text-stone-700 text-sm">Meta de ingresos del mes</div>
                    {metaFijada!==null&&<span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">📌 Fijada por Dirección</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {(['ingresoReal','metaMensual'] as const).map(k=>{
                      const label=k==='ingresoReal'?'Ingreso real':'Meta mensual';
                      const isLocked=k==='metaMensual'&&metaFijada!==null;
                      return(
                        <div key={k}>
                          <div className="text-xs text-stone-400 mb-1.5 font-medium">{label}</div>
                          <div className="relative"><span className="absolute left-3 top-2.5 text-stone-400 text-sm">$</span>
                            {isLocked?(
                              <div className="w-full border border-amber-200 bg-amber-50 rounded-xl pl-7 pr-3 py-2.5 text-sm font-bold text-amber-700">{metaFijada.toLocaleString('es-MX')}</div>
                            ):(
                              <input type="number" value={d[k]||''} onChange={e=>setD(x=>({...x,[k]:Number(e.target.value)}))} className="w-full border border-stone-200 rounded-xl pl-7 pr-3 py-2.5 text-sm font-bold text-stone-700 focus:outline-none focus:border-amber-400" placeholder="0"/>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {d.metaMensual>0&&(
                    <>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-stone-400">{fmt(d.ingresoReal)} de {fmt(d.metaMensual)}</span>
                        <span className={`font-bold ${meta_pct>=100?'text-emerald-600':meta_pct>=80?'text-amber-600':'text-red-500'}`}>{meta_pct}% logrado</span>
                      </div>
                      <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${meta_pct>=100?'bg-emerald-400':meta_pct>=80?'bg-amber-400':'bg-red-400'}`} style={{width:`${Math.min(100,meta_pct)}%`}}/>
                      </div>
                    </>
                  )}
                </div>
                <Slider label="Eficiencia operativa" desc="Control del gasto operativo vs presupuesto mensual" value={d.eficienciaOperativa} onChange={v=>setD(x=>({...x,eficienciaOperativa:v}))}/>
                <Slider label="Control de insumos" desc="Food cost real vs objetivo · Merma y desperdicios" value={d.controlInsumos} onChange={v=>setD(x=>({...x,controlInsumos:v}))}/>
              </div>
            </section>
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-stone-700 text-sm flex items-center gap-2"><span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-black text-xs">C</span>COMPORTAMIENTO</h2>
                <span className="text-sm font-bold text-blue-600">{scores.comportamiento_score} / 30</span>
              </div>
              <div className="space-y-3">
                <Slider label="Comunicación efectiva" desc="Claridad, oportunidad y calidad de la comunicación" value={c.comunicacion} onChange={v=>setC(x=>({...x,comunicacion:v}))}/>
                <Slider label="Seguimiento y ejecución" desc="Cumple lo que dice · Da seguimiento a acuerdos" value={c.seguimiento} onChange={v=>setC(x=>({...x,seguimiento:v}))}/>
                <Slider label="Gestión de proyectos" desc="Inicia, supervisa y cierra proyectos en tiempo" value={c.gestionProyectos} onChange={v=>setC(x=>({...x,gestionProyectos:v}))}/>
              </div>
            </section>
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-stone-700 text-sm flex items-center gap-2"><span className="w-7 h-7 bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-black text-xs">I</span>INCIDENCIAS</h2>
                <span className={`text-sm font-bold ${scores.deductions>0?'text-red-500':'text-emerald-600'}`}>{scores.incidencias_score}/20{scores.deductions>0&&<span className="text-xs font-normal"> (−{scores.deductions})</span>}</span>
              </div>
              <div className="space-y-3">
                <Counter label="Faltas injustificadas" desc="Ausencias sin aviso" value={i.faltasInjustificadas} onChange={v=>setI(x=>({...x,faltasInjustificadas:v}))} pts={4}/>
                <Counter label="Retardos sin avisar" desc="Llegadas tarde sin comunicación" value={i.retardosSinAvisar} onChange={v=>setI(x=>({...x,retardosSinAvisar:v}))} pts={2}/>
                <Counter label="Vacaciones sin coordinar" desc="Días no coordinados con dirección" value={i.vacacionesSinComunicar} onChange={v=>setI(x=>({...x,vacacionesSinComunicar:v}))} pts={4}/>
                <Counter label="Descansos no comunicados" desc="Descansos sin avisar" value={i.descansosSinComunicar} onChange={v=>setI(x=>({...x,descansosSinComunicar:v}))} pts={2}/>
              </div>
            </section>
            <section className="space-y-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
                <label className="text-xs text-stone-400 font-medium block mb-1.5">Evaluado por</label>
                <input className="w-full text-sm font-semibold text-stone-700 bg-transparent focus:outline-none border-b border-stone-100 pb-1" value={evaluadoPor} onChange={e=>setEvaluadoPor(e.target.value)} placeholder="Tu nombre"/>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
                <label className="text-xs text-stone-400 font-medium block mb-1.5">Reflexión y notas</label>
                <textarea className="w-full text-sm text-stone-600 bg-transparent focus:outline-none resize-none" rows={3} value={notas} onChange={e=>setNotas(e.target.value)} placeholder="¿Qué destacó este período?"/>
              </div>
            </section>
            <button onClick={handleSave} disabled={saving} className={`w-full py-4 rounded-2xl font-bold text-white text-base shadow-lg transition-all ${saved?'bg-emerald-500':`bg-gradient-to-r ${info.bg} hover:scale-[1.02] active:scale-95`} disabled:opacity-50`}>
              {saved?'✓ Evaluación guardada':saving?'Guardando...':`Guardar · ${scores.score} puntos`}
            </button>
          </div>
        )}

        {/* ── EVOLUCIÓN ── */}
        {tab==='evolucion'&&(
          <div>
            {historial.length===0?(
              <div className="text-center py-16 text-stone-400">
                <div className="text-5xl mb-3">📈</div>
                <p className="font-medium">Sin evaluaciones aún</p>
                <p className="text-sm mt-1">Evalúa el primer período para ver la gráfica</p>
              </div>
            ):(
              <EvolChart evals={historial}/>
            )}
          </div>
        )}

        {/* ── HISTORIAL ── */}
        {tab==='historial'&&(
          <div>
            {historial.length===0?(
              <div className="text-center py-16 text-stone-400">
                <div className="text-5xl mb-3">📋</div>
                <p className="font-medium">Sin evaluaciones aún</p>
              </div>
            ):(
              <div className="space-y-3">
                {[...historial].sort((a,b)=>b.periodo.localeCompare(a.periodo)).map(e=>(
                  <div key={e.id} className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-stone-800 text-base">{e.periodo}</div>
                        <div className="text-xs text-stone-400 mt-0.5">{e.evaluadoPor?`Por: ${e.evaluadoPor}`:'—'}</div>
                      </div>
                      <div className={`text-4xl font-black ${sc(e.score)}`}>{e.score}</div>
                    </div>
                    <div className="flex gap-4 text-xs text-stone-500 pt-3 border-t border-stone-50">
                      <span>Desemp. <strong className="text-emerald-600">{e.desempeno_score}</strong></span>
                      <span>Comport. <strong className="text-blue-600">{e.comportamiento_score}</strong></span>
                      <span>Asist. <strong className={e.incidencias_score<20?'text-red-500':'text-stone-600'}>{e.incidencias_score}</strong></span>
                    </div>
                    {e.desempeno.metaMensual>0&&<div className="mt-2 text-xs text-stone-400">{fmt(e.desempeno.ingresoReal)} / {fmt(e.desempeno.metaMensual)} · {Math.round((e.desempeno.ingresoReal/e.desempeno.metaMensual)*100)}%</div>}
                    {e.notas&&<p className="text-xs text-stone-400 italic mt-2">&ldquo;{e.notas}&rdquo;</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
