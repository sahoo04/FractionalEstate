-- ============================================================================
-- COMPLETE DATABASE SCHEMA EXPORT SCRIPT
-- ============================================================================
-- Run this script in Supabase SQL Editor to get the EXACT schema
-- Copy the output and update your migration file
-- ============================================================================

-- Step 1: Export all table structures
DO $$
DECLARE
    r RECORD;
    col_record RECORD;
    sql_output TEXT := '';
    col_def TEXT;
    pk_cols TEXT[];
    fk_info RECORD;
BEGIN
    -- Loop through all tables
    FOR r IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        sql_output := sql_output || E'\n-- ============================================================================\n';
        sql_output := sql_output || '-- ' || UPPER(r.table_name) || ' TABLE\n';
        sql_output := sql_output || '-- ============================================================================\n';
        sql_output := sql_output || 'CREATE TABLE IF NOT EXISTS public.' || r.table_name || ' (\n';
        
        -- Get columns
        FOR col_record IN
            SELECT 
                c.column_name,
                c.data_type,
                c.udt_name,
                c.character_maximum_length,
                c.numeric_precision,
                c.numeric_scale,
                c.is_nullable,
                c.column_default,
                c.is_identity,
                CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
            FROM information_schema.columns c
            LEFT JOIN (
                SELECT ku.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku
                    ON tc.constraint_name = ku.constraint_name
                WHERE tc.constraint_type = 'PRIMARY KEY'
                    AND tc.table_schema = 'public'
                    AND tc.table_name = r.table_name
            ) pk ON c.column_name = pk.column_name
            WHERE c.table_schema = 'public'
                AND c.table_name = r.table_name
            ORDER BY c.ordinal_position
        LOOP
            col_def := '    ' || col_record.column_name || ' ';
            
            -- Determine data type
            IF col_record.data_type = 'USER-DEFINED' THEN
                col_def := col_def || col_record.udt_name;
            ELSIF col_record.data_type = 'ARRAY' THEN
                col_def := col_def || col_record.udt_name || '[]';
            ELSIF col_record.data_type = 'character varying' THEN
                IF col_record.character_maximum_length IS NOT NULL THEN
                    col_def := col_def || 'VARCHAR(' || col_record.character_maximum_length || ')';
                ELSE
                    col_def := col_def || 'TEXT';
                END IF;
            ELSIF col_record.data_type = 'character' THEN
                col_def := col_def || 'CHAR(' || col_record.character_maximum_length || ')';
            ELSIF col_record.data_type = 'numeric' THEN
                col_def := col_def || 'NUMERIC(' || col_record.numeric_precision || ',' || col_record.numeric_scale || ')';
            ELSIF col_record.data_type = 'double precision' THEN
                col_def := col_def || 'DOUBLE PRECISION';
            ELSIF col_record.data_type = 'bigint' THEN
                col_def := col_def || 'BIGINT';
            ELSIF col_record.data_type = 'integer' THEN
                col_def := col_def || 'INTEGER';
            ELSIF col_record.data_type = 'boolean' THEN
                col_def := col_def || 'BOOLEAN';
            ELSIF col_record.data_type = 'timestamp with time zone' THEN
                col_def := col_def || 'TIMESTAMPTZ';
            ELSIF col_record.data_type = 'timestamp without time zone' THEN
                col_def := col_def || 'TIMESTAMP';
            ELSIF col_record.data_type = 'date' THEN
                col_def := col_def || 'DATE';
            ELSIF col_record.data_type = 'jsonb' THEN
                col_def := col_def || 'JSONB';
            ELSE
                col_def := col_def || UPPER(col_record.data_type);
            END IF;
            
            -- Add PRIMARY KEY
            IF col_record.is_primary_key THEN
                col_def := col_def || ' PRIMARY KEY';
            END IF;
            
            -- Add IDENTITY
            IF col_record.is_identity = 'YES' THEN
                col_def := col_def || ' GENERATED ALWAYS AS IDENTITY';
            END IF;
            
            -- Add NOT NULL
            IF col_record.is_nullable = 'NO' AND NOT col_record.is_primary_key THEN
                col_def := col_def || ' NOT NULL';
            END IF;
            
            -- Add DEFAULT
            IF col_record.column_default IS NOT NULL THEN
                -- Clean up default value
                col_def := col_def || ' DEFAULT ' || col_record.column_default;
            END IF;
            
            sql_output := sql_output || col_def || E',\n';
        END LOOP;
        
        -- Remove trailing comma and newline
        sql_output := RTRIM(sql_output, E',\n') || E'\n);\n\n';
        
        -- Add indexes
        sql_output := sql_output || '-- Indexes for ' || r.table_name || E'\n';
        FOR col_record IN
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = 'public'
                AND tablename = r.table_name
            ORDER BY indexname
        LOOP
            sql_output := sql_output || 'CREATE INDEX IF NOT EXISTS ' || col_record.indexname || 
                         ' ON ' || REPLACE(col_record.indexdef, 'CREATE INDEX ', '') || E';\n';
        END LOOP;
        
        sql_output := sql_output || E'\n';
        
        -- Add foreign keys
        sql_output := sql_output || '-- Foreign Keys for ' || r.table_name || E'\n';
        FOR fk_info IN
            SELECT 
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
                AND tc.table_name = r.table_name
            ORDER BY tc.constraint_name
        LOOP
            sql_output := sql_output || 'ALTER TABLE public.' || r.table_name || 
                         ' ADD CONSTRAINT ' || fk_info.constraint_name || 
                         ' FOREIGN KEY (' || fk_info.column_name || ') ' ||
                         'REFERENCES public.' || fk_info.foreign_table_name || 
                         '(' || fk_info.foreign_column_name || ') ON DELETE CASCADE;' || E'\n';
        END LOOP;
        
        -- Add check constraints
        FOR col_record IN
            SELECT constraint_name, check_clause
            FROM information_schema.table_constraints tc
            JOIN information_schema.check_constraints cc 
                ON tc.constraint_name = cc.constraint_name
            WHERE tc.constraint_type = 'CHECK'
                AND tc.table_schema = 'public'
                AND tc.table_name = r.table_name
            ORDER BY constraint_name
        LOOP
            sql_output := sql_output || 'ALTER TABLE public.' || r.table_name || 
                         ' ADD CONSTRAINT ' || col_record.constraint_name || 
                         ' CHECK (' || col_record.check_clause || ');' || E'\n';
        END LOOP;
        
        sql_output := sql_output || E'\n';
        
        -- Add RLS
        sql_output := sql_output || 'ALTER TABLE public.' || r.table_name || ' ENABLE ROW LEVEL SECURITY;' || E'\n\n';
        
        -- Add RLS Policies
        FOR col_record IN
            SELECT policyname, cmd, qual, with_check
            FROM pg_policies
            WHERE schemaname = 'public'
                AND tablename = r.table_name
            ORDER BY policyname
        LOOP
            sql_output := sql_output || 'CREATE POLICY "' || col_record.policyname || '"' || E'\n';
            sql_output := sql_output || '    ON public.' || r.table_name || E'\n';
            sql_output := sql_output || '    FOR ' || col_record.cmd || E'\n';
            IF col_record.qual IS NOT NULL THEN
                sql_output := sql_output || '    USING (' || col_record.qual || ')' || E'\n';
            END IF;
            IF col_record.with_check IS NOT NULL THEN
                sql_output := sql_output || '    WITH CHECK (' || col_record.with_check || ');' || E'\n';
            ELSE
                sql_output := sql_output || ';' || E'\n';
            END IF;
        END LOOP;
        
        sql_output := sql_output || E'\n';
    END LOOP;
    
    -- Output the result
    RAISE NOTICE '%', sql_output;
END $$;

