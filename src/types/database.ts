// Generato da Supabase (generate_typescript_types). Non modificare a mano:
// va rigenerato dopo ogni migrazione con lo stesso comando.
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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      benchmark: {
        Row: {
          colore: string
          creato_il: string
          id: string
          isin: string | null
          nome: string
          ordine: number
          user_id: string
        }
        Insert: {
          colore?: string
          creato_il?: string
          id?: string
          isin?: string | null
          nome: string
          ordine?: number
          user_id: string
        }
        Update: {
          colore?: string
          creato_il?: string
          id?: string
          isin?: string | null
          nome?: string
          ordine?: number
          user_id?: string
        }
        Relationships: []
      }
      benchmark_valori: {
        Row: {
          benchmark_id: string
          data: string
          id: number
          valore: number
        }
        Insert: {
          benchmark_id: string
          data: string
          id?: number
          valore: number
        }
        Update: {
          benchmark_id?: string
          data?: string
          id?: number
          valore?: number
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_valori_benchmark_id_fkey"
            columns: ["benchmark_id"]
            isOneToOne: false
            referencedRelation: "benchmark"
            referencedColumns: ["id"]
          },
        ]
      }
      impostazioni: {
        Row: {
          aggiornato_il: string
          dashboard_allocazione_nodo_id: string | null
          liquidita: number
          periodo_grafici: string
          privacy_all_apertura: boolean
          soglia_revisione: number
          tolleranza_punti: number
          user_id: string
        }
        Insert: {
          aggiornato_il?: string
          dashboard_allocazione_nodo_id?: string | null
          liquidita?: number
          periodo_grafici?: string
          privacy_all_apertura?: boolean
          soglia_revisione?: number
          tolleranza_punti?: number
          user_id: string
        }
        Update: {
          aggiornato_il?: string
          dashboard_allocazione_nodo_id?: string | null
          liquidita?: number
          periodo_grafici?: string
          privacy_all_apertura?: boolean
          soglia_revisione?: number
          tolleranza_punti?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impostazioni_dashboard_allocazione_nodo_id_fkey"
            columns: ["dashboard_allocazione_nodo_id"]
            isOneToOne: false
            referencedRelation: "nodi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impostazioni_dashboard_allocazione_nodo_id_fkey"
            columns: ["dashboard_allocazione_nodo_id"]
            isOneToOne: false
            referencedRelation: "v_posizioni"
            referencedColumns: ["nodo_id"]
          },
        ]
      }
      nodi: {
        Row: {
          aggiornato_il: string
          creato_il: string
          fa_parte_pac: boolean
          id: string
          modo_target: string | null
          nome: string | null
          note: string | null
          ordine: number
          pac_dinamizzazione: number | null
          pac_importo: number | null
          parent_id: string | null
          riferimento_id: string | null
          stato: string | null
          tag_definizione_id: string | null
          target_unita: string | null
          target_valore: number | null
          tipo: string
          titolo_id: string | null
          user_id: string
        }
        Insert: {
          aggiornato_il?: string
          creato_il?: string
          fa_parte_pac?: boolean
          id?: string
          modo_target?: string | null
          nome?: string | null
          note?: string | null
          ordine?: number
          pac_dinamizzazione?: number | null
          pac_importo?: number | null
          parent_id?: string | null
          riferimento_id?: string | null
          stato?: string | null
          tag_definizione_id?: string | null
          target_unita?: string | null
          target_valore?: number | null
          tipo: string
          titolo_id?: string | null
          user_id: string
        }
        Update: {
          aggiornato_il?: string
          creato_il?: string
          fa_parte_pac?: boolean
          id?: string
          modo_target?: string | null
          nome?: string | null
          note?: string | null
          ordine?: number
          pac_dinamizzazione?: number | null
          pac_importo?: number | null
          parent_id?: string | null
          riferimento_id?: string | null
          stato?: string | null
          tag_definizione_id?: string | null
          target_unita?: string | null
          target_valore?: number | null
          tipo?: string
          titolo_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nodi_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "nodi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nodi_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_posizioni"
            referencedColumns: ["nodo_id"]
          },
          {
            foreignKeyName: "nodi_riferimento_id_fkey"
            columns: ["riferimento_id"]
            isOneToOne: false
            referencedRelation: "nodi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nodi_riferimento_id_fkey"
            columns: ["riferimento_id"]
            isOneToOne: false
            referencedRelation: "v_posizioni"
            referencedColumns: ["nodo_id"]
          },
          {
            foreignKeyName: "nodi_tag_definizione_id_fkey"
            columns: ["tag_definizione_id"]
            isOneToOne: false
            referencedRelation: "tag_definizioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nodi_titolo_id_fkey"
            columns: ["titolo_id"]
            isOneToOne: false
            referencedRelation: "titoli"
            referencedColumns: ["id"]
          },
        ]
      }
      prezzi: {
        Row: {
          creato_il: string
          data: string
          fonte: string
          id: number
          prezzo: number
          titolo_id: string
          user_id: string
        }
        Insert: {
          creato_il?: string
          data: string
          fonte?: string
          id?: number
          prezzo: number
          titolo_id: string
          user_id: string
        }
        Update: {
          creato_il?: string
          data?: string
          fonte?: string
          id?: number
          prezzo?: number
          titolo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prezzi_titolo_id_fkey"
            columns: ["titolo_id"]
            isOneToOne: false
            referencedRelation: "titoli"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_prezzi: {
        Row: {
          aggiornato_il: string
          attivo: boolean
          chiave_api: string | null
          codice: string
          creato_il: string
          frequenza: string
          id: string
          nome: string
          priorita: number
          ultimo_errore: string | null
          ultimo_ok: string | null
          user_id: string
        }
        Insert: {
          aggiornato_il?: string
          attivo?: boolean
          chiave_api?: string | null
          codice: string
          creato_il?: string
          frequenza?: string
          id?: string
          nome: string
          priorita?: number
          ultimo_errore?: string | null
          ultimo_ok?: string | null
          user_id: string
        }
        Update: {
          aggiornato_il?: string
          attivo?: boolean
          chiave_api?: string | null
          codice?: string
          creato_il?: string
          frequenza?: string
          id?: string
          nome?: string
          priorita?: number
          ultimo_errore?: string | null
          ultimo_ok?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tag_definizioni: {
        Row: {
          aggiornato_il: string
          creato_il: string
          id: string
          modo_target: string
          nome: string
          note: string | null
          target_percentuale: number | null
          user_id: string
        }
        Insert: {
          aggiornato_il?: string
          creato_il?: string
          id?: string
          modo_target: string
          nome: string
          note?: string | null
          target_percentuale?: number | null
          user_id: string
        }
        Update: {
          aggiornato_il?: string
          creato_il?: string
          id?: string
          modo_target?: string
          nome?: string
          note?: string | null
          target_percentuale?: number | null
          user_id?: string
        }
        Relationships: []
      }
      titoli: {
        Row: {
          aggiornato_il: string
          borsa: string | null
          categoria: string
          creato_il: string
          id: string
          isin: string | null
          nome: string
          note: string | null
          provider_id: string | null
          simbolo_provider: string | null
          ter: number | null
          user_id: string
          valuta: string
        }
        Insert: {
          aggiornato_il?: string
          borsa?: string | null
          categoria?: string
          creato_il?: string
          id?: string
          isin?: string | null
          nome: string
          note?: string | null
          provider_id?: string | null
          simbolo_provider?: string | null
          ter?: number | null
          user_id: string
          valuta?: string
        }
        Update: {
          aggiornato_il?: string
          borsa?: string | null
          categoria?: string
          creato_il?: string
          id?: string
          isin?: string | null
          nome?: string
          note?: string | null
          provider_id?: string | null
          simbolo_provider?: string | null
          ter?: number | null
          user_id?: string
          valuta?: string
        }
        Relationships: [
          {
            foreignKeyName: "titoli_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_prezzi"
            referencedColumns: ["id"]
          },
        ]
      }
      transazioni: {
        Row: {
          aggiornato_il: string
          commissioni: number
          creato_il: string
          data: string
          id: string
          importo: number | null
          nodo_id: string
          note: string | null
          origine: string | null
          origine_versamento: string | null
          prezzo_unitario: number | null
          quantita: number
          tipo: string
          user_id: string
        }
        Insert: {
          aggiornato_il?: string
          commissioni?: number
          creato_il?: string
          data: string
          id?: string
          importo?: number | null
          nodo_id: string
          note?: string | null
          origine?: string | null
          origine_versamento?: string | null
          prezzo_unitario?: number | null
          quantita: number
          tipo: string
          user_id: string
        }
        Update: {
          aggiornato_il?: string
          commissioni?: number
          creato_il?: string
          data?: string
          id?: string
          importo?: number | null
          nodo_id?: string
          note?: string | null
          origine?: string | null
          origine_versamento?: string | null
          prezzo_unitario?: number | null
          quantita?: number
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transazioni_nodo_id_fkey"
            columns: ["nodo_id"]
            isOneToOne: false
            referencedRelation: "nodi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transazioni_nodo_id_fkey"
            columns: ["nodo_id"]
            isOneToOne: false
            referencedRelation: "v_posizioni"
            referencedColumns: ["nodo_id"]
          },
        ]
      }
    }
    Views: {
      v_discendenza: {
        Row: {
          antenato_id: string | null
          discendente_id: string | null
          livello: number | null
        }
        Relationships: []
      }
      v_nodo_valore: {
        Row: {
          nodo_id: string | null
          rendimento_calcolabile: boolean | null
          valore: number | null
          versato: number | null
        }
        Relationships: []
      }
      v_posizioni: {
        Row: {
          costo_medio: number | null
          costo_noto: boolean | null
          n_operazioni: number | null
          nodo_id: string | null
          prima_operazione: string | null
          quantita: number | null
          titolo_id: string | null
          ultima_operazione: string | null
          user_id: string | null
          versato_netto: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nodi_titolo_id_fkey"
            columns: ["titolo_id"]
            isOneToOne: false
            referencedRelation: "titoli"
            referencedColumns: ["id"]
          },
        ]
      }
      v_realizzato: {
        Row: {
          nodo_id: string | null
          realizzato: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transazioni_nodo_id_fkey"
            columns: ["nodo_id"]
            isOneToOne: false
            referencedRelation: "nodi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transazioni_nodo_id_fkey"
            columns: ["nodo_id"]
            isOneToOne: false
            referencedRelation: "v_posizioni"
            referencedColumns: ["nodo_id"]
          },
        ]
      }
      v_ter_medio: {
        Row: {
          costo_annuo: number | null
          ter_medio: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_ultimo_prezzo: {
        Row: {
          data: string | null
          prezzo: number | null
          titolo_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prezzi_titolo_id_fkey"
            columns: ["titolo_id"]
            isOneToOne: false
            referencedRelation: "titoli"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals["public"]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
