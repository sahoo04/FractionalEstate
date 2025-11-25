"use client";

import React, { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { supabase } from "@/lib/supabase";
import { CONTRACTS, REVENUE_SPLITTER_ABI } from "@/lib/contracts";
import { formatUnits } from "viem";
import {
  Home,
  MapPin,
  DollarSign,
  Calendar,
  ExternalLink,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { MintUSDCButton } from "@/components/MintUSDCButton";

interface Property {
  id: number;
  name: string;
  city: string;
  state: string;
  token_id: number;
}

interface PropertyDetails {
  id: string;
  token_id: number;
  name: string;
  city: string;
  state: string;
  address: string;
  location: string;
}

interface PropertyCardsProps {
  assignedProperties: number[];
  address: string;
  propertyDetailsMap?: Record<number, PropertyDetails>;
  onDepositClick: (
    propertyId: number,
    propertyDetails?: PropertyDetails
  ) => void;
}

export function PropertyCards({
  assignedProperties,
  address,
  propertyDetailsMap,
  onDepositClick,
}: PropertyCardsProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAmounts, setPendingAmounts] = useState<Record<number, bigint>>(
    {}
  );
  const [lastDeposits, setLastDeposits] = useState<Record<number, string>>({});

  // Fetch property details
  useEffect(() => {
    const fetchProperties = async () => {
      if (!supabase || assignedProperties.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("properties")
          .select("id, name, city, state, address, location, token_id")
          .in("token_id", assignedProperties);

        if (error) {
          console.error("Error fetching properties:", error);
          setProperties([]);
        } else {
          setProperties(data || []);
        }
      } catch (error) {
        console.error("Error fetching properties:", error);
        setProperties([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, [assignedProperties]);

  // Fetch last deposit dates
  useEffect(() => {
    const fetchLastDeposits = async () => {
      if (!supabase || !address || assignedProperties.length === 0) return;

      try {
        const lowerAddress = address.toLowerCase();
        const deposits: Record<number, string> = {};

        for (const propertyId of assignedProperties) {
          const { data } = await supabase
            .from("rent_deposits")
            .select("created_at")
            .eq("ward_boy_address", lowerAddress)
            .eq("property_id", propertyId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (data && data.length > 0) {
            const deposit = data[0] as { created_at: string };
            if (deposit?.created_at) {
              deposits[propertyId] = deposit.created_at;
            }
          }
        }

        setLastDeposits(deposits);
      } catch (error) {
        console.error("Error fetching last deposits:", error);
      }
    };

    fetchLastDeposits();
  }, [address, assignedProperties]);

  // Fetch pending amounts from contract
  useEffect(() => {
    const fetchPendingAmounts = async () => {
      const amounts: Record<number, bigint> = {};

      for (const propertyId of assignedProperties) {
        try {
          // This will be done via useReadContract hooks, but for now we'll use a simple approach
          // In a real implementation, you'd use multiple useReadContract hooks or a custom hook
        } catch (error) {
          console.error(
            `Error fetching pending amount for property ${propertyId}:`,
            error
          );
        }
      }
    };

    if (assignedProperties.length > 0) {
      fetchPendingAmounts();
    }
  }, [assignedProperties]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-100 rounded-2xl p-6 animate-pulse h-64"
          />
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border-2 border-gray-200">
        <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <Home className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-900 font-bold text-lg mb-2">
          No Properties Found
        </p>
        <p className="text-gray-600 mb-6">
          Property details will appear here once available.
        </p>
        {/* Mint USDC Button for Testing */}
        <div className="mt-6">
          <MintUSDCButton variant="default" showBalance={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mint USDC Section for Testing */}
      <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl shadow-lg p-6 border-2 border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Get Test USDC
            </h3>
            <p className="text-sm text-gray-600">
              Mint 10,000 test USDC for free (Testnet only)
            </p>
          </div>
          <MintUSDCButton variant="compact" />
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignedProperties.map((propertyId) => {
          const property = properties.find((p) => p.token_id === propertyId);
          const lastDeposit = lastDeposits[propertyId];
          const pendingAmount = pendingAmounts[propertyId] || 0n;

          return (
            <div
              key={propertyId}
              className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-card p-6 border-2 border-purple-200 hover:border-purple-300 transition-all hover:shadow-lg"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Home className="w-5 h-5 text-purple-600" />
                    <h3 className="text-xl font-bold text-gray-900">
                      {property?.name || `Property #${propertyId}`}
                    </h3>
                  </div>
                  {property && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {property.city}, {property.state}
                      </span>
                    </div>
                  )}
                </div>
                <span className="px-3 py-1 bg-gradient-to-r from-purple-400 to-indigo-400 text-white text-xs font-bold rounded-lg">
                  #{propertyId}
                </span>
              </div>

              {/* Pending Amount */}
              {pendingAmount > 0n && (
                <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Pending Distribution:
                    </span>
                    <span className="font-bold text-yellow-700">
                      ${(parseInt(pendingAmount.toString()) / 1e6).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Last Deposit */}
              {lastDeposit && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-600">Last Deposit:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(lastDeposit).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() =>
                    onDepositClick(propertyId, propertyDetailsMap?.[propertyId])
                  }
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:shadow-md transition-all flex items-center justify-center gap-2 font-semibold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Deposit
                </button>
                <Link
                  href={`/property/${propertyId}`}
                  className="px-4 py-2 bg-white border-2 border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition-all flex items-center justify-center font-semibold text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
