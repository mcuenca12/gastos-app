/** Formatea un entero de pesos colombianos con separador de miles (punto). */
export function formatCOP(amount: number): string {
  return amount.toLocaleString("es-CO");
}

/** Se queda solo con los dígitos de lo que el usuario escribió. */
export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}
