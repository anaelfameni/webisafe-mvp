import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://xdaanhookclpmdgfibxw.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYWFuaG9va2NscG1kZ2ZpYnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NDM4NzksImV4cCI6MjA5MjAxOTg3OX0.re3k3zqJrvUVX_J_LknyMguhV5_UZcwdhYIDAA8ZbTU";

export const supabase = createClient(supabaseUrl, supabaseKey);