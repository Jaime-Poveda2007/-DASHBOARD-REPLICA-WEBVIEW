import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bnwudhsqanzibcychihb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJud3VkaHNxYW56aWJjeWNoaWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MDE2NDcsImV4cCI6MjA5NTA3NzY0N30.yffx_Kq2rhJnqukxXSs4oeAwAoq8Nsm_QDVd-Z8mNbA';

export const supabase = createClient(supabaseUrl, supabaseKey);