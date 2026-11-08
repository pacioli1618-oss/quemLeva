// GENERATED — do not edit by hand. Regenerate after every migration: `npm run db:types`.
// Only the public schema is generated: the app talks to the database through ql_* RPCs.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ql_add_items: {
        Args: { p_host_token: string; p_items: Json; p_slug: string }
        Returns: number
      }
      ql_create_event: {
        Args: {
          p_adults?: number
          p_currency?: string
          p_device_id?: string
          p_event_date?: string
          p_event_time?: string
          p_host_name?: string
          p_kids?: number
          p_kind?: string
          p_locale?: string
          p_location?: string
          p_notes?: string
          p_title: string
        }
        Returns: Json
      }
      ql_delete_item: {
        Args: { p_host_token: string; p_item_id: string; p_slug: string }
        Returns: undefined
      }
      ql_get_event: {
        Args: { p_device_id?: string; p_slug: string }
        Returns: Json
      }
      ql_get_event_as_host: {
        Args: { p_device_id?: string; p_host_token: string; p_slug: string }
        Returns: Json
      }
      ql_invite_participant: {
        Args: { p_host_token: string; p_name: string; p_slug: string }
        Returns: Json
      }
      ql_join_event: {
        Args: {
          p_device_id: string
          p_invite_token?: string
          p_name: string
          p_slug: string
        }
        Returns: string
      }
      ql_open_invite: {
        Args: { p_invite_token: string; p_slug: string }
        Returns: Json
      }
      ql_remove_participant: {
        Args: { p_host_token: string; p_participant_id: string; p_slug: string }
        Returns: undefined
      }
      ql_set_claim: {
        Args: {
          p_amount_spent?: number
          p_device_id: string
          p_item_id: string
          p_note?: string
          p_quantity: number
          p_slug: string
        }
        Returns: Json
      }
      ql_set_rsvp: {
        Args: {
          p_device_id: string
          p_plus_ones?: number
          p_rsvp: string
          p_slug: string
        }
        Returns: undefined
      }
      ql_update_event: {
        Args: { p_host_token: string; p_patch: Json; p_slug: string }
        Returns: undefined
      }
      ql_upsert_item: {
        Args: {
          p_category?: string
          p_host_token: string
          p_item_id: string
          p_name: string
          p_quantity_needed?: number
          p_slug: string
          p_sort?: number
          p_unit?: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
