import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

// Disable Next.js caching for this route - always fetch fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      logger.error("Supabase admin client not configured", {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });
      return NextResponse.json(
        {
          error:
            "Database not configured. Check SUPABASE_SERVICE_ROLE_KEY environment variable.",
        },
        { status: 500 }
      );
    }

    // Fetch all KYC documents
    const { data: kycDocs, error: kycError } = await (supabaseAdmin as any)
      .from("kyc_documents")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (kycError) {
      logger.error("Error fetching KYC documents", kycError, {
        errorCode: kycError.code,
        errorMessage: kycError.message,
      });
      return NextResponse.json(
        { error: "Failed to fetch KYC documents", details: kycError.message },
        { status: 500 }
      );
    }

    // Fetch users separately to get proper names
    const walletAddresses = new Set<string>();
    (kycDocs || []).forEach((doc: any) => {
      if (doc.wallet_address)
        walletAddresses.add(doc.wallet_address.toLowerCase());
      if (doc.user_wallet) walletAddresses.add(doc.user_wallet.toLowerCase());
    });

    // Only fetch users if we have wallet addresses
    let usersData: any[] = [];
    if (walletAddresses.size > 0) {
      const { data } = await (supabaseAdmin as any)
        .from("users")
        .select("wallet_address, name, email")
        .in("wallet_address", Array.from(walletAddresses));
      usersData = data || [];
    }

    // Create a map of wallet address to user data
    const userMap = new Map<string, any>();
    (usersData || []).forEach((user: any) => {
      userMap.set(user.wallet_address?.toLowerCase(), user);
    });

    // Normalize wallet address fields and ensure proper name from users table
    const normalizedData = (kycDocs || []).map((doc: any) => {
      const walletAddr = (
        doc.wallet_address ||
        doc.user_wallet ||
        ""
      ).toLowerCase();
      const user = userMap.get(walletAddr);

      // Clean up full_name - remove null, undefined, empty strings, or invalid values
      let kycFullName = doc.full_name;

      // Validate full_name - it should be a proper string
      if (
        !kycFullName ||
        typeof kycFullName !== "string" ||
        kycFullName.trim() === "" ||
        kycFullName.length < 2 ||
        kycFullName.toLowerCase() === "null" ||
        kycFullName.toLowerCase() === "undefined" ||
        kycFullName.toLowerCase() === "unknown"
      ) {
        kycFullName = null;
      }

      // Priority: user.name (from users table) > cleaned kyc_full_name > wallet address
      // Always prefer users.name as it's the source of truth
      const finalName =
        user?.name && user.name.trim().length > 0
          ? user.name.trim()
          : kycFullName && kycFullName.trim().length > 0
          ? kycFullName.trim()
          : walletAddr && walletAddr.length > 0
          ? `${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}`
          : "Unknown User";

      // Return cleaned document with proper name
      // Keep original full_name from kyc_documents table for details view
      // Use normalized name for list display
      const cleanedDoc = {
        ...doc, // Original kyc_documents data preserved
        wallet_address: doc.wallet_address || doc.user_wallet || walletAddr,
        user_wallet: doc.user_wallet || doc.wallet_address || walletAddr,
        display_name: finalName, // Normalized name for list display (uses users.name if available)
        full_name: doc.full_name, // Original full_name from kyc_documents table (for details)
        user_name: user?.name || null,
        user_email: user?.email || null,
      };

      // Remove any undefined/null debug fields
      Object.keys(cleanedDoc).forEach((key) => {
        if (cleanedDoc[key] === undefined) {
          delete cleanedDoc[key];
        }
      });

      return cleanedDoc;
    });

    logger.info("KYC documents fetched successfully", {
      count: normalizedData?.length || 0,
      pending:
        normalizedData?.filter((d: any) => d.status === "PENDING").length || 0,
      sample: normalizedData.slice(0, 3).map((d: any) => ({
        wallet: d.wallet_address,
        name: d.full_name,
        user_name: d.user_name,
      })),
    });

    // Return with no-cache headers to prevent caching
    return NextResponse.json(
      {
        success: true,
        documents: normalizedData || [],
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
          "Surrogate-Control": "no-store",
          "X-Accel-Expires": "0",
          "X-Cache-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    logger.error("KYC list error", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
