import { createClient } from "@supabase/supabase-js";

/**
 * Script to query the actual database schema for the properties table
 * This helps identify mismatches between migration file and actual database
 */

async function queryPropertiesSchema() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://phzglkmanavjvsjeonnh.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg";

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("🔍 Querying properties table schema...\n");

  try {
    // Method 1: Try to query with specific columns to see which exist
    console.log(
      "🔍 Testing which columns exist by querying them individually...\n"
    );

    const columnsToTest = [
      "id",
      "token_id",
      "seller_wallet",
      "name",
      "location",
      "address",
      "city",
      "state",
      "zipcode",
      "description",
      "property_type",
      "category",
      "total_shares",
      "available_shares",
      "price_per_share",
      "images",
      "amenities",
      "metadata_uri",
      "metadata_cid",
      "listing_date",
      "status",
      "created_at",
      "updated_at",
      "contract_address",
      "creation_tx_hash",
      "bedrooms",
      "bathrooms",
      "area",
      "year_built",
      "image_url",
    ];

    const existingColumns: string[] = [];
    const missingColumns: string[] = [];

    // Test each column by trying to select it
    for (const col of columnsToTest) {
      const { error } = await supabase.from("properties").select(col).limit(0);

      if (error) {
        // Check if error is about column not existing
        if (
          error.message.includes("column") &&
          error.message.includes("does not exist")
        ) {
          missingColumns.push(col);
        } else {
          // Other error (might be RLS or table doesn't exist)
          console.log(`⚠️  ${col}: ${error.message.substring(0, 60)}`);
        }
      } else {
        existingColumns.push(col);
      }
    }

    console.log("✅ Columns that EXIST in database:");
    console.log("=".repeat(80));
    existingColumns.forEach((col, idx) => {
      console.log(`${(idx + 1).toString().padStart(3)}. ${col}`);
    });
    console.log("=".repeat(80));

    if (missingColumns.length > 0) {
      console.log("\n❌ Columns that DO NOT exist in database:");
      console.log("=".repeat(80));
      missingColumns.forEach((col, idx) => {
        console.log(`${(idx + 1).toString().padStart(3)}. ${col}`);
      });
      console.log("=".repeat(80));
    }

    // Try to get a sample row if table has data
    const { data: sampleData, error: sampleError } = await supabase
      .from("properties")
      .select("*")
      .limit(1);

    if (!sampleError && sampleData && sampleData.length > 0) {
      console.log("\n📄 Sample row from database:");
      console.log("=".repeat(80));
      const firstRow = sampleData[0];
      Object.entries(firstRow).forEach(([key, value]) => {
        const valueType = Array.isArray(value) ? "array" : typeof value;
        const valuePreview = Array.isArray(value)
          ? `[${value.length} items]`
          : value === null
          ? "null"
          : String(value).substring(0, 50);
        console.log(
          `${key.padEnd(30)} | ${valueType.padEnd(15)} | ${valuePreview}`
        );
      });
      console.log("=".repeat(80));
    } else if (sampleError) {
      console.log("\n⚠️  Could not fetch sample data:", sampleError.message);
    } else {
      console.log("\nℹ️  Table is empty (no sample data available)");
    }

    // Query 2: Get constraints (primary keys, foreign keys, unique, checks)
    console.log("\n🔍 Querying table constraints...\n");

    const { data: constraints, error: constraintsError } = await supabase
      .from("properties")
      .select("*")
      .limit(0);

    // Get a sample property to see actual structure
    const { data: sample, error: sampleErr } = await supabase
      .from("properties")
      .select("*")
      .limit(1)
      .single();

    if (!sampleErr && sample) {
      console.log("\n✅ Actual properties table structure (from sample row):");
      console.log("=".repeat(80));
      Object.entries(sample).forEach(([key, value]) => {
        const valueType = Array.isArray(value) ? "array" : typeof value;
        const valuePreview = Array.isArray(value)
          ? `[${value.length} items]`
          : value === null
          ? "null"
          : String(value).substring(0, 50);
        console.log(
          `${key.padEnd(30)} | ${valueType.padEnd(15)} | ${valuePreview}`
        );
      });
      console.log("=".repeat(80));
    }

    // Query 3: Check what the code expects (from TypeScript types)
    console.log("\n📋 Code expectations (from TypeScript types):");
    console.log("=".repeat(80));
    const expectedColumns = [
      "id",
      "token_id",
      "seller_wallet",
      "name",
      "location",
      "address",
      "city",
      "state",
      "zipcode",
      "description",
      "property_type",
      "total_shares",
      "price_per_share",
      "images",
      "amenities",
      "metadata_uri",
      "listing_date",
      "status",
      "created_at",
      "updated_at",
    ];
    expectedColumns.forEach((col, idx) => {
      console.log(`${idx + 1}. ${col}`);
    });
    console.log("=".repeat(80));

    // Compare actual vs expected
    if (sample) {
      const actualColumns = Object.keys(sample);
      const missingInDB = expectedColumns.filter(
        (col) => !actualColumns.includes(col)
      );
      const extraInDB = actualColumns.filter(
        (col) => !expectedColumns.includes(col)
      );

      console.log("\n🔍 Comparison Results:");
      console.log("=".repeat(80));
      if (missingInDB.length > 0) {
        console.log("\n❌ Columns expected by code but NOT in database:");
        missingInDB.forEach((col) => console.log(`   - ${col}`));
      } else {
        console.log("\n✅ All expected columns exist in database");
      }

      if (extraInDB.length > 0) {
        console.log("\n⚠️  Columns in database but NOT expected by code:");
        extraInDB.forEach((col) => console.log(`   - ${col}`));
      } else {
        console.log("\n✅ No extra columns in database");
      }

      // Check token_id type specifically
      if (sample.token_id !== undefined) {
        const tokenIdType = typeof sample.token_id;
        const tokenIdValue = sample.token_id;
        console.log(`\n🔑 token_id analysis:`);
        console.log(`   Type: ${tokenIdType}`);
        console.log(`   Value: ${tokenIdValue}`);
        console.log(`   Is Number: ${typeof tokenIdValue === "number"}`);
        console.log(`   Is String: ${typeof tokenIdValue === "string"}`);
        if (typeof tokenIdValue === "string" && tokenIdValue.length > 10) {
          console.log(
            `   ⚠️  WARNING: token_id looks like a timestamp (${tokenIdValue.length} chars)`
          );
        }
      }
    }
  } catch (error: any) {
    console.error("❌ Error querying schema:", error);
  }
}

// Run the query
queryPropertiesSchema()
  .then(() => {
    console.log("\n✅ Schema query complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
