/**
 * Token debugging utilities
 */

export function decodeJWT(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { error: 'Invalid JWT format' }
    }
    
    const payload = JSON.parse(atob(parts[1]))
    const header = JSON.parse(atob(parts[0]))
    
    return {
      header,
      payload,
      exp: payload.exp ? new Date(payload.exp * 1000) : null,
      expiredIn: payload.exp ? new Date(payload.exp * 1000).getTime() - Date.now() : null
    }
  } catch (e: any) {
    return { error: e.message }
  }
}

export function checkTokenStatus() {
  const token = localStorage.getItem('nscale_access_token')
  
  if (!token) {
    console.log('❌ No token found in localStorage')
    return
  }
  
  console.log('🔍 Token found:', token.substring(0, 30) + '...')
  
  const decoded = decodeJWT(token)
  console.log('📋 Decoded token:', decoded)
  
  if (decoded.exp && decoded.expiredIn < 0) {
    console.log('⏰ Token is EXPIRED!')
  } else if (decoded.expiredIn) {
    console.log('✅ Token is valid for:', Math.floor(decoded.expiredIn / 1000 / 60), 'minutes')
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).checkTokenStatus = checkTokenStatus
  ;(window as any).decodeJWT = decodeJWT
}