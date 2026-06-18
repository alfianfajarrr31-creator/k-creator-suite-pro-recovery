import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

if (!isSupabaseConfigured()) {
  console.warn("Supabase belum dikonfigurasi. Cek VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di Vercel Environment Variables.");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
