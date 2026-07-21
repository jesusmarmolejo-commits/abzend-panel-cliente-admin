import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { recipient_email, recipient_name, tracking_code, driver_name, estimated_minutes } = await req.json()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'ABZEND <onboarding@resend.dev>',
        to: [recipient_email],
        subject: `🚚 ${driver_name} está cerca — Orden #${tracking_code}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #1D9E75 100%); padding: 32px 24px; text-align: center; }
    .logo { font-size: 28px; font-weight: 700; color: #fff; letter-spacing: 2px; margin-bottom: 8px; }
    .tagline { font-size: 14px; color: rgba(255,255,255,0.9); }
    .content { padding: 32px 24px; }
    .alert-box { background: #E6F1FB; border-left: 4px solid #185FA5; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; }
    .alert-title { font-size: 18px; font-weight: 600; color: #185FA5; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    .alert-text { font-size: 14px; color: #444; line-height: 1.6; }
    .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
    .info-label { font-size: 13px; color: #888; }
    .info-value { font-size: 14px; font-weight: 600; color: #222; }
    .cta { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; padding: 14px 32px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .footer { background: #f9f9f9; padding: 24px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ABZEND</div>
      <div class="tagline">Tu paquete está llegando</div>
    </div>
    
    <div class="content">
      <div class="alert-box">
        <div class="alert-title">
          <span>🚚</span>
          <span>¡${driver_name} está muy cerca!</span>
        </div>
        <p class="alert-text">
          Tu repartidor se encuentra aproximadamente a <strong>${estimated_minutes} minutos</strong> de tu domicilio. 
          Por favor estate atento(a) a la entrega.
        </p>
      </div>

      <div class="info-row">
        <span class="info-label">Código de seguimiento</span>
        <span class="info-value">#${tracking_code}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Repartidor</span>
        <span class="info-value">${driver_name}</span>
      </div>

      <div class="cta">
        <a href="https://abzend-panel-cliente.vercel.app/dashboard" class="btn">
          Ver en tiempo real
        </a>
      </div>

      <p style="font-size: 13px; color: #666; line-height: 1.6; margin-top: 24px;">
        Asegúrate de tener el código de seguimiento a la mano. El repartidor te solicitará verificación 
        antes de entregar el paquete.
      </p>
    </div>

    <div class="footer">
      <p>ABZEND — Entregas rápidas y confiables</p>
      <p style="margin-top: 8px;">¿Dudas? Escríbenos a soporte@abzend.com</p>
    </div>
  </div>
</body>
</html>
        `
      })
    })

    const data = await res.json()
    
    return new Response(JSON.stringify({ success: true, emailId: data.id }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
