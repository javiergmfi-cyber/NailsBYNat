export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      services: {
        Row: {
          id: string;
          category: "nails" | "babysitting";
          name: string;
          description: string | null;
          duration_min: number;
          price_cents: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category: "nails" | "babysitting";
          name: string;
          description?: string | null;
          duration_min: number;
          price_cents: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category?: "nails" | "babysitting";
          name?: string;
          description?: string | null;
          duration_min?: number;
          price_cents?: number;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
      };
      availability_rules: {
        Row: {
          id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          slot_duration: number;
          is_active: boolean;
          effective_from: string | null;
          effective_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          slot_duration?: number;
          is_active?: boolean;
          effective_from?: string | null;
          effective_until?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          slot_duration?: number;
          is_active?: boolean;
          effective_from?: string | null;
          effective_until?: string | null;
        };
      };
      availability_slots: {
        Row: {
          id: string;
          date: string;
          start_time: string;
          end_time: string;
          status: "available" | "booked" | "blocked";
          rule_id: string | null;
          booking_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          start_time: string;
          end_time: string;
          status?: "available" | "booked" | "blocked";
          rule_id?: string | null;
          booking_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          status?: "available" | "booked" | "blocked";
          rule_id?: string | null;
          booking_id?: string | null;
        };
      };
      bookings: {
        Row: {
          id: string;
          slot_ids: string[];
          service_id: string;
          category: "nails" | "babysitting";
          status: "pending" | "confirmed" | "declined" | "cancelled" | "completed";
          customer_name: string;
          customer_phone: string;
          customer_email: string;
          customer_notes: string | null;
          num_children: number | null;
          children_ages: string | null;
          address: string | null;
          admin_notes: string | null;
          decline_reason: string | null;
          confirmed_at: string | null;
          declined_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slot_ids: string[];
          service_id: string;
          category: "nails" | "babysitting";
          status?: "pending" | "confirmed" | "declined" | "cancelled" | "completed";
          customer_name: string;
          customer_phone: string;
          customer_email: string;
          customer_notes?: string | null;
          num_children?: number | null;
          children_ages?: string | null;
          address?: string | null;
          admin_notes?: string | null;
          decline_reason?: string | null;
          confirmed_at?: string | null;
          declined_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slot_ids?: string[];
          service_id?: string;
          category?: "nails" | "babysitting";
          status?: "pending" | "confirmed" | "declined" | "cancelled" | "completed";
          customer_name?: string;
          customer_phone?: string;
          customer_email?: string;
          customer_notes?: string | null;
          num_children?: number | null;
          children_ages?: string | null;
          address?: string | null;
          admin_notes?: string | null;
          decline_reason?: string | null;
          confirmed_at?: string | null;
          declined_at?: string | null;
          cancelled_at?: string | null;
          updated_at?: string;
        };
      };
      booking_notifications: {
        Row: {
          id: string;
          booking_id: string;
          type: string;
          channel: string;
          recipient: string;
          sent_at: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          type: string;
          channel: string;
          recipient: string;
          sent_at?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          type?: string;
          channel?: string;
          recipient?: string;
          sent_at?: string | null;
          error?: string | null;
        };
      };
    };
    Functions: {
      claim_consecutive_slots: {
        Args: {
          p_slot_ids: string[];
          p_service_id: string;
          p_category: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_customer_email: string;
          p_customer_notes?: string;
          p_num_children?: number;
          p_children_ages?: string;
          p_address?: string;
        };
        Returns: string | null;
      };
      cancel_booking: {
        Args: { p_booking_id: string };
        Returns: boolean;
      };
      generate_slots: {
        Args: { p_days_ahead?: number };
        Returns: number;
      };
    };
  };
}

// Convenience types
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type AvailabilityRule = Database["public"]["Tables"]["availability_rules"]["Row"];
export type AvailabilitySlot = Database["public"]["Tables"]["availability_slots"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingNotification = Database["public"]["Tables"]["booking_notifications"]["Row"];
