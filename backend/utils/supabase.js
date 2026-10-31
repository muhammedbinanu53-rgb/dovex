const { createClient } = require("@supabase/supabase-js");

let client;

function isSupabaseConfigured() {
  const hasUrl = Boolean(process.env.SUPABASE_URL);
  const hasKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (hasUrl !== hasKey) {
    throw new Error("Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or leave both unset for local development.");
  }
  return hasUrl && hasKey;
}

function getSupabaseClient() {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  return client;
}

module.exports = { getSupabaseClient, isSupabaseConfigured };
