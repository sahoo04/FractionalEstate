"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useReadContract, useAccount } from "wagmi";
import { CONTRACTS, PROPERTY_SHARE_1155_ABI } from "@/lib/contracts";
import { BuySharesForm } from "@/components/BuySharesForm";
import { ClaimRewards } from "@/components/ClaimRewards";
import { WalletButton } from "@/components/WalletButton";
import { getImageUrl } from "@/lib/image-utils";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
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
  Building2,
  DollarSign,
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
  const tokenId = Number(params.id);
  const { isSeller } = useAuth();
  const { address } = useAccount();
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [marketplaceListings, setMarketplaceListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            Loading property details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Property Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "This property does not exist or has been removed"}
          </p>
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-web3-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse Properties
          </Link>
        </div>
      </div>
    );
  }

  const totalSupplyValue = (totalSupply as bigint) || 0n;
  const totalShares = BigInt(property.total_shares);
  const availableShares = totalShares - totalSupplyValue;
  const fundingProgress =
    (Number(totalSupplyValue) / Number(totalShares)) * 100;

  // Get property images with fallback
  const images =
    property.images && property.images.length > 0
      ? property.images
          .map((img) => getImageUrl(img))
          .filter((url): url is string => url !== null && url !== "")
      : [];

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
        ];

  const pricePerShare = parseFloat(property.price_per_share);
  const totalValue = property.total_shares * pricePerShare;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Modern Sticky Navigation */}
      <nav className="bg-white/90 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <span className="text-2xl font-bold">
                <span className="bg-gradient-to-r from-primary-600 to-web3-600 bg-clip-text text-transparent">
                  Fractional
                </span>
                <span className="text-gray-900">Stay</span>
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-primary-600 font-medium transition-colors rounded-xl hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <WalletButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image Gallery - Modern Design */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-card border border-gray-100">
              <div
                className="relative h-[500px] group cursor-pointer"
                onClick={() =>
                  setActiveImageIndex((activeImageIndex + 1) % images.length)
                }
              >
                <img
                  src={images[activeImageIndex]}
                  alt={property.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                {/* Property Type Badge */}
                <div className="absolute top-6 left-6">
                  <span className="px-5 py-2.5 bg-white/95 backdrop-blur-md rounded-xl text-sm font-bold text-gray-900 shadow-lg flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {property.property_type}
                  </span>
                </div>

                {/* Status Badge */}
                <div className="absolute top-6 right-6">
                  <span
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg backdrop-blur-md flex items-center gap-2 ${
                      property.status === "ACTIVE"
                        ? "bg-gradient-to-r from-success-500 to-success-600 text-white"
                        : "bg-white/95 text-gray-900"
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {property.status}
                  </span>
                </div>

                {/* Image Counter */}
                {images.length > 1 && (
                  <div className="absolute bottom-6 right-6">
                    <div className="px-4 py-2 bg-black/70 backdrop-blur-md rounded-xl text-white text-sm font-semibold">
                      {activeImageIndex + 1} / {images.length}
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50">
                  {images.slice(0, 4).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative h-24 rounded-xl overflow-hidden transition-all ${
                        activeImageIndex === idx
                          ? "ring-4 ring-primary-500 scale-105"
                          : "hover:ring-2 hover:ring-primary-300 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`View ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Property Info Card - Modern Layout */}
            <div className="bg-white rounded-2xl shadow-card p-8 border border-gray-100">
              {/* Owner Badge */}
              {isOwner && (
                <div className="mb-6 p-6 bg-gradient-to-br from-primary-50 via-purple-50 to-web3-50 border-2 border-primary-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-primary-500 to-web3-500 rounded-2xl shadow-lg">
                        <Shield className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          You Own This Property!
                          <span className="text-2xl">🎉</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Holding {userSharesOwned} shares (
                          {(
                            (userSharesOwned / property.total_shares) *
                            100
                          ).toFixed(2)}
                          % ownership)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-web3-600 bg-clip-text text-transparent">
                        {userSharesOwned}
                      </div>
                      <div className="text-xs text-gray-600 font-semibold">
                        SHARES
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-4 bg-white rounded-xl border-2 border-primary-100 shadow-sm">
                      <div className="text-xs text-gray-600 font-semibold mb-1">
                        Your Investment
                      </div>
                      <div className="font-bold text-gray-900 text-xl">
                        ${(userSharesOwned * pricePerShare).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-xl border-2 border-web3-100 shadow-sm">
                      <div className="text-xs text-gray-600 font-semibold mb-1">
                        Est. Monthly
                      </div>
                      <div className="font-bold text-success-600 text-xl">
                        +${(userSharesOwned * pricePerShare * 0.008).toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Property Title & Location */}
              <div className="mb-6">
                <div className="flex items-center gap-2 text-gray-600 mb-3">
                  <MapPin className="w-5 h-5 text-primary-500" />
                  <span className="font-medium">
                    {property.city}, {property.state}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-sm">{property.location}</span>
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-3 break-words">
                  {property.name}
                </h1>
                <p className="text-gray-600 text-lg leading-relaxed break-words">
                  {property.description ||
                    "A premium real estate investment opportunity featuring tokenized shares on the blockchain. Earn passive income through fractional ownership of high-value properties."}
                </p>
              </div>

              {/* Key Stats Grid - Enhanced */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200">
                  <DollarSign className="w-6 h-6 text-blue-600 mb-2" />
                  <div className="text-sm text-blue-600 font-semibold mb-1">
                    Total Value
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    ${(totalValue / 1000).toFixed(0)}K
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 border border-green-200">
                  <Users className="w-6 h-6 text-green-600 mb-2" />
                  <div className="text-sm text-green-600 font-semibold mb-1">
                    Total Shares
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {property.total_shares.toLocaleString()}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 border border-purple-200">
                  <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
                  <div className="text-sm text-purple-600 font-semibold mb-1">
                    Price/Share
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    ${pricePerShare.toFixed(2)}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-5 border border-orange-200">
                  <CheckCircle className="w-6 h-6 text-orange-600 mb-2" />
                  <div className="text-sm text-orange-600 font-semibold mb-1">
                    Available
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {Number(availableShares).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Funding Progress Bar */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-gray-700">
                    Funding Progress
                  </span>
                  <span className="text-lg font-bold text-primary-600">
                    {fundingProgress.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-web3-500 rounded-full transition-all duration-1000 ease-out shadow-lg"
                    style={{ width: `${Math.min(fundingProgress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-3 text-sm">
                  <span className="text-gray-600 font-medium">
                    {Number(totalSupplyValue).toLocaleString()} /{" "}
                    {property.total_shares.toLocaleString()} shares sold
                  </span>
                  <span className="text-success-600 font-bold">
                    {Number(availableShares).toLocaleString()} remaining
                  </span>
                </div>
              </div>
            </div>

            {/* Amenities Section */}
            {amenities && amenities.length > 0 && (
              <div className="bg-white rounded-2xl shadow-card p-8 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-primary-100 to-web3-100 rounded-xl">
                    <Home className="w-6 h-6 text-primary-600" />
                  </div>
                  Property Amenities
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {amenities.map((amenity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-primary-50 hover:border-primary-200 border border-gray-200 transition-all"
                    >
                      <CheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0" />
                      <span className="text-gray-900 font-medium text-sm break-words">
                        {amenity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Investment Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Buy Shares Card */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-primary-500 to-web3-500 p-6 text-white">
                  <h2 className="text-2xl font-bold mb-2">Invest Now</h2>
                  <p className="text-white/90 text-sm">
                    Start earning passive income today
                  </p>
                </div>
                <div className="p-6">
                  <BuySharesForm
                    tokenId={tokenId}
                    pricePerShare={BigInt(Math.floor(pricePerShare * 1e6))}
                    availableShares={availableShares}
                  />
                </div>
              </div>

              {/* Claim Rewards Card - Only for Owners */}
              {isOwner && (
                <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-success-500 to-emerald-600 p-6 text-white">
                    <h2 className="text-2xl font-bold mb-2">Claim Rewards</h2>
                    <p className="text-white/90 text-sm">
                      Your rental income is ready
                    </p>
                  </div>
                  <div className="p-6">
                    <ClaimRewards tokenId={tokenId} />
                  </div>
                </div>
              )}

              {/* Property Details Card */}
              <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Property Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <span className="text-gray-600 text-sm">Property Type</span>
                    <span className="font-semibold text-gray-900">
                      {property.property_type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <span className="text-gray-600 text-sm">Location</span>
                    <span className="font-semibold text-gray-900 text-right">
                      {property.city}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <span className="text-gray-600 text-sm">Token ID</span>
                    <span className="font-semibold text-gray-900">
                      #{property.token_id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <span className="text-gray-600 text-sm">Status</span>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        property.status === "ACTIVE"
                          ? "bg-success-100 text-success-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {property.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Listed Date</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(property.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
