import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

let supabaseInstance: any;

if (isSupabaseConfigured()) {
  try {
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!);
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }
}

if (!supabaseInstance) {
  console.warn("Supabase belum dikonfigurasi. Cek VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di Vercel Environment Variables.");
  
  const dummyAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOAuth: async () => ({ data: null, error: new Error("Supabase is not configured.") }),
    signOut: async () => ({ error: null }),
  };

  const dummyFrom = () => {
    const chain: any = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      delete: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => chain,
      then: (resolve: any) => resolve({ data: null, error: new Error("Supabase is not configured.") }),
    };
    return chain;
  };

  supabaseInstance = {
    auth: dummyAuth,
    from: dummyFrom,
  };
}

export const supabase = supabaseInstance;
