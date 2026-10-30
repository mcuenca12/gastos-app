// Identidad por navegador (sin login): quién es admin y quién es "yo" en cada
// grupo se guarda en localStorage, de forma independiente del PIN (que se
// guarda en sessionStorage, ver GroupClient). Todo acceso va en try/catch
// porque localStorage puede no estar disponible (modo privado, etc.).

function adminTokenKey(groupId: string) {
  return `gastos-admin:${groupId}`;
}

function memberIdKey(groupId: string) {
  return `gastos-member:${groupId}`;
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
