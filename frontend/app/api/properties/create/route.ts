import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

/**
 * POST /api/properties/create
 * Save property to database after blockchain mint
 */
export async function POST(request: Request) {
  try {
    // Check if Supabase is configured
    if (!supabaseAdmin) {
      logger.warn("Property create attempted but Supabase not configured");
      return NextResponse.json(
        {
          message:
            "Database not configured - property saved to blockchain only",
        },
        { status: 200 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const {
      token_id,
      seller_wallet,
      name,
      description,
      location,
      address: propertyAddress,
      city,
      state,
      zipcode,
      property_type,
      total_shares,
      price_per_share,
      images,
      amenities,
      metadata_uri,
      status,
    } = body;

    if (!token_id || !seller_wallet || !name || !location || !property_type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate property_type enum
    const validPropertyTypes = ["APARTMENT", "VILLA", "LAND", "COMMERCIAL"];
    if (!validPropertyTypes.includes(property_type)) {
      logger.error("Invalid property_type", {
        property_type,
        valid: validPropertyTypes,
      });
      return NextResponse.json(
        {
          error: `Invalid property_type. Must be one of: ${validPropertyTypes.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Validate status enum
    const validStatuses = ["DRAFT", "ACTIVE", "SOLD", "DELISTED"];
    const propertyStatus = status || "DRAFT";
    if (!validStatuses.includes(propertyStatus)) {
      logger.error("Invalid status", {
        status: propertyStatus,
        valid: validStatuses,
      });
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Normalize wallet address
    const normalizedAddress = seller_wallet.toLowerCase();

    logger.info("Inserting property into database", {
      token_id,
      seller_wallet: normalizedAddress,
      name,
      property_type,
      status,
    });

    // Check if user exists (foreign key requirement)
    const { data: userData, error: userError } = await (supabaseAdmin as any)
      .from("users")
      .select("wallet_address")
      .eq("wallet_address", normalizedAddress)
      .single();

    if (userError || !userData) {
      logger.warn("User not found in database, creating basic user entry", {
        wallet: normalizedAddress,
      });

      // Create basic user entry if doesn't exist
      await (supabaseAdmin as any)
        .from("users")
        .insert([
          {
            wallet_address: normalizedAddress,
            role: "SELLER",
            kyc_status: "NONE",
            name: "Seller", // Default name
            email: `${normalizedAddress.slice(0, 10)}@temp.com`, // Temporary email
          },
        ])
        .select()
        .single();

      logger.info("Created basic user entry for seller", {
        wallet: normalizedAddress,
      });
    }

    // Insert property
    // Ensure token_id is a number (INTEGER in database)
    const tokenIdNumber =
      typeof token_id === "string" ? parseInt(token_id, 10) : Number(token_id);

    if (isNaN(tokenIdNumber)) {
      logger.error("Invalid token_id format", {
        token_id,
        type: typeof token_id,
      });
      return NextResponse.json(
        { error: "Invalid token_id format" },
        { status: 400 }
      );
    }

    const { data, error } = await (supabaseAdmin as any)
      .from("properties")
      .insert([
        {
          token_id: tokenIdNumber, // INTEGER, not String
          seller_wallet: normalizedAddress,
          name,
          description,
          location,
          address: propertyAddress || location,
          city: city || "Unknown",
          state: state || "Unknown",
          zipcode: zipcode || "000000",
          property_type: property_type.toUpperCase(), // Ensure uppercase
          total_shares: Number(total_shares) || 100,
          price_per_share,
          images: images || [],
          amenities: amenities || [],
          metadata_uri,
          status: propertyStatus.toUpperCase(), // Ensure uppercase
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error("Failed to save property to database", {
        error,
        token_id,
        property_type,
      });
      throw error;
    }

    logger.info("Property saved to database", {
      token_id,
      name,
      owner: normalizedAddress,
    });

    return NextResponse.json({
      success: true,
      property: data,
    });
  } catch (error: any) {
    logger.error("Error in property create API", { error });
    return NextResponse.json(
      { error: error.message || "Failed to save property" },
      { status: 500 }
    );
  }
}
