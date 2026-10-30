// Identidad por navegador (sin login): quién es admin, quién es "yo" y el PIN
// de cada grupo se guardan en localStorage, para que no se vuelvan a pedir
// en visitas futuras desde el mismo navegador. Todo acceso va en try/catch
// porque localStorage puede no estar disponible (modo privado, etc.).

function adminTokenKey(groupId: string) {
  return `gastos-admin:${groupId}`;
}

function memberIdKey(groupId: string) {
  return `gastos-member:${groupId}`;
}

function pinKey(groupId: string) {
  return `gastos-pin:${groupId}`;
}

export function getAdminToken(groupId: string): string | null {
  try {
    return localStorage.getItem(adminTokenKey(groupId));
  } catch {
    return null;
  }
}

export function setAdminToken(groupId: string, token: string) {
  try {
    localStorage.setItem(adminTokenKey(groupId), token);
  } catch {
    // no hay nada razonable que hacer si el navegador bloquea el storage
  }
}

export function getStoredMemberId(groupId: string): string | null {
  try {
    return localStorage.getItem(memberIdKey(groupId));
  } catch {
    return null;
  }
}

export function setStoredMemberId(groupId: string, memberId: string) {
  try {
    localStorage.setItem(memberIdKey(groupId), memberId);
  } catch {
    // ídem
  }
}

export function getStoredPin(groupId: string): string | null {
  try {
    return localStorage.getItem(pinKey(groupId));
  } catch {
    return null;
  }
}

export function setStoredPin(groupId: string, pin: string) {
  try {
    localStorage.setItem(pinKey(groupId), pin);
  } catch {
    // ídem
  }
}
