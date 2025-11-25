"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  Loader2,
  LayoutDashboard,
  FileText,
  History,
  Home,
} from "lucide-react";
import { MainLayout } from "@/components/layouts/MainLayout";
import WardBoyDepositForm from "@/components/WardBoyDepositForm";
import { WardBoyDashboard } from "@/components/ward-boy/WardBoyDashboard";
import { DepositHistory } from "@/components/ward-boy/DepositHistory";
import { PropertyCards } from "@/components/ward-boy/PropertyCards";

type TabType = "overview" | "deposits" | "history" | "properties";

interface PropertyDetails {
  id: string;
  token_id: number;
  name: string;
  city: string;
  state: string;
  address: string;
  location: string;
}

export default function WardBoyPage() {
  const { address, isConnected } = useAccount();
  const [assignedProperties, setAssignedProperties] = useState<number[]>([]);
  const [propertyDetailsMap, setPropertyDetailsMap] = useState<
    Record<number, PropertyDetails>
  >({});
  const [isChecking, setIsChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  useEffect(() => {
    if (!address || !isConnected) {
      setIsChecking(false);
      return;
    }

    // Fast lookup from Supabase database
    const checkAssignedProperties = async () => {
      setIsChecking(true);

      try {
        if (!supabase) {
          setAssignedProperties([]);
          setIsChecking(false);
          return;
        }

        // Query ward_boy_mappings table for this address
        const { data, error } = await supabase
          .from("ward_boy_mappings")
          .select("property_id")
          .eq("ward_boy_address", address.toLowerCase())
          .eq("is_active", true);

        if (error) {
          console.error("Error fetching ward boy properties:", error);
          setAssignedProperties([]);
        } else {
          const propertyIds =
            (data as { property_id: number }[] | null)?.map(
              (row) => row.property_id
            ) || [];
          setAssignedProperties(propertyIds);

          // Fetch property details for all assigned properties
          if (propertyIds.length > 0) {
            const { data: propertiesData, error: propertiesError } =
              await supabase
                .from("properties")
                .select("id, token_id, name, city, state, address, location")
                .in("token_id", propertyIds);

            if (!propertiesError && propertiesData) {
              const detailsMap: Record<number, PropertyDetails> = {};
              (propertiesData as PropertyDetails[]).forEach((prop) => {
                detailsMap[prop.token_id] = prop;
              });
              setPropertyDetailsMap(detailsMap);
            }
          }
        }
      } catch (error) {
        console.error("Error checking ward boy properties:", error);
        setAssignedProperties([]);
      }

      setIsChecking(false);
    };

    checkAssignedProperties();
  }, [address, isConnected]);

  const tabs = [
    { id: "overview" as TabType, label: "Overview", icon: LayoutDashboard },
    { id: "deposits" as TabType, label: "Deposits", icon: FileText },
    { id: "history" as TabType, label: "History", icon: History },
    { id: "properties" as TabType, label: "Properties", icon: Home },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 bg-gradient-to-r from-purple-50 via-white to-indigo-50 rounded-2xl shadow-card p-8 border-2 border-purple-200">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Ward Boy Dashboard
            </h1>
            <p className="mt-3 text-gray-700 font-medium">
              Connect your wallet to access the dashboard (No login required)
            </p>
          </div>

          {/* Not Connected State */}
          {!isConnected && (
            <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-card p-8 text-center">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <span className="text-4xl">👛</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Connect Your Wallet
              </h3>
              <p className="text-gray-700 mb-6 text-lg">
                Ward boys don't need to create an account or complete KYC.
                <br />
                Simply connect your assigned wallet to access the dashboard.
              </p>
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-6 text-gray-900 border-2 border-blue-200">
                <p className="font-bold mb-4 text-lg">How it works:</p>
                <ol className="text-left space-y-2 max-w-md mx-auto">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </span>
                    <span className="font-semibold">
                      Admin assigns your wallet address to a property
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      2
                    </span>
                    <span className="font-semibold">
                      You connect your wallet using the button in top-right
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      3
                    </span>
                    <span className="font-semibold">
                      Dashboard automatically shows your assigned properties
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      4
                    </span>
                    <span className="font-semibold">
                      Submit rent deposits with expense bills
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isChecking && isConnected && (
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-card p-12 flex flex-col items-center justify-center border-2 border-blue-200">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-700 font-semibold text-lg">
                Checking assigned properties...
              </p>
            </div>
          )}

          {/* No Properties Assigned */}
          {!isChecking && isConnected && assignedProperties.length === 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl shadow-card p-6 flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-xl flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-900 mb-3">
                  No Properties Assigned
                </h3>
                <p className="text-sm text-red-800 font-semibold mb-3">
                  You are not assigned as ward boy for any property. Please
                  contact the admin to get assigned.
                </p>
                <p className="text-sm text-red-700 font-mono bg-red-100 px-3 py-2 rounded-lg inline-block">
                  Your wallet: {address}
                </p>
              </div>
            </div>
          )}

          {/* Main Content with Tabs */}
          {!isChecking && isConnected && assignedProperties.length > 0 && (
            <div className="space-y-6">
              {/* Tab Navigation */}
              <div className="bg-white rounded-2xl shadow-card border-2 border-gray-200 overflow-hidden">
                <div className="flex flex-wrap border-b border-gray-200">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 min-w-[120px] px-6 py-4 flex items-center justify-center gap-2 font-semibold transition-all ${
                          activeTab === tab.id
                            ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-b-2 border-purple-600"
                            : "text-gray-600 hover:text-purple-600 hover:bg-purple-50"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === "overview" && (
                    <WardBoyDashboard
                      assignedProperties={assignedProperties}
                      address={address!}
                      onNavigateToDeposits={() => setActiveTab("deposits")}
                    />
                  )}

                  {activeTab === "deposits" && (
                    <div className="space-y-6">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          Submit Rent Deposit
                        </h2>
                        <p className="text-gray-600">
                          Fill out the form below to deposit rent for your
                          assigned properties
                        </p>
                      </div>
                      {assignedProperties.map((propertyId) => (
                        <div key={propertyId} className="space-y-4">
                          <h3 className="text-xl font-bold text-gray-900 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            Property #{propertyId}
                          </h3>
                          <WardBoyDepositForm
                            prefilledPropertyId={propertyId}
                            assignedProperties={assignedProperties}
                            propertyDetails={propertyDetailsMap[propertyId]}
                            onSuccess={() => setActiveTab("overview")}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "history" && (
                    <DepositHistory address={address!} />
                  )}

                  {activeTab === "properties" && (
                    <PropertyCards
                      assignedProperties={assignedProperties}
                      address={address!}
                      onDepositClick={(propertyId) => {
                        setActiveTab("deposits");
                        // Scroll to form could be added here
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
