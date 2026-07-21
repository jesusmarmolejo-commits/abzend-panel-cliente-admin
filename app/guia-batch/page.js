'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'

function GuiaBatchContent() {
  const p = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ids = p.get('ids')?.split(',') || []
    if (!ids.length) { setLoading(false); return }
    const sb = createClient()
    sb.from('orders').select('*').in('id', ids).then(({ data }) => {
      setOrders(data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{padding:24}}>Cargando guías...</div>

  return (
    <div style={{fontFamily:'Arial,sans-serif',color:'#111'}}>
      <button onClick={()=>window.print()}
        style={{position:'fixed',top:16,right:16,padding:'10px 20px',background:'#4f46e5',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:14,fontWeight:600,zIndex:999}}>
        Imprimir todas
      </button>
      <style>{`@media print{button{display:none!important}} .guia{page-break-after:always} .guia:last-child{page-break-after:auto}`}</style>

      {orders.map((o, idx) => (
        <div key={idx} className="guia" style={{padding:24,maxWidth:800,margin:'0 auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'3px solid #4f46e5',paddingBottom:12,marginBottom:16}}>
            <div style={{fontSize:22,fontWeight:900,color:'#4f46e5',letterSpacing:2}}>ABZEND</div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:11,color:'#888'}}>No. de Guia</div>
              <div style={{fontSize:16,fontWeight:700}}>{o.tracking_code}</div>
            </div>
            <div style={{background:'#4f46e5',color:'#fff',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:600}}>
              {(o.service||'ESTANDAR').toUpperCase()}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div style={{border:'1px solid #ddd',borderRadius:8,padding:10}}>
              <div style={{fontSize:10,color:'#4f46e5',textTransform:'uppercase',marginBottom:6,fontWeight:700}}>Remitente</div>
              <div style={{fontSize:12,lineHeight:1.6}}><strong>{o.sender_name||'—'}</strong><br/>{o.sender_phone||'—'}<br/>{o.origin_address||'—'}</div>
            </div>
            <div style={{border:'1px solid #ddd',borderRadius:8,padding:10}}>
              <div style={{fontSize:10,color:'#4f46e5',textTransform:'uppercase',marginBottom:6,fontWeight:700}}>Destinatario</div>
              <div style={{fontSize:12,lineHeight:1.6}}><strong>{o.recipient_name||'—'}</strong><br/>{o.recipient_phone||'—'}<br/>{o.dest_address||'—'}</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
            {[
              {label:'TIPO', value:o.package_type||'—'},
              {label:'PESO', value:`${o.weight_kg||'—'} kg`},
              {label:'TOTAL', value:`$${Number(o.total||0).toFixed(2)}`},
              {label:'FECHA', value:o.created_at?new Date(o.created_at).toLocaleDateString('es-MX'):'—'},
            ].map((item,i)=>(
              <div key={i} style={{border:'1px solid #ddd',borderRadius:6,padding:8,textAlign:'center'}}>
                <div style={{fontSize:9,color:'#888',textTransform:'uppercase',marginBottom:3}}>{item.label}</div>
                <div style={{fontSize:12,fontWeight:700}}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{textAlign:'center',border:'2px dashed #4f46e5',borderRadius:8,padding:12,marginBottom:12}}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${o.tracking_code}`} width="100" height="100" alt="QR" />
            <div style={{fontSize:10,color:'#555',marginTop:6}}>Escanea para rastrear · {o.tracking_code}</div>
          </div>

          {o.instructions && (
            <div style={{border:'1px solid #ddd',borderRadius:8,padding:10,marginBottom:12}}>
              <div style={{fontSize:10,color:'#4f46e5',textTransform:'uppercase',marginBottom:6,fontWeight:700}}>Instrucciones</div>
              <div style={{fontSize:12}}>{o.instructions}</div>
            </div>
          )}

          <div style={{borderTop:'1px solid #eee',paddingTop:8,display:'flex',justifyContent:'space-between',fontSize:10,color:'#888'}}>
            <span>ABZEND Logistica</span>
            <span>Generado: {new Date().toLocaleString('es-MX')}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function GuiaBatch() {
  return (
    <Suspense fallback={<div style={{padding:24}}>Cargando...</div>}>
      <GuiaBatchContent />
    </Suspense>
  )
}