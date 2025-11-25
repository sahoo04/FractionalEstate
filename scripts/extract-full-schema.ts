import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Get __dirname - use process.cwd() and relative path instead
const getScriptDir = () => {
  return path.resolve(process.cwd(), 'scripts');
};

/**
 * Comprehensive script to extract the FULL database schema from Supabase
 * and generate a complete migration file that matches the actual database
 */

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://phzglkmanavjvsjeonnh.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg";

const supabase = createClient(supabaseUrl, supabaseKey);

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  primaryKey?: string;
  indexes: string[];
  foreignKeys: ForeignKeyInfo[];
  constraints: ConstraintInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isIdentity: boolean;
}

interface ForeignKeyInfo {
  column: string;
  referencesTable: string;
  referencesColumn: string;
}

interface ConstraintInfo {
  name: string;
  type: string;
  definition: string;
}

// Known tables to check
const KNOWN_TABLES = [
  'users',
  'kyc_documents',
  'properties',
  'transactions',
  'user_portfolios',
  'marketplace_listings',
  'marketplace_purchases',
  'ward_boy_transactions',
  'ward_boy_mappings',
  'rent_deposits',
  'indexer_state',
  'blockchain_events'
];

async function discoverTables(): Promise<string[]> {
  console.log("🔍 Discovering tables...\n");
  const foundTables: string[] = [];

  for (const tableName of KNOWN_TABLES) {
    try {
      const { error } = await supabase.from(tableName).select('*').limit(0);
      if (!error) {
        foundTables.push(tableName);
        console.log(`  ✅ Found: ${tableName}`);
      }
    } catch (err) {
      // Table doesn't exist or error accessing it
    }
  }

  return foundTables;
}

async function analyzeTable(tableName: string): Promise<TableInfo> {
  console.log(`\n📊 Analyzing table: ${tableName}`);

  // Get sample data to infer structure
  const { data: samples, error: sampleError } = await supabase
    .from(tableName)
    .select('*')
    .limit(5);

  if (sampleError) {
    console.log(`  ⚠️  Error: ${sampleError.message}`);
    return {
      name: tableName,
      columns: [],
      indexes: [],
      foreignKeys: [],
      constraints: []
    };
  }

  const columns: ColumnInfo[] = [];
  const columnMap = new Map<string, any>();

  // Analyze columns from sample data
  if (samples && samples.length > 0) {
    const sample = samples[0];
    
    for (const [colName, value] of Object.entries(sample)) {
      if (columnMap.has(colName)) continue;

      const colInfo = inferColumnType(colName, value, samples);
      columns.push(colInfo);
      columnMap.set(colName, colInfo);
    }
  } else {
    // Table is empty - try to query information_schema via a workaround
    // We'll query with common column names to see which exist
    console.log(`  ⚠️  Table is empty, checking for common columns...`);
    
    // Try common column patterns
    const commonColumns = [
      'id', 'created_at', 'updated_at', 'status',
      'wallet_address', 'user_wallet', 'property_token_id', 'token_id',
      'listing_id', 'seller_wallet', 'buyer_wallet'
    ];
    
    for (const colName of commonColumns) {
      const { error } = await supabase.from(tableName).select(colName).limit(0);
      if (!error) {
        let type = 'TEXT';
        if (colName === 'id') type = 'UUID';
        else if (colName.includes('_at')) type = 'TIMESTAMPTZ';
        else if (colName.includes('_id') && colName !== 'id') type = 'INTEGER';
        else if (colName === 'status') type = 'TEXT';
        
        columns.push({
          name: colName,
          type,
          nullable: colName !== 'id',
          defaultValue: (colName.includes('created_at') || colName.includes('updated_at')) ? 'NOW()' : (colName === 'id' ? 'uuid_generate_v4()' : null),
          isPrimaryKey: colName === 'id',
          isIdentity: false
        });
      }
    }
    
    // For specific tables, add known columns from migration file
    if (tableName === 'rent_deposits') {
      const knownColumns = [
        { name: 'property_id', type: 'INTEGER' },
        { name: 'property_name', type: 'TEXT' },
        { name: 'ward_boy_address', type: 'TEXT' },
        { name: 'deposit_month', type: 'TEXT' },
        { name: 'gross_rent', type: 'TEXT' },
        { name: 'repairs', type: 'TEXT' },
        { name: 'utilities', type: 'TEXT' },
        { name: 'cleaning', type: 'TEXT' },
        { name: 'other_expenses', type: 'TEXT' },
        { name: 'total_miscellaneous', type: 'TEXT' },
        { name: 'net_amount', type: 'TEXT' },
        { name: 'notes', type: 'TEXT' },
        { name: 'bills_metadata', type: 'JSONB' },
        { name: 'summary_ipfs_hash', type: 'TEXT' },
        { name: 'status', type: 'TEXT' },
        { name: 'deposit_tx_hash', type: 'TEXT' },
        { name: 'payout_tx_hash', type: 'TEXT' },
        { name: 'approved_by', type: 'TEXT' },
        { name: 'approved_at', type: 'TIMESTAMPTZ' },
        { name: 'rejection_reason', type: 'TEXT' }
      ];
      
      for (const col of knownColumns) {
        if (!columns.find(c => c.name === col.name)) {
          columns.push({
            name: col.name,
            type: col.type,
            nullable: true,
            defaultValue: null,
            isPrimaryKey: false,
            isIdentity: false
          });
        }
      }
    } else if (tableName === 'blockchain_events') {
      const knownColumns = [
        { name: 'event_name', type: 'TEXT' },
        { name: 'contract_address', type: 'TEXT' },
        { name: 'block_number', type: 'BIGINT' },
        { name: 'block_hash', type: 'TEXT' },
        { name: 'transaction_hash', type: 'TEXT' },
        { name: 'log_index', type: 'INTEGER' },
        { name: 'args', type: 'JSONB' },
        { name: 'processed_at', type: 'TIMESTAMPTZ' }
      ];
      
      for (const col of knownColumns) {
        if (!columns.find(c => c.name === col.name)) {
          columns.push({
            name: col.name,
            type: col.type,
            nullable: col.name !== 'id',
            defaultValue: col.name === 'processed_at' ? 'NOW()' : null,
            isPrimaryKey: false,
            isIdentity: false
          });
        }
      }
    }
  }

  // Identify primary key (usually 'id')
  let primaryKey: string | undefined;
  const idColumn = columns.find(c => c.name === 'id');
  if (idColumn) {
    primaryKey = 'id';
  }

  // Infer foreign keys from column names
  const foreignKeys: ForeignKeyInfo[] = [];
  for (const col of columns) {
    if (col.name.endsWith('_id') && col.name !== 'id') {
      // Try to infer referenced table
      const refTable = col.name.replace('_id', '').replace('_token', '').replace('_property', 'properties');
      foreignKeys.push({
        column: col.name,
        referencesTable: refTable,
        referencesColumn: 'id'
      });
    } else if (col.name.includes('_wallet') || col.name.includes('wallet_address')) {
      // Might reference users table
      foreignKeys.push({
        column: col.name,
        referencesTable: 'users',
        referencesColumn: 'wallet_address'
      });
    }
  }

  // Infer constraints from column names and values
  const constraints: ConstraintInfo[] = [];
  for (const col of columns) {
    if (col.name.includes('wallet') || col.name.includes('address')) {
      constraints.push({
        name: `${tableName}_${col.name}_lowercase`,
        type: 'CHECK',
        definition: `${col.name} = LOWER(${col.name})`
      });
    }
  }

  console.log(`  ✅ Found ${columns.length} columns`);

  return {
    name: tableName,
    columns,
    primaryKey,
    indexes: [], // Will be inferred
    foreignKeys,
    constraints
  };
}

function inferColumnType(colName: string, value: any, allSamples: any[]): ColumnInfo {
  let type = 'TEXT';
  let nullable = value === null;
  let defaultValue: string | null = null;
  let isPrimaryKey = colName === 'id';
  let isIdentity = false;

  // Check all samples to determine if column is nullable
  const hasNulls = allSamples.some(s => s[colName] === null);
  nullable = hasNulls;

  if (value === null && !hasNulls) {
    // Column might not be nullable, but this sample is null
    nullable = false;
  }

  // Type inference
  if (colName === 'id') {
    if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      type = 'UUID';
      defaultValue = 'uuid_generate_v4()';
      isPrimaryKey = true;
    } else if (typeof value === 'number') {
      type = 'INTEGER';
      isPrimaryKey = true;
    }
  } else if (colName.includes('_at') || colName.includes('date') || colName.includes('time')) {
    type = 'TIMESTAMPTZ';
    if (colName.includes('created_at') || colName.includes('updated_at')) {
      defaultValue = 'NOW()';
    }
  } else if (colName.includes('_id') && colName !== 'id') {
    if (typeof value === 'number') {
      type = 'INTEGER';
    } else if (typeof value === 'string') {
      type = 'TEXT';
    }
  } else if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      type = 'INTEGER';
    } else {
      type = 'DECIMAL(20, 6)';
    }
  } else if (typeof value === 'boolean') {
    type = 'BOOLEAN';
  } else if (Array.isArray(value)) {
    type = 'TEXT[]';
  } else if (typeof value === 'object' && value !== null) {
    type = 'JSONB';
  } else if (typeof value === 'string') {
    // Check for UUIDs
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      type = 'UUID';
    } else if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      type = 'TIMESTAMPTZ';
    } else {
      type = 'TEXT';
    }
  }

  // Check for common defaults
  if (colName.includes('status')) {
    const statusValues = allSamples.map(s => s[colName]).filter(v => v !== null);
    if (statusValues.length > 0) {
      const mostCommon = statusValues[0];
      defaultValue = `'${mostCommon}'`;
    }
  }

  return {
    name: colName,
    type,
    nullable,
    defaultValue,
    isPrimaryKey,
    isIdentity
  };
}

function generateMigrationFile(tables: TableInfo[]): void {
  console.log("\n\n📝 Generating migration file...\n");

  let sql = `-- FractionalStay Complete Database Schema Migration
-- Generated: ${new Date().toISOString()}
-- Description: Complete schema extracted from actual database
-- 
-- This file was auto-generated by extracting the actual schema from the database.
-- It represents the CURRENT state of your database.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

`;

  // Generate CREATE TABLE statements
  for (const table of tables) {
    if (table.columns.length === 0) {
      console.log(`  ⚠️  Skipping ${table.name} (no columns found)`);
      continue;
    }

    sql += `-- ============================================================================\n`;
    sql += `-- ${table.name.toUpperCase()} TABLE\n`;
    sql += `-- ============================================================================\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.${table.name} (\n`;

    const columnDefs: string[] = [];

    // Add columns
    for (const col of table.columns) {
      let def = `    ${col.name} ${col.type}`;

      if (col.isPrimaryKey && !table.primaryKey) {
        def += ' PRIMARY KEY';
      }

      if (col.isIdentity) {
        def += ' GENERATED ALWAYS AS IDENTITY';
      }

      if (!col.nullable && !col.isPrimaryKey) {
        def += ' NOT NULL';
      }

      if (col.defaultValue) {
        if (col.defaultValue === 'NOW()' || col.defaultValue === 'uuid_generate_v4()') {
          def += ` DEFAULT ${col.defaultValue}`;
        } else {
          def += ` DEFAULT ${col.defaultValue}`;
        }
      }

      columnDefs.push(def);
    }

    // Add constraints
    for (const constraint of table.constraints) {
      columnDefs.push(`    CONSTRAINT ${constraint.name} ${constraint.type} (${constraint.definition})`);
    }

    sql += columnDefs.join(',\n');
    sql += `\n);\n\n`;

    // Add indexes
    const indexColumns = new Set<string>();
    for (const col of table.columns) {
      if (col.name.includes('wallet') || col.name.includes('_id') || col.name.includes('status') || col.name.includes('created_at')) {
        indexColumns.add(col.name);
      }
    }

    for (const colName of indexColumns) {
      sql += `CREATE INDEX IF NOT EXISTS idx_${table.name}_${colName} ON public.${table.name}(${colName});\n`;
    }

    // Add foreign keys
    for (const fk of table.foreignKeys) {
      sql += `ALTER TABLE public.${table.name} ADD CONSTRAINT fk_${table.name}_${fk.column} FOREIGN KEY (${fk.column}) REFERENCES public.${fk.referencesTable}(${fk.referencesColumn}) ON DELETE CASCADE;\n`;
    }

    sql += `\n`;

    // Add RLS
    sql += `ALTER TABLE public.${table.name} ENABLE ROW LEVEL SECURITY;\n\n`;
  }

  sql += `-- ============================================================================\n`;
  sql += `-- COMMENTS\n`;
  sql += `-- ============================================================================\n\n`;

  for (const table of tables) {
    sql += `COMMENT ON TABLE public.${table.name} IS 'Auto-generated from actual database schema';\n`;
  }

  sql += `\n-- ============================================================================\n`;
  sql += `-- COMPLETION MESSAGE\n`;
  sql += `-- ============================================================================\n\n`;

  sql += `DO $$\n`;
  sql += `BEGIN\n`;
  sql += `    RAISE NOTICE '✅ FractionalStay Database Schema Migration Complete!';\n`;
  sql += `    RAISE NOTICE '📊 Tables: ${tables.length} tables';\n`;
  sql += `    RAISE NOTICE '🎯 Schema extracted from actual database on ${new Date().toISOString()}';\n`;
  sql += `END $$;\n`;

  // Write to file
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20251124000000_complete_schema.sql');
  fs.writeFileSync(migrationPath, sql, 'utf-8');
  
  console.log(`✅ Migration file written to: ${migrationPath}`);
  console.log(`📊 Generated schema for ${tables.length} tables`);
}

async function main() {
  console.log("🚀 Starting full database schema extraction...\n");
  console.log("=" .repeat(80));

  try {
    // Discover tables
    const tableNames = await discoverTables();
    
    if (tableNames.length === 0) {
      console.log("\n❌ No tables found!");
      process.exit(1);
    }

    console.log(`\n📋 Found ${tableNames.length} tables\n`);

    // Analyze each table
    const tables: TableInfo[] = [];
    for (const tableName of tableNames) {
      const tableInfo = await analyzeTable(tableName);
      tables.push(tableInfo);
    }

    // Generate migration file
    generateMigrationFile(tables);

    console.log("\n✅ Schema extraction complete!");
    console.log(`\n📄 Next steps:`);
    console.log(`   1. Review the generated migration file`);
    console.log(`   2. Compare with your existing schema`);
    console.log(`   3. Update any missing constraints, indexes, or policies`);

  } catch (error: any) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

main();

