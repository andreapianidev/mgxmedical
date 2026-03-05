import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function parseCookies(req) {
  return cookie.parse(req.headers.cookie || '');
}

export function verifyToken(req) {
  const cookies = parseCookies(req);
  const token = cookies.msm_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireAuth(req, res) {
  const payload = verifyToken(req);
  if (!payload) {
    res.status(401).json({ error: 'Non autenticato' });
    return null;
  }
  return payload;
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function setAuthCookie(res, token) {
  res.setHeader('Set-Cookie', cookie.serialize('msm_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  }));
}

export function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', cookie.serialize('msm_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  }));
}
