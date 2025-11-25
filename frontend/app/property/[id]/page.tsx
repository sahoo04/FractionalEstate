"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useReadContract, useAccount } from "wagmi";
import { CONTRACTS, PROPERTY_SHARE_1155_ABI } from "@/lib/contracts";
import { BuySharesForm } from "@/components/BuySharesForm";
import { ClaimRewards } from "@/components/ClaimRewards";
import { MainLayout } from "@/components/layouts/MainLayout";
import { InvestmentDialog } from "@/components/InvestmentDialog";
import { getImageUrl } from "@/lib/image-utils";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  Home,
  Ruler,
  Calendar,
  TrendingUp,
  Users,
  Shield,
  CheckCircle,
} from "lucide-react";

interface PropertyData {
  id: string;
  token_id: number;
  seller_wallet: string;
  name: string;
  location: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  description: string;
  property_type: string;
  total_shares: number;
  price_per_share: string;
  images: string[];
  amenities: string[];
  metadata_uri: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export default function PropertyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenId = Number(params.id);
  const { isSeller } = useAuth();
  const { address } = useAccount();
  const isMarketplaceView = searchParams?.get("source") === "marketplace";
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [marketplaceListings, setMarketplaceListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showInvestmentDialog, setShowInvestmentDialog] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [portfolioStats, setPortfolioStats] = useState<{
    shares_owned: number;
    total_invested: number;
  } | null>(null);

  // Fetch user portfolio stats from Supabase
  useEffect(() => {
    const fetchPortfolioStats = async () => {
      if (!address || !tokenId) return;
      try {
        const res = await fetch(`/api/portfolio/${address}/${tokenId}`);
        if (res.ok) {
          const data = await res.json();
          setPortfolioStats({
            shares_owned: data.shares_owned || 0,
            total_invested: parseFloat(data.total_invested || "0"),
          });
        } else {
          setPortfolioStats(null);
        }
      } catch {
        setPortfolioStats(null);
      }
    };
    fetchPortfolioStats();
  }, [address, tokenId, showInvestmentDialog]);

  // Fetch property from database
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/property/${tokenId}`);

        if (!response.ok) {
          throw new Error("Property not found");
        }

        const data = await response.json();
        setProperty(data.property);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperty();
  }, [tokenId]);

  // Fetch marketplace listings for this property
  useEffect(() => {
    const fetchMarketplaceListings = async () => {
      try {
        const response = await fetch("/api/marketplace/listings");
        if (response.ok) {
          const data = await response.json();
          // Filter listings for this property only
          const propertyListings = data.listings.filter(
            (listing: any) => listing.tokenId === tokenId
          );
          setMarketplaceListings(propertyListings);
        }
      } catch (error) {
        console.error("Error fetching marketplace listings:", error);
      }
    };

    fetchMarketplaceListings();
  }, [tokenId]);

  // Fetch blockchain data for totalSupply
  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PROPERTY_SHARE_1155_ABI,
    functionName: "totalSupply",
    args: [BigInt(tokenId)],
  });

  // Fetch user's balance for this property
  const { data: userBalance } = useReadContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PROPERTY_SHARE_1155_ABI,
    functionName: "balanceOf",
    args: address ? [address, BigInt(tokenId)] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const userSharesOwned = userBalance ? Number(userBalance as bigint) : 0;
  const isOwner = userSharesOwned > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Property Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            {error || "This property does not exist"}
          </p>
          <Link href="/" className="text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ---------- Normalization logic for totalSupply (fixes double-counting) ----------
  // totalSupply may be scaled (e.g., minted as shares * 1e18) — detect and normalize.
  const totalSupplyRaw = (totalSupply as bigint) || 0n;
  const totalSharesBig = BigInt(property.total_shares || 0);

  // Common scales to check for
  const commonScales = [
    1n,
    2n,
    1_000n,
    1_000_000n,
    1_000_000_000n,
    1_000_000_000_000n,
    1_000_000_000_000_000n,
    BigInt("1000000000000000000"), // 1e18
  ];

  const detectScale = (raw: bigint, totalShares: bigint) => {
    if (totalShares === 0n) return 1n;
    if (raw === totalShares) return 1n;

    // Check against common scales
    for (const s of commonScales) {
      if (s === 0n) continue;
      // raw == totalShares * s
      if (totalShares * s === raw) return s;
      // raw / s == totalShares (exact)
      if (s !== 1n && raw / s === totalShares && raw % s === 0n) return s;
    }

    // If raw is divisible by totalShares, then scale = raw / totalShares
    if (totalShares > 0n && raw > totalShares && raw % totalShares === 0n) {
      return raw / totalShares;
    }

    // If raw < totalShares and totalShares is divisible by raw, maybe UI stored shares in larger units
    // (rare) — return 1
    return 1n;
  };

  const detectedScale = detectScale(totalSupplyRaw, totalSharesBig);

  // Normalize sharesSold to be in "shares" units (integers)
  let sharesSold = 0;
  if (detectedScale > 1n) {
    sharesSold = Number(totalSupplyRaw / detectedScale);
    console.debug("[PropertyPage] Normalized totalSupply", {
      totalSupplyRaw: totalSupplyRaw.toString(),
      detectedScale: detectedScale.toString(),
      sharesSold,
      totalShares: property.total_shares,
    });
  } else {
    // No scale detected; use raw (but cap to Number safely)
    sharesSold = Number(totalSupplyRaw);
    console.debug("[PropertyPage] totalSupply raw used (no scale detected)", {
      totalSupplyRaw: totalSupplyRaw.toString(),
      totalShares: property.total_shares,
    });
  }

  // Safeguard: sharesSold should not exceed total_shares
  if (sharesSold > property.total_shares) {
    console.warn(
      "[PropertyPage] sharesSold exceeds property.total_shares; capping to total_shares",
      { sharesSold, totalShares: property.total_shares }
    );
    sharesSold = property.total_shares;
  }

  const availableShares = Math.max(0, property.total_shares - sharesSold);
  const fundingProgress =
    property.total_shares > 0 ? (sharesSold / property.total_shares) * 100 : 0;
  // -------------------------------------------------------------------------------

  // Get property images with fallback
  const images =
    property.images && property.images.length > 0
      ? property.images
          .map((img) => getImageUrl(img))
          .filter((url): url is string => url !== null && url !== "")
      : [];

  // Add fallback images if needed
  if (images.length === 0) {
    images.push(
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop"
    );
  }

  const amenities =
    property.amenities && property.amenities.length > 0
      ? property.amenities
      : [
          "Swimming Pool",
          "Valet Parking",
          "Fitness Center",
          "Rooftop Lounge",
          "24/7 Security",
          "High Speed WiFi",
          "Concierge Service",
          "Air Conditioning",
        ];

  // Amenity icons mapping
  const amenityIcons: { [key: string]: string } = {
    "Swimming Pool": "🏊",
    Pool: "🏊",
    "Valet Parking": "🚗",
    Parking: "🅿️",
    "Fitness Center": "💪",
    Gym: "🏋️",
    "Rooftop Lounge": "🏙️",
    "24/7 Security": "🛡️",
    Security: "🛡️",
    "High Speed WiFi": "📶",
    WiFi: "📶",
    "Concierge Service": "🛎️",
    Concierge: "🛎️",
    "Air Conditioning": "❄️",
    AC: "❄️",
    Spa: "🧖",
    Garden: "🌳",
    Elevator: "🛗",
    Balcony: "🏞️",
    Terrace: "🌅",
    "Pet Friendly": "🐕",
    Heating: "🔥",
    Kitchen: "🍳",
    Laundry: "🧺",
    Playground: "🎪",
    "BBQ Area": "🍖",
    Cinema: "🎬",
    Library: "📚",
    Sauna: "♨️",
    Jacuzzi: "🛁",
    "Tennis Court": "🎾",
    "Basketball Court": "🏀",
    "Smart Home": "🏠",
  };

  // Function to get icon for amenity (case-insensitive partial match)
  const getAmenityIcon = (amenity: string): string => {
    const amenityLower = amenity.toLowerCase();

    // Direct match
    if (amenityIcons[amenity]) return amenityIcons[amenity];

    // Partial match
    for (const [key, icon] of Object.entries(amenityIcons)) {
      if (
        amenityLower.includes(key.toLowerCase()) ||
        key.toLowerCase().includes(amenityLower)
      ) {
        return icon;
      }
    }

    // Default icon
    return "✨";
  };

  const pricePerShare = parseFloat(property.price_per_share);
  const investmentAmount = 10 * pricePerShare; // Default 10 shares

  // Revenue calculations
  const monthlyRevenue = Math.round(
    pricePerShare * property.total_shares * 0.008
  ); // ~0.8% of total value
  const platformFeeAmount = monthlyRevenue * 0.1;
  const propertyManagement = monthlyRevenue * 0.05;
  const netRevenue = monthlyRevenue - platformFeeAmount - propertyManagement;

  return (
    <MainLayout>
      <div className="bg-gradient-to-b from-gray-50 to-white">
        {/* Full-Screen Image Gallery Modal */}
        {showImageGallery && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
            <button
              onClick={() => setShowImageGallery(false)}
              className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition z-10"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Main Image */}
            <div className="relative w-full h-full flex items-center justify-center p-16">
              <div className="relative w-full h-full max-w-7xl">
                <Image
                  src={images[activeImageIndex]}
                  alt={`${property.name} - Image ${activeImageIndex + 1}`}
                  fill
                  className="object-contain"
                />
              </div>

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) =>
                        prev === 0 ? images.length - 1 : prev - 1
                      )
                    }
                    className="absolute left-8 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition"
                  >
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) =>
                        prev === images.length - 1 ? 0 : prev + 1
                      )
                    }
                    className="absolute right-8 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition"
                  >
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </>
              )}

              {/* Image Counter */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2">
                <div className="px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-full text-lg font-semibold">
                  {activeImageIndex + 1} / {images.length}
                </div>
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex gap-3 justify-center overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative h-20 w-28 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer transition ${
                      activeImageIndex === idx
                        ? "ring-4 ring-white scale-110"
                        : "ring-2 ring-white/30 hover:ring-white/60 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-primary-600 font-medium transition-colors rounded-xl hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Property Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Modern Image Gallery */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-card">
                <div
                  className="relative h-[500px] group cursor-pointer"
                  onClick={() => setShowImageGallery(true)}
                >
                  <Image
                    src={images[activeImageIndex]}
                    alt={property.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

                  {/* View Gallery Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="px-6 py-3 bg-white/90 backdrop-blur-sm rounded-xl font-semibold text-gray-900 flex items-center gap-2 shadow-lg hover:bg-white transition-colors">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      View All {images.length} Photos
                    </button>
                  </div>

                  {/* Navigation Arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex((prev) =>
                            prev === 0 ? images.length - 1 : prev - 1
                          );
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        <svg
                          className="w-6 h-6 text-gray-900"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex((prev) =>
                            prev === images.length - 1 ? 0 : prev + 1
                          );
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        <svg
                          className="w-6 h-6 text-gray-900"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Property Type Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="px-4 py-2 bg-white/95 backdrop-blur-sm rounded-xl text-sm font-bold text-gray-900 shadow-lg">
                      {property.property_type}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="px-4 py-2 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl text-sm font-bold shadow-lg">
                      {property.status === "active"
                        ? "🔥 Active"
                        : property.status}
                    </span>
                  </div>

                  {/* Image Counter */}
                  {images.length > 1 && (
                    <div className="absolute bottom-4 right-4">
                      <div className="px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white text-sm rounded-lg">
                        {activeImageIndex + 1} / {images.length}
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50">
                  {images.slice(0, 4).map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative h-24 rounded-xl overflow-hidden cursor-pointer transition ${
                        activeImageIndex === idx
                          ? "ring-2 ring-primary-500 ring-offset-2"
                          : "hover:ring-2 hover:ring-primary-300"
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`View ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                      {idx === 3 && images.length > 4 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold">
                          +{images.length - 4}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Property Info Card */}
              <div className="bg-white rounded-2xl shadow-card p-8 border border-gray-100">
                {/* Owner Badge - Ultra Enhanced */}
                {isOwner && (
                  <div className="mb-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-primary-500/10 to-web3-500/10 rounded-3xl blur-xl"></div>
                    <div className="relative p-8 bg-gradient-to-br from-purple-50 via-primary-50 to-web3-50 border-2 border-purple-200 rounded-3xl shadow-lg">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-5">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-web3-500 rounded-2xl blur-md opacity-50"></div>
                            <div className="relative p-4 bg-gradient-to-br from-purple-500 to-web3-500 rounded-2xl shadow-xl">
                              <svg
                                className="w-8 h-8 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-extrabold text-transparent bg-gradient-to-r from-purple-600 via-primary-600 to-web3-600 bg-clip-text mb-2">
                              🎉 You Own This Property!
                            </div>
                            <div className="text-base text-gray-700 font-medium">
                              You hold{" "}
                              <span className="font-bold text-purple-600">
                                {portfolioStats?.shares_owned ??
                                  userSharesOwned}
                              </span>{" "}
                              shares of this premium investment
                            </div>
                          </div>
                        </div>
                        <div className="hidden lg:block text-right bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-md">
                          <div className="text-5xl font-black bg-gradient-to-r from-purple-600 to-web3-600 bg-clip-text text-transparent">
                            {portfolioStats?.shares_owned ?? userSharesOwned}
                          </div>
                          <div className="text-xs text-gray-600 font-bold uppercase tracking-wider mt-1">
                            SHARES
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-5 bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-purple-100 shadow-md hover:shadow-lg transition-shadow">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Your Investment
                          </div>
                          <div className="font-extrabold text-gray-900 text-2xl">
                            $
                            {(
                              (portfolioStats?.shares_owned ??
                                userSharesOwned) * pricePerShare
                            ).toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center p-5 bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-purple-100 shadow-md hover:shadow-lg transition-shadow">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Ownership %
                          </div>
                          <div className="font-extrabold text-purple-600 text-2xl">
                            {(
                              ((portfolioStats?.shares_owned ??
                                userSharesOwned) /
                                property.total_shares) *
                              100
                            ).toFixed(2)}
                            %
                          </div>
                        </div>
                        <div className="text-center p-5 bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-purple-100 shadow-md hover:shadow-lg transition-shadow">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Portfolio Value
                          </div>
                          <div className="font-extrabold text-emerald-600 text-2xl">
                            $
                            {(
                              (portfolioStats?.shares_owned ??
                                userSharesOwned) *
                              pricePerShare *
                              1.05
                            ).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                      </svg>
                      {property.location}
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {property.name}
                    </h1>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                        {property.property_type}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          property.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {property.status}
                      </span>
                      {isOwner && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800 flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          Owner
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 mb-6">
                  {property.description ||
                    "A premium real estate investment opportunity featuring tokenized shares on the blockchain. Earn passive income through fractional ownership of high-value properties with transparent, automated revenue distribution."}
                </p>

                {/* Key Stats */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">
                      Property Value
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      $
                      {((property.total_shares * pricePerShare) / 1000).toFixed(
                        0
                      )}
                      K
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">
                      Total Shares
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {property.total_shares.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">
                      Available Shares
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      {Number(availableShares).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Property Details Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Property Details
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">
                          Location
                        </div>
                        <div className="font-semibold text-gray-900">
                          {property.city}, {property.state}
                        </div>
                        <div className="text-xs text-gray-500">
                          {property.zipcode}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <svg
                          className="w-5 h-5 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">
                          Property Type
                        </div>
                        <div className="font-semibold text-gray-900">
                          {property.property_type}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">
                          Price per Share
                        </div>
                        <div className="font-semibold text-gray-900">
                          ${pricePerShare.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <svg
                          className="w-5 h-5 text-amber-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">
                          Expected APY
                        </div>
                        <div className="font-semibold text-green-600">
                          ~9.6%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Breakdown */}
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 mt-4">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      Revenue Breakdown
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          Monthly Revenue (Est.)
                        </span>
                        <span className="font-bold text-gray-900">
                          ${monthlyRevenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          Platform Fee (10%)
                        </span>
                        <span className="text-red-600">
                          -${platformFeeAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          Property Management (5%)
                        </span>
                        <span className="text-red-600">
                          -${propertyManagement.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                        <span className="font-semibold text-gray-900">
                          Net Revenue to Investors
                        </span>
                        <span className="font-bold text-green-600">
                          ${netRevenue.toFixed(2)}/mo
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="mt-6">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-primary-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                      </svg>
                      Property Amenities
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {amenities.slice(0, 8).map((amenity, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/50 transition-all"
                        >
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary-50 to-web3-50 rounded-lg flex items-center justify-center text-2xl">
                            {getAmenityIcon(amenity)}
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {amenity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Investment Highlights - Enhanced for Owners */}
                  {isOwner ? (
                    <div className="p-6 bg-gradient-to-br from-purple-50 via-primary-50 to-web3-50 rounded-2xl border-2 border-purple-200 mt-4 shadow-lg">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-web3-500 rounded-xl shadow-md">
                          <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        Your Investment Benefits
                      </h4>
                      <div className="space-y-3 text-sm text-gray-700">
                        <div className="flex items-start gap-3 p-3 bg-white/80 rounded-xl border border-purple-100">
                          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-emerald-600 font-bold text-lg">
                              💰
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              Earning Passive Income
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              You receive proportional rental revenue from this
                              property
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-white/80 rounded-xl border border-purple-100">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 font-bold text-lg">
                              📊
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              Portfolio Diversification
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              Own{" "}
                              {(
                                ((portfolioStats?.shares_owned ??
                                  userSharesOwned) /
                                  property.total_shares) *
                                100
                              ).toFixed(2)}
                              % of this premium real estate asset
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-white/80 rounded-xl border border-purple-100">
                          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-amber-600 font-bold text-lg">
                              🔄
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              Liquidity Options
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              Sell your shares anytime on the secondary
                              marketplace
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-white/80 rounded-xl border border-purple-100">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-600 font-bold text-lg">
                              🛡️
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              Blockchain Secured
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              Your{" "}
                              {portfolioStats?.shares_owned ?? userSharesOwned}{" "}
                              shares are ERC-1155 tokens on Arbitrum
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 mt-4">
                      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Why Invest?
                      </h4>
                      <div className="space-y-2 text-sm text-gray-700">
                        <div className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>
                            <strong>Passive Income:</strong> Earn monthly rental
                            income from short-term stays
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>
                            <strong>Low Entry:</strong> Start with just $
                            {(pricePerShare * 10).toFixed(2)} (10 shares
                            minimum)
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>
                            <strong>Blockchain Security:</strong> Your shares
                            are ERC-1155 tokens, fully transparent
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>
                            <strong>Liquidity:</strong> Sell your shares on
                            secondary marketplace anytime
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>
                            <strong>Professional Management:</strong> Property
                            managed by verified professionals
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Secondary Marketplace Listings */}
              {marketplaceListings.length > 0 && (
                <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-full">
                        <svg
                          className="w-6 h-6 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Available on Secondary Market
                        </h2>
                        <p className="text-sm text-gray-600">
                          Buy shares from existing investors
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/marketplace"
                      className="text-sm text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
                    >
                      View All
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {marketplaceListings.map((listing) => {
                      const pricePerShare = parseFloat(listing.pricePerShare);
                      const totalPrice = parseFloat(listing.totalPrice);
                      const isMyListing =
                        address &&
                        listing.sellerWallet.toLowerCase() ===
                          address.toLowerCase();

                      return (
                        <div
                          key={listing.id}
                          className={`p-4 bg-white rounded-lg border-2 transition-all hover:shadow-md ${
                            isMyListing
                              ? "border-yellow-300 bg-yellow-50"
                              : "border-purple-200"
                          }`}
                        >
                          {/* Seller Info */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-sm">
                              <div
                                className={`w-8 h-8 rounded-full ${
                                  isMyListing
                                    ? "bg-yellow-200"
                                    : "bg-purple-200"
                                } flex items-center justify-center`}
                              >
                                <svg
                                  className={`w-4 h-4 ${
                                    isMyListing
                                      ? "text-yellow-700"
                                      : "text-purple-700"
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                              <div>
                                <div className="font-mono text-xs text-gray-600">
                                  {listing.sellerWallet.slice(0, 6)}...
                                  {listing.sellerWallet.slice(-4)}
                                </div>
                                {isMyListing && (
                                  <div className="text-xs font-semibold text-yellow-700">
                                    Your Listing
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(listing.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Listing Details */}
                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">
                                Shares
                              </span>
                              <span className="font-bold text-gray-900 text-lg">
                                {listing.sharesAmount}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">
                                Price/Share
                              </span>
                              <span className="font-semibold text-gray-900">
                                ${pricePerShare.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                              <span className="text-sm font-medium text-gray-700">
                                Total
                              </span>
                              <span className="font-bold text-purple-600 text-xl">
                                $
                                {totalPrice.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Action Button - Enhanced */}
                          {isMyListing ? (
                            <Link
                              href="/dashboard"
                              className="group flex w-full py-3 px-5 text-center justify-center items-center bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-300 font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 gap-2"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span>Manage in Dashboard</span>
                              <svg
                                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </Link>
                          ) : (
                            <Link
                              href="/marketplace"
                              className="group flex w-full py-3 px-5 text-center justify-center items-center bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 gap-2"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                              <span>Buy on Marketplace</span>
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Info Banner */}
                  <div className="mt-4 p-3 bg-white/80 rounded-lg border border-purple-200">
                    <div className="flex items-start gap-2 text-sm">
                      <svg
                        className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="text-gray-700">
                        <strong className="font-semibold">
                          Secondary Market:
                        </strong>{" "}
                        {marketplaceListings
                          .reduce((t, l) => t + Number(l.sharesAmount), 0)
                          .toLocaleString()}{" "}
                        shares listed by existing investors. Prices may differ
                        from the original price. A 2.5% marketplace fee applies
                        (deducted from seller).
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Basic Info Only (No Investment Section) */}
            <div className="lg:col-span-1">
              <div className="card sticky top-24 space-y-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-gray-900">
                      ${pricePerShare.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-600">per share</span>
                  </div>
                </div>

                {/* Funding Progress */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Funding Progress</span>
                    <span className="font-semibold">
                      {fundingProgress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, fundingProgress)}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    {sharesSold.toLocaleString()} of{" "}
                    {property.total_shares.toLocaleString()} shares sold
                  </div>
                </div>

                {/* Investment Section - Enhanced (Regular View) */}
                {!isMarketplaceView && Number(availableShares) > 0 && (
                  <div className="p-6 bg-gradient-to-br from-primary-50 via-white to-web3-50 border-2 border-primary-200 rounded-2xl">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-br from-primary-500 to-web3-500 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      Start Investing
                    </h3>

                    <div className="space-y-3 mb-4">
                      <div className="p-3 bg-white rounded-xl border border-primary-100">
                        <div className="text-xs text-gray-600 mb-1">
                          Available Shares
                        </div>
                        <div className="text-2xl font-bold text-primary-600">
                          {Number(availableShares).toLocaleString()}
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-primary-100">
                        <div className="text-xs text-gray-600 mb-1">
                          Min. Investment (10 shares)
                        </div>
                        <div className="text-xl font-bold text-gray-900">
                          ${(pricePerShare * 10).toFixed(2)}
                        </div>
                      </div>

                      <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                        <div className="text-xs text-green-700 font-medium mb-1">
                          Expected Monthly Return
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          ~${(pricePerShare * 10 * 0.008).toFixed(2)}
                        </div>
                        <div className="text-xs text-green-600">
                          Based on 10 shares (~9.6% APY)
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowInvestmentDialog(true)}
                      className="w-full py-4 bg-gradient-to-r from-primary-600 to-web3-600 text-white font-bold rounded-xl hover:shadow-xl transition-all text-lg group"
                    >
                      <span className="flex items-center justify-center gap-2">
                        Invest Now
                        <svg
                          className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </span>
                    </button>

                    <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold">
                            Secured Investment:
                          </strong>{" "}
                          Your shares are ERC-1155 tokens on the blockchain.
                          Fully transparent and verifiable.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Marketplace Buy/Sell Section */}
                {isMarketplaceView && (
                  <div className="p-6 bg-gradient-to-br from-purple-50 via-white to-pink-50 border-2 border-purple-200 rounded-2xl">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      Buy & Sell Shares
                    </h3>

                    {marketplaceListings.length > 0 ? (
                      <div className="space-y-3 mb-4">
                        <div className="p-3 bg-white rounded-xl border border-purple-100">
                          <div className="text-xs text-gray-600 mb-1">
                            Available Listings
                          </div>
                          <div className="text-2xl font-bold text-purple-600">
                            {marketplaceListings.length}
                          </div>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-purple-100">
                          <div className="text-xs text-gray-600 mb-1">
                            Total Shares Listed
                          </div>
                          <div className="text-xl font-bold text-gray-900">
                            {marketplaceListings
                              .reduce(
                                (sum, l) => sum + Number(l.sharesAmount),
                                0
                              )
                              .toLocaleString()}
                          </div>
                        </div>

                        <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                          <div className="text-xs text-purple-700 font-medium mb-1">
                            Price Range
                          </div>
                          <div className="text-lg font-bold text-purple-600">
                            $
                            {Math.min(
                              ...marketplaceListings.map((l) =>
                                parseFloat(l.pricePerShare)
                              )
                            ).toFixed(2)}{" "}
                            - $
                            {Math.max(
                              ...marketplaceListings.map((l) =>
                                parseFloat(l.pricePerShare)
                              )
                            ).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-white rounded-xl border border-purple-100 mb-4 text-center">
                        <p className="text-sm text-gray-600 mb-3">
                          No active listings for this property yet.
                        </p>
                        {isOwner && (
                          <Link
                            href="/dashboard"
                            className="inline-block px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                          >
                            List Your Shares
                          </Link>
                        )}
                      </div>
                    )}

                    <Link
                      href="/marketplace"
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-xl transition-all text-lg group flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      View Marketplace
                    </Link>

                    {isOwner && (
                      <Link
                        href="/dashboard"
                        className="w-full mt-3 py-3 bg-white border-2 border-purple-300 text-purple-700 font-semibold rounded-xl hover:bg-purple-50 transition-all text-center"
                      >
                        Sell Your Shares
                      </Link>
                    )}

                    <div className="mt-3 p-3 bg-purple-50 rounded-lg text-xs text-purple-700">
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold">
                            Secondary Market:
                          </strong>{" "}
                          Buy shares from other investors or list your own
                          shares for sale. All transactions are secured on the
                          blockchain.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {Number(availableShares) === 0 && (
                  <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Fully Funded
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      This property has reached its funding goal.
                    </p>
                    {marketplaceListings.length > 0 && (
                      <Link
                        href="/marketplace"
                        className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-semibold"
                      >
                        View on Marketplace
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    )}
                  </div>
                )}

                {/* Basic Property Stats */}
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Shares</span>
                    <span className="font-bold text-gray-900">
                      {property.total_shares.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Sold</span>
                    <span className="font-bold text-blue-600">
                      {sharesSold.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Listed on Market
                    </span>
                    <span className="font-bold text-purple-600">
                      {marketplaceListings
                        .reduce((t, l) => t + Number(l.sharesAmount), 0)
                        .toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                    <span className="text-sm font-semibold text-gray-700">
                      Available
                    </span>
                    <span className="font-bold text-green-600 text-lg">
                      {Number(availableShares).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Token ID</span>
                    <span className="font-mono text-sm text-gray-900">
                      #{tokenId}
                    </span>
                  </div>
                </div>

                {/* Blockchain Info */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-xs text-blue-800 space-y-1">
                    <div className="flex items-center gap-1">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>ERC-1155 Token</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Arbitrum Sepolia</span>
                    </div>
                  </div>
                </div>

                {/* ROI Calculator */}
                <div className="mt-6 bg-gradient-to-br from-emerald-50 via-white to-green-50 border-2 border-emerald-200 rounded-2xl overflow-hidden">
                  <div className="p-5 bg-gradient-to-r from-emerald-500 to-green-500">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      ROI Calculator
                    </h3>
                    <p className="text-emerald-50 text-xs mt-1">
                      Calculate your potential returns
                    </p>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Shares
                      </label>
                      <input
                        type="number"
                        min="10"
                        max={Number(availableShares)}
                        defaultValue={10}
                        onChange={(e) => {
                          const shares = parseInt(e.target.value) || 10;
                          const investment = shares * pricePerShare;
                          const monthlyReturn = investment * 0.008;
                          const yearlyReturn = monthlyReturn * 12;

                          const investEl =
                            document.getElementById("calc-investment");
                          const monthlyEl =
                            document.getElementById("calc-monthly");
                          const yearlyEl =
                            document.getElementById("calc-yearly");
                          const roiEl = document.getElementById("calc-roi");

                          if (investEl)
                            investEl.textContent = `$${investment.toFixed(2)}`;
                          if (monthlyEl)
                            monthlyEl.textContent = `$${monthlyReturn.toFixed(
                              2
                            )}`;
                          if (yearlyEl)
                            yearlyEl.textContent = `$${yearlyReturn.toFixed(
                              2
                            )}`;
                          if (roiEl)
                            roiEl.textContent = `${(
                              (yearlyReturn / investment) *
                              100
                            ).toFixed(1)}%`;
                        }}
                        className="w-full px-4 py-3 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white rounded-xl border border-gray-200">
                        <div className="text-xs text-gray-600 mb-1">
                          Investment
                        </div>
                        <div
                          id="calc-investment"
                          className="text-lg font-bold text-gray-900"
                        >
                          ${(10 * pricePerShare).toFixed(2)}
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-gray-200">
                        <div className="text-xs text-gray-600 mb-1">
                          ROI (APY)
                        </div>
                        <div
                          id="calc-roi"
                          className="text-lg font-bold text-emerald-600"
                        >
                          9.6%
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div className="text-xs text-emerald-700 font-medium mb-1">
                          Monthly Return
                        </div>
                        <div
                          id="calc-monthly"
                          className="text-xl font-bold text-emerald-600"
                        >
                          ${(10 * pricePerShare * 0.008).toFixed(2)}
                        </div>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl border border-emerald-300">
                        <div className="text-xs text-emerald-800 font-semibold mb-1">
                          Yearly Return
                        </div>
                        <div
                          id="calc-yearly"
                          className="text-2xl font-bold text-emerald-700"
                        >
                          ${(10 * pricePerShare * 0.008 * 12).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-emerald-200">
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-3 h-3 text-emerald-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Based on ~9.6% APY</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-3 h-3 text-emerald-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Returns paid monthly in USDC</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-3 h-3 text-emerald-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Fully transparent on blockchain</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Share This Property */}
                <div className="mt-6 bg-white border-2 border-gray-200 rounded-2xl p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                    Share This Property
                  </h3>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => {
                        const url = window.location.href;
                        const text = `Check out this investment opportunity: ${property.name} - ${property.location}`;
                        window.open(
                          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                            text
                          )}&url=${encodeURIComponent(url)}`,
                          "_blank"
                        );
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-xl font-semibold transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                      </svg>
                      Twitter
                    </button>

                    <button
                      onClick={() => {
                        const url = window.location.href;
                        window.open(
                          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                            url
                          )}`,
                          "_blank"
                        );
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl font-semibold transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Facebook
                    </button>

                    <button
                      onClick={() => {
                        const url = window.location.href;
                        const text = `Check out this investment opportunity: ${property.name}`;
                        window.open(
                          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                            url
                          )}`,
                          "_blank"
                        );
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl font-semibold transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      LinkedIn
                    </button>

                    <button
                      onClick={() => {
                        const url = window.location.href;
                        navigator.clipboard.writeText(url).then(() => {
                          const btn = document.getElementById("copy-btn-text");
                          if (btn) {
                            const original = btn.textContent;
                            btn.textContent = "Copied!";
                            setTimeout(() => {
                              btn.textContent = original;
                            }, 2000);
                          }
                        });
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-xl font-semibold transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      <span id="copy-btn-text">Copy Link</span>
                    </button>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                    💡 <strong>Tip:</strong> Share with friends and earn
                    referral bonuses when they invest!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Dialog */}
        <InvestmentDialog
          isOpen={showInvestmentDialog}
          onClose={() => setShowInvestmentDialog(false)}
          propertyId={tokenId}
          propertyName={property.name}
          pricePerShare={pricePerShare}
          availableShares={Number(availableShares)}
          onSuccess={() => {
            setShowInvestmentDialog(false);
            // Refetch property and portfolio data for instant UI update
            (async () => {
              try {
                setIsLoading(true);
                const response = await fetch(`/api/property/${tokenId}`);
                if (response.ok) {
                  const data = await response.json();
                  setProperty(data.property);
                }
              } finally {
                setIsLoading(false);
              }
            })();
            (async () => {
              try {
                if (!address || !tokenId) return;
                const res = await fetch(`/api/portfolio/${address}/${tokenId}`);
                if (res.ok) {
                  const data = await res.json();
                  setPortfolioStats({
                    shares_owned: data.shares_owned || 0,
                    total_invested: parseFloat(data.total_invested || "0"),
                  });
                }
              } catch {
                setPortfolioStats(null);
              }
            })();
          }}
        />
      </div>
    </MainLayout>
  );
}
