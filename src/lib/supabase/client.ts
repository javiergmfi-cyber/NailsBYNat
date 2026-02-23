import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

const SUPABASE_URL = "https://xibrtyjhkqewtbgtrbuk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpYnJ0eWpoa3Fld3RiZ3RyYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODA2NTksImV4cCI6MjA4NzQ1NjY1OX0.ddG5GB02iyHUiYEOkqhGHsx1lWkzsDLwLaaZ_vIdr_Q";

export function createClient() {
  return createBrowserClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}
