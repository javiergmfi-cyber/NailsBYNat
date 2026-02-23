import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

const SUPABASE_URL = "https://xibrtyjhkqewtbgtrbuk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpYnJ0eWpoa3Fld3RiZ3RyYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODA2NTksImV4cCI6MjA4NzQ1NjY1OX0.ddG5GB02iyHUiYEOkqhGHsx1lWkzsDLwLaaZ_vIdr_Q";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpYnJ0eWpoa3Fld3RiZ3RyYnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg4MDY1OSwiZXhwIjoyMDg3NDU2NjU5fQ.K8FRcvTiTOajd0AfSgunMHC7mz-2Z47BuPW0i4QE-KY";

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in Server Components (read-only)
          }
        },
      },
    }
  );
}

export async function createAdminSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in Server Components
          }
        },
      },
    }
  );
}
