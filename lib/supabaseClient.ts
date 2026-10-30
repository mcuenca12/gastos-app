import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Esto solo debería pasar si olvidaste configurar las variables de entorno.
  // Revisa el README para los pasos de configuración de Supabase.
  console.warn(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en tu .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
