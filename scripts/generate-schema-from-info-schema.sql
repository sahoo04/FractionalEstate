-- SQL Script to Generate Complete Database Schema
-- Run this in Supabase SQL Editor to get the exact schema
-- Then copy the output to your migration file

-- This script queries information_schema to get the complete database structure

-- Get all tables
SELECT 
    '-- Table: ' || table_name || E'\n' ||
    'CREATE TABLE IF NOT EXISTS public.' || table_name || ' (' || E'\n' ||
    string_agg(
        '    ' || column_name || ' ' || 
        CASE 
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            WHEN data_type = 'ARRAY' THEN udt_name || '[]'
            WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
            WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
            WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
            ELSE upper(data_type)
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE 
            WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
            ELSE ''
        END,
        ',' || E'\n'
        ORDER BY ordinal_position
    ) ||
    E'\n);' || E'\n'
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- Get all indexes
SELECT 
    'CREATE INDEX IF NOT EXISTS ' || indexname || ' ON ' || schemaname || '.' || tablename || '(' || 
    string_agg(attname, ', ' ORDER BY attnum) || ');'
FROM pg_indexes
JOIN pg_class ON pg_class.relname = indexname
JOIN pg_index ON pg_index.indexrelid = pg_class.oid
JOIN pg_attribute ON pg_attribute.attrelid = pg_index.indrelid AND pg_attribute.attnum = ANY(pg_index.indkey)
WHERE schemaname = 'public'
GROUP BY indexname, schemaname, tablename
ORDER BY tablename, indexname;

-- Get all foreign keys
SELECT 
    'ALTER TABLE ' || tc.table_schema || '.' || tc.table_name || 
    ' ADD CONSTRAINT ' || tc.constraint_name || 
    ' FOREIGN KEY (' || kcu.column_name || ') ' ||
    'REFERENCES ' || ccu.table_schema || '.' || ccu.table_name || 
    '(' || ccu.column_name || ');'
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Get all check constraints
SELECT 
    'ALTER TABLE ' || table_schema || '.' || table_name || 
    ' ADD CONSTRAINT ' || constraint_name || 
    ' CHECK (' || check_clause || ');'
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
    AND tc.table_schema = 'public'
ORDER BY table_name;

-- Get all RLS policies
SELECT 
    'CREATE POLICY "' || policyname || '"' || E'\n' ||
    '    ON ' || schemaname || '.' || tablename || E'\n' ||
    '    FOR ' || cmd || E'\n' ||
    CASE 
        WHEN qual IS NOT NULL THEN '    USING (' || qual || ')' || E'\n'
        ELSE ''
    END ||
    CASE 
        WHEN with_check IS NOT NULL THEN '    WITH CHECK (' || with_check || ');' || E'\n'
        ELSE ';' || E'\n'
    END
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

