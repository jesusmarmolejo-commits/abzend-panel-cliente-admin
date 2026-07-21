'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function GuiaContent() {
  const p = useSearchParams()
  const router = useRouter()
  const tracking = p.get('tracking')

  return (
    <div style={{fontFamily:'Arial,sans-serif',padding:24,maxWidth:800,margin:'0 auto',color:'#111'}}>
      <div style={{position:'fixed',top:16,right:16,display:'flex',gap:10,zIndex:999}}>
        <button onClick={()=>router.back()}
          style={{padding:'10px 20px',background:'#fff',color:'#374151',border:'1px solid #d1d5db',borderRadius:8,cursor:'pointer',fontSize:14,fontWeight:600}}>
          ← Regresar
        </button>
        <button onClick={()=>window.print()}
          style={{padding:'10px 20px',background:'#4f46e5',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:14,fontWeight:600}}>
          Imprimir
        </button>
      </div>
      <style>{`@media print{button{display:none!important}}`}</style>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'3px solid #4f46e5',paddingBottom:12,marginBottom:20}}>
        <div style={{fontSize:24,fontWeight:900,color:'#4f46e5',letterSpacing:2}}>ABZEND</div>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:11,color:'#888'}}>No. de Guia</div>
          <div style={{fontSize:18,fontWeight:700}}>{tracking}</div>
        </div>
        <div style={{background:'#4f46e5',color:'#fff',padding:'4px 14px',borderRadius:20,fontSize:12,fontWeight:600}}>
          {(p.get('servicio')||'ESTANDAR').toUpperCase()}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        <div style={{border:'1px solid #ddd',borderRadius:8,padding:12}}>
          <div style={{fontSize:11,color:'#4f46e5',textTransform:'uppercase',marginBottom:8,fontWeight:700}}>Remitente</div>
          <div style={{fontSize:13,lineHeight:1.8}}>
            <div><strong>{p.get('remitente')||'—'}</strong></div>
            <div>{p.get('remitente_tel')||'—'}</div>
            <div>{p.get('origen')||'—'}</div>
          </div>
        </div>
        <div style={{border:'1px solid #ddd',borderRadius:8,padding:12}}>
          <div style={{fontSize:11,color:'#4f46e5',textTransform:'uppercase',marginBottom:8,fontWeight:700}}>Destinatario</div>
          <div style={{fontSize:13,lineHeight:1.8}}>
            <div><strong>{p.get('destinatario')||'—'}</strong></div>
            <div>{p.get('destinatario_tel')||'—'}</div>
            <div>{p.get('destino')||'—'}</div>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        <div style={{border:'1px solid #ddd',borderRadius:6,padding:10,textAlign:'center'}}>
          <div style={{fontSize:10,color:'#888',marginBottom:4}}>TIPO</div>
          <div style={{fontSize:13,fontWeight:700}}>{p.get('tipo')||'—'}</div>
        </div>
        <div style={{border:'1px solid #ddd',borderRadius:6,padding:10,textAlign:'center'}}>
          <div style={{fontSize:10,color:'#888',marginBottom:4}}>PESO</div>
          <div style={{fontSize:13,fontWeight:700}}>{p.get('peso')||'—'} kg</div>
        </div>
        <div style={{border:'1px solid #ddd',borderRadius:6,padding:10,textAlign:'center'}}>
          <div style={{fontSize:10,color:'#888',marginBottom:4}}>TOTAL</div>
          <div style={{fontSize:13,fontWeight:700}}>${Number(p.get('total')||0).toFixed(2)}</div>
        </div>
        <div style={{border:'1px solid #ddd',borderRadius:6,padding:10,textAlign:'center'}}>
          <div style={{fontSize:10,color:'#888',marginBottom:4}}>FECHA</div>
          <div style={{fontSize:13,fontWeight:700}}>{p.get('fecha')?new Date(p.get('fecha')).toLocaleDateString('es-MX'):'—'}</div>
        </div>
      </div>

      <div style={{textAlign:'center',border:'2px dashed #4f46e5',borderRadius:8,padding:16,marginBottom:16}}>
        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${tracking}`} width="120" height="120" alt="QR" />
        <div style={{fontSize:11,color:'#555',marginTop:8}}>Escanea para rastrear · {tracking}</div>
      </div>

      {p.get('instrucciones') && (
        <div style={{border:'1px solid #ddd',borderRadius:8,padding:12,marginBottom:16}}>
          <div style={{fontSize:11,color:'#4f46e5',textTransform:'uppercase',marginBottom:6,fontWeight:700}}>Instrucciones especiales</div>
          <div style={{fontSize:13}}>{p.get('instrucciones')}</div>
        </div>
      )}

      <div style={{borderTop:'1px solid #eee',paddingTop:10,display:'flex',justifyContent:'space-between',fontSize:11,color:'#888'}}>
        <span>ABZEND Logistica</span>
        <span>Generado: {new Date().toLocaleString('es-MX')}</span>
        <span>Seguro: {p.get('seguro')==='1'?'Si':'No'}</span>
      </div>
    </div>
  )
}

export default function Guia() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <GuiaContent />
    </Suspense>
  )
}