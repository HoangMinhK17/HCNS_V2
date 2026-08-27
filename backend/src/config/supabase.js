
import { createClient } from "@supabase/supabase-js";

let _client = null;

export const getSupabase = () => {
  if (_client) return _client;

  const rawUrl      = process.env.SUPABASE_URL?.trim() || "";
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "");
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    console.warn("[Supabase] ⚠️ Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.");
    return null;
  }

  _client = createClient(supabaseUrl, supabaseKey);
  return _client;
};

export default { getSupabase };
