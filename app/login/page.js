'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('options') // 'options' | 'email'

  const loginGoogle = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

const loginEmail = async () => {
    if (!email || !password) { setError('Ingresa correo y contraseña'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h1 style={styles.logo}>ABZEND</h1>
        <p style={styles.sub}>Panel Cliente</p>
        {error && <p style={styles.error}>{error}</p>}

        {mode === 'options' && (
          <>
            <button style={styles.btnGoogle} onClick={loginGoogle} disabled={loading}>
              <img src="https://www.google.com/favicon.ico" width="18" alt="Google" style={{marginRight:8}} />
              {loading ? 'Conectando...' : 'Continuar con Google'}
            </button>
            <div style={styles.divider}><span>o</span></div>
            <button style={styles.btnEmail} onClick={()=>setMode('email')}>
              Iniciar sesión con correo
            </button>
          </>
        )}

        {mode === 'email' && (
          <>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              style={styles.input}
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&loginEmail()}
              style={styles.input}
            />
            <button style={styles.btnPrimary} onClick={loginEmail} disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
            <button style={styles.btnBack} onClick={()=>{setMode('options');setError('')}}>
              ← Volver
            </button>
          </>
        )}

        <p style={styles.terms}>Al ingresar aceptas los términos de uso de ABZEND</p>
      </div>
    </div>
  )
}

const styles = {
  container: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#4f46e5' },
  box: { background:'#fff', borderRadius:16, padding:'2rem', width:'100%', maxWidth:380, textAlign:'center' },
  logo: { fontSize:28, fontWeight:700, color:'#4f46e5', letterSpacing:2, marginBottom:4 },
  sub: { fontSize:13, color:'#888', marginBottom:'1.5rem' },
  error: { background:'#FCEBEB', color:'#A32D2D', borderRadius:8, padding:'10px 12px', fontSize:13, marginBottom:'1rem' },
  btnGoogle: { display:'flex', alignItems:'center', justifyContent:'center', width:'100%', padding:12, background:'#fff', color:'#333', border:'1px solid #ddd', borderRadius:8, fontSize:15, fontWeight:500, cursor:'pointer', marginBottom:8 },
  btnEmail: { width:'100%', padding:12, background:'#F3F4F6', color:'#333', border:'1px solid #ddd', borderRadius:8, fontSize:15, fontWeight:500, cursor:'pointer' },
  btnPrimary: { width:'100%', padding:12, background:'#4f46e5', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:600, cursor:'pointer', marginBottom:8 },
  btnBack: { width:'100%', padding:10, background:'none', color:'#888', border:'none', fontSize:13, cursor:'pointer' },
  input: { width:'100%', padding:'10px 12px', border:'1px solid #ddd', borderRadius:8, fontSize:14, marginBottom:10, boxSizing:'border-box', outline:'none' },
  divider: { display:'flex', alignItems:'center', gap:8, margin:'12px 0', color:'#ccc', fontSize:12 },
  terms: { fontSize:12, color:'#aaa', marginTop:'1rem' }
}