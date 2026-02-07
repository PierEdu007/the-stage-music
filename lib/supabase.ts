
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = '⚠️ ERROR CRÍTICO: Variables de Supabase no configuradas en Netlify. Asegúrate de agregar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el panel de Netlify.';
    console.error(errorMsg);
    if (typeof window !== 'undefined') {
        // Expose error to global for debugging
        (window as any).SUPABASE_CONFIG_ERROR = errorMsg;
    }
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
