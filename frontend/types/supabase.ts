// Supabase Database Types
// Generated types will go here after running: npx supabase gen types typescript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          wallet_address: string
          role: 'NONE' | 'CLIENT' | 'SELLER' | 'ADMIN'
          kyc_status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'
          name: string
          email: string
          phone: string | null
          business_name: string | null
          profile_image_url: string | null
          created_at: string
          updated_at: string
          last_login: string | null
        }
        Insert: {
          id?: string
          wallet_address: string
          role?: 'NONE' | 'CLIENT' | 'SELLER' | 'ADMIN'
          kyc_status?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'
          name: string
          email: string
          phone?: string | null
          business_name?: string | null
          profile_image_url?: string | null
          created_at?: string
          updated_at?: string
          last_login?: string | null
        }
        Update: {
          id?: string
          wallet_address?: string
          role?: 'NONE' | 'CLIENT' | 'SELLER' | 'ADMIN'
          kyc_status?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'
          name?: string
          email?: string
          phone?: string | null
          business_name?: string | null
          profile_image_url?: string | null
          created_at?: string
          updated_at?: string
          last_login?: string | null
        }
      }
      properties: {
        Row: {
          id: string
          token_id: number
          seller_wallet: string
          name: string
          location: string
          address: string
          city: string
          state: string
          zipcode: string
          description: string
          property_type: 'APARTMENT' | 'VILLA' | 'LAND' | 'COMMERCIAL'
          total_shares: number
          price_per_share: string
          images: string[]
          amenities: string[]
          metadata_uri: string
          listing_date: string
          status: 'DRAFT' | 'ACTIVE' | 'SOLD' | 'DELISTED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          token_id: number
          seller_wallet: string
          name: string
          location: string
          address: string
          city: string
          state: string
          zipcode: string
          description: string
          property_type: 'APARTMENT' | 'VILLA' | 'LAND' | 'COMMERCIAL'
          total_shares: number
          price_per_share: string
          images?: string[]
          amenities?: string[]
          metadata_uri: string
          listing_date?: string
          status?: 'DRAFT' | 'ACTIVE' | 'SOLD' | 'DELISTED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          token_id?: number
          seller_wallet?: string
          name?: string
          location?: string
          address?: string
          city?: string
          state?: string
          zipcode?: string
          description?: string
          property_type?: 'APARTMENT' | 'VILLA' | 'LAND' | 'COMMERCIAL'
          total_shares?: number
          price_per_share?: string
          images?: string[]
          amenities?: string[]
          metadata_uri?: string
          listing_date?: string
          status?: 'DRAFT' | 'ACTIVE' | 'SOLD' | 'DELISTED'
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          tx_hash: string
          type: 'MINT' | 'TRANSFER' | 'PURCHASE' | 'RENT_DEPOSIT' | 'CLAIM'
          from_wallet: string
          to_wallet: string
          token_id: number
          amount: number
          price: string | null
          timestamp: string
          block_number: number
          status: 'PENDING' | 'SUCCESS' | 'FAILED'
          created_at: string
        }
        Insert: {
          id?: string
          tx_hash: string
          type: 'MINT' | 'TRANSFER' | 'PURCHASE' | 'RENT_DEPOSIT' | 'CLAIM'
          from_wallet: string
          to_wallet: string
          token_id: number
          amount: number
          price?: string | null
          timestamp: string
          block_number: number
          status?: 'PENDING' | 'SUCCESS' | 'FAILED'
          created_at?: string
        }
        Update: {
          id?: string
          tx_hash?: string
          type?: 'MINT' | 'TRANSFER' | 'PURCHASE' | 'RENT_DEPOSIT' | 'CLAIM'
          from_wallet?: string
          to_wallet?: string
          token_id?: number
          amount?: number
          price?: string | null
          timestamp?: string
          block_number?: number
          status?: 'PENDING' | 'SUCCESS' | 'FAILED'
          created_at?: string
        }
      }
      kyc_documents: {
        Row: {
          id: string
          wallet_address: string
          full_name: string
          date_of_birth: string | null
          nationality: string | null
          address: string | null
          city: string | null
          state: string | null
          pincode: string | null
          id_type: string | null
          id_number: string | null
          address_proof_type: string | null
          document_hash: string
          status: 'PENDING' | 'APPROVED' | 'REJECTED'
          rejection_reason: string | null
          submitted_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wallet_address: string
          full_name: string
          date_of_birth?: string | null
          nationality?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          pincode?: string | null
          id_type?: string | null
          id_number?: string | null
          address_proof_type?: string | null
          document_hash: string
          status?: 'PENDING' | 'APPROVED' | 'REJECTED'
          rejection_reason?: string | null
          submitted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wallet_address?: string
          full_name?: string
          date_of_birth?: string | null
          nationality?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          pincode?: string | null
          id_type?: string | null
          id_number?: string | null
          address_proof_type?: string | null
          document_hash?: string
          status?: 'PENDING' | 'APPROVED' | 'REJECTED'
          rejection_reason?: string | null
          submitted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_portfolios: {
        Row: {
          id: string
          user_wallet: string
          token_id: number
          property_name: string
          shares_owned: number
          total_invested: string
          total_rewards_claimed: string
          last_updated: string
        }
        Insert: {
          id?: string
          user_wallet: string
          token_id: number
          property_name: string
          shares_owned: number
          total_invested: string
          total_rewards_claimed?: string
          last_updated?: string
        }
        Update: {
          id?: string
          user_wallet?: string
          token_id?: number
          property_name?: string
          shares_owned?: number
          total_invested?: string
          total_rewards_claimed?: string
          last_updated?: string
        }
      }
      ward_boy_mappings: {
        Row: {
          id: string
          property_id: number
          ward_boy_address: string
          assigned_at: string
          assigned_by: string | null
          is_active: boolean
          removed_at: string | null
          removed_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: number
          ward_boy_address: string
          assigned_at: string
          assigned_by?: string | null
          is_active?: boolean
          removed_at?: string | null
          removed_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: number
          ward_boy_address?: string
          assigned_at?: string
          assigned_by?: string | null
          is_active?: boolean
          removed_at?: string | null
          removed_by?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
