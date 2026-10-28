export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_identity_id: string | null;
          actor_internal_user_id: string | null;
          after_json: Json | null;
          before_json: Json | null;
          client_id: string | null;
          correlation_id: string;
          id: string;
          metadata_safe: Json | null;
          occurred_at: string;
          product_id: string | null;
          reason: string | null;
          source: string;
          target_id: string | null;
          target_type: string;
        };
        Insert: {
          action: string;
          actor_identity_id?: string | null;
          actor_internal_user_id?: string | null;
          after_json?: Json | null;
          before_json?: Json | null;
          client_id?: string | null;
          correlation_id?: string;
          id?: string;
          metadata_safe?: Json | null;
          occurred_at?: string;
          product_id?: string | null;
          reason?: string | null;
          source?: string;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_identity_id?: string | null;
          actor_internal_user_id?: string | null;
          after_json?: Json | null;
          before_json?: Json | null;
          client_id?: string | null;
          correlation_id?: string;
          id?: string;
          metadata_safe?: Json | null;
          occurred_at?: string;
          product_id?: string | null;
          reason?: string | null;
          source?: string;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_identity_id_fkey';
            columns: ['actor_identity_id'];
            isOneToOne: false;
            referencedRelation: 'identities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_logs_actor_internal_user_id_fkey';
            columns: ['actor_internal_user_id'];
            isOneToOne: false;
            referencedRelation: 'internal_users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_logs_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_logs_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      client_addresses: {
        Row: {
          city: string | null;
          client_id: string;
          complement: string | null;
          country: string;
          created_at: string;
          district: string | null;
          id: string;
          number: string | null;
          postal_code: string | null;
          state: string | null;
          street: string | null;
          updated_at: string;
        };
        Insert: {
          city?: string | null;
          client_id: string;
          complement?: string | null;
          country?: string;
          created_at?: string;
          district?: string | null;
          id?: string;
          number?: string | null;
          postal_code?: string | null;
          state?: string | null;
          street?: string | null;
          updated_at?: string;
        };
        Update: {
          city?: string | null;
          client_id?: string;
          complement?: string | null;
          country?: string;
          created_at?: string;
          district?: string | null;
          id?: string;
          number?: string | null;
          postal_code?: string | null;
          state?: string | null;
          street?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_addresses_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      client_contacts: {
        Row: {
          client_id: string;
          created_at: string;
          email: string | null;
          id: string;
          is_primary: boolean;
          name: string;
          phone: string | null;
          role: string | null;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_primary?: boolean;
          name: string;
          phone?: string | null;
          role?: string | null;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_primary?: boolean;
          name?: string;
          phone?: string | null;
          role?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_contacts_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      client_deployments: {
        Row: {
          client_id: string;
          created_at: string;
          deployment_id: string;
          id: string;
          product_id: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          deployment_id: string;
          id?: string;
          product_id: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          deployment_id?: string;
          id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_deployments_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_deployments_deployment_id_product_id_fkey';
            columns: ['deployment_id', 'product_id'];
            isOneToOne: false;
            referencedRelation: 'product_deployments';
            referencedColumns: ['id', 'product_id'];
          },
          {
            foreignKeyName: 'client_deployments_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      client_feature_flags: {
        Row: {
          changed_by: string | null;
          client_id: string;
          enabled: boolean;
          feature_id: string;
          id: string;
          reason: string | null;
          updated_at: string;
        };
        Insert: {
          changed_by?: string | null;
          client_id: string;
          enabled?: boolean;
          feature_id: string;
          id?: string;
          reason?: string | null;
          updated_at?: string;
        };
        Update: {
          changed_by?: string | null;
          client_id?: string;
          enabled?: boolean;
          feature_id?: string;
          id?: string;
          reason?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_feature_flags_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'internal_users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_feature_flags_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_feature_flags_feature_id_fkey';
            columns: ['feature_id'];
            isOneToOne: false;
            referencedRelation: 'product_features';
            referencedColumns: ['id'];
          },
        ];
      };
      client_memberships: {
        Row: {
          client_id: string;
          created_at: string;
          granted_by: string | null;
          id: string;
          identity_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          granted_by?: string | null;
          id?: string;
          identity_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          granted_by?: string | null;
          id?: string;
          identity_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_memberships_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_memberships_granted_by_fkey';
            columns: ['granted_by'];
            isOneToOne: false;
            referencedRelation: 'internal_users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_memberships_identity_id_fkey';
            columns: ['identity_id'];
            isOneToOne: false;
            referencedRelation: 'identities';
            referencedColumns: ['id'];
          },
        ];
      };
      clients: {
        Row: {
          contact_name: string | null;
          created_at: string;
          document: string;
          email: string | null;
          id: string;
          legal_name: string;
          notes: string | null;
          person_type: string;
          phone: string | null;
          relationship_start_date: string;
          status: string;
          trade_name: string | null;
          updated_at: string;
        };
        Insert: {
          contact_name?: string | null;
          created_at?: string;
          document: string;
          email?: string | null;
          id?: string;
          legal_name: string;
          notes?: string | null;
          person_type: string;
          phone?: string | null;
          relationship_start_date?: string;
          status?: string;
          trade_name?: string | null;
          updated_at?: string;
        };
        Update: {
          contact_name?: string | null;
          created_at?: string;
          document?: string;
          email?: string | null;
          id?: string;
          legal_name?: string;
          notes?: string | null;
          person_type?: string;
          phone?: string | null;
          relationship_start_date?: string;
          status?: string;
          trade_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      contract_documents: {
        Row: {
          contract_id: string;
          id: string;
          mime_type: string;
          original_name: string;
          signed_document: boolean;
          size_bytes: number;
          storage_path: string;
          uploaded_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          contract_id: string;
          id?: string;
          mime_type: string;
          original_name: string;
          signed_document?: boolean;
          size_bytes: number;
          storage_path: string;
          uploaded_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          contract_id?: string;
          id?: string;
          mime_type?: string;
          original_name?: string;
          signed_document?: boolean;
          size_bytes?: number;
          storage_path?: string;
          uploaded_at?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contract_documents_contract_id_fkey';
            columns: ['contract_id'];
            isOneToOne: false;
            referencedRelation: 'contracts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contract_documents_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'internal_users';
            referencedColumns: ['id'];
          },
        ];
      };
      contracts: {
        Row: {
          client_id: string;
          created_at: string;
          end_date: string | null;
          id: string;
          notes: string | null;
          reference: string;
          start_date: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          end_date?: string | null;
          id?: string;
          notes?: string | null;
          reference: string;
          start_date: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          end_date?: string | null;
          id?: string;
          notes?: string | null;
          reference?: string;
          start_date?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contracts_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      deployment_versions: {
        Row: {
          actor_id: string | null;
          commit_sha: string;
          deployed_at: string;
          environment_id: string;
          id: string;
          notes: string | null;
          status: string;
        };
        Insert: {
          actor_id?: string | null;
          commit_sha: string;
          deployed_at?: string;
          environment_id: string;
          id?: string;
          notes?: string | null;
          status: string;
        };
        Update: {
          actor_id?: string | null;
          commit_sha?: string;
          deployed_at?: string;
          environment_id?: string;
          id?: string;
          notes?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'deployment_versions_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'internal_users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deployment_versions_environment_id_fkey';
            columns: ['environment_id'];
            isOneToOne: false;
            referencedRelation: 'product_environments';
            referencedColumns: ['id'];
          },
        ];
      };
      environment_access: {
        Row: {
          access_id: string;
          created_at: string;
          environment_id: string;
          id: string;
          membership_id: string;
          status: string;
          valid_until: string | null;
        };
        Insert: {
          access_id: string;
          created_at?: string;
          environment_id: string;
          id?: string;
          membership_id: string;
          status?: string;
          valid_until?: string | null;
        };
        Update: {
          access_id?: string;
          created_at?: string;
          environment_id?: string;
          id?: string;
          membership_id?: string;
          status?: string;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'environment_access_access_id_fkey';
            columns: ['access_id'];
            isOneToOne: false;
            referencedRelation: 'user_product_access';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'environment_access_environment_id_fkey';
            columns: ['environment_id'];
            isOneToOne: false;
            referencedRelation: 'product_environments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'environment_access_membership_id_fkey';
            columns: ['membership_id'];
            isOneToOne: false;
            referencedRelation: 'client_memberships';
            referencedColumns: ['id'];
          },
        ];
      };
      identities: {
        Row: {
          activated_at: string | null;
          auth_user_id: string | null;
          client_id: string | null;
          created_at: string;
          email: string;
          first_name: string;
          id: string;
          job_title: string | null;
          last_name: string;
          phone: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          activated_at?: string | null;
          auth_user_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          email: string;
          first_name: string;
          id?: string;
          job_title?: string | null;
          last_name: string;
          phone?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          activated_at?: string | null;
          auth_user_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          email?: string;
          first_name?: string;
          id?: string;
          job_title?: string | null;
          last_name?: string;
          phone?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'identities_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      infrastructure_resources: {
        Row: {
          created_at: string;
          environment_id: string;
          external_ref: string;
          id: string;
          provider: string;
          resource_type: string;
        };
        Insert: {
          created_at?: string;
          environment_id: string;
          external_ref: string;
          id?: string;
          provider: string;
          resource_type: string;
        };
        Update: {
          created_at?: string;
          environment_id?: string;
          external_ref?: string;
          id?: string;
          provider?: string;
          resource_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'infrastructure_resources_environment_id_fkey';
            columns: ['environment_id'];
            isOneToOne: false;
            referencedRelation: 'product_environments';
            referencedColumns: ['id'];
          },
        ];
      };
      integration_events: {
        Row: {
          actor_context: Json | null;
          correlation_id: string | null;
          created_at: string;
          event_id: string;
          event_type: string;
          id: string;
          occurred_at: string;
          payload: Json;
          published_at: string | null;
          schema_version: number;
        };
        Insert: {
          actor_context?: Json | null;
          correlation_id?: string | null;
          created_at?: string;
          event_id?: string;
          event_type: string;
          id?: string;
          occurred_at?: string;
          payload: Json;
          published_at?: string | null;
          schema_version?: number;
        };
        Update: {
          actor_context?: Json | null;
          correlation_id?: string | null;
          created_at?: string;
          event_id?: string;
          event_type?: string;
          id?: string;
          occurred_at?: string;
          payload?: Json;
          published_at?: string | null;
          schema_version?: number;
        };
        Relationships: [];
      };
      internal_permissions: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      internal_role_permissions: {
        Row: {
          permission_id: string;
          role_id: string;
        };
        Insert: {
          permission_id: string;
          role_id: string;
        };
        Update: {
          permission_id?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'internal_role_permissions_permission_id_fkey';
            columns: ['permission_id'];
            isOneToOne: false;
            referencedRelation: 'internal_permissions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'internal_role_permissions_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'internal_roles';
            referencedColumns: ['id'];
          },
        ];
      };
      internal_roles: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      internal_user_roles: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          internal_user_id: string;
          role_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          internal_user_id: string;
          role_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          internal_user_id?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'internal_user_roles_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'internal_users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'internal_user_roles_internal_user_id_fkey';
            columns: ['internal_user_id'];
            isOneToOne: false;
            referencedRelation: 'internal_users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'internal_user_roles_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'internal_roles';
            referencedColumns: ['id'];
          },
        ];
      };
      internal_users: {
        Row: {
          auth_user_id: string;
          created_at: string;
          email: string;
          first_name: string;
          id: string;
          last_name: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          auth_user_id: string;
          created_at?: string;
          email: string;
          first_name: string;
          id?: string;
          last_name: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string;
          created_at?: string;
          email?: string;
          first_name?: string;
          id?: string;
          last_name?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          identity_id: string;
          sent_at: string | null;
          status: string;
          token_hash: string;
        };
        Insert: {
          accepted_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          expires_at: string;
          id?: string;
          identity_id: string;
          sent_at?: string | null;
          status?: string;
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          identity_id?: string;
          sent_at?: string | null;
          status?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'internal_users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invitations_identity_id_fkey';
            columns: ['identity_id'];
            isOneToOne: false;
            referencedRelation: 'identities';
            referencedColumns: ['id'];
          },
        ];
      };
      license_overrides: {
        Row: {
          created_at: string;
          extra_licenses: number;
          granted_by: string;
          id: string;
          reason: string;
          subscription_id: string;
        };
        Insert: {
          created_at?: string;
          extra_licenses: number;
          granted_by: string;
          id?: string;
          reason: string;
          subscription_id: string;
        };
        Update: {
          created_at?: string;
          extra_licenses?: number;
          granted_by?: string;
          id?: string;
          reason?: string;
          subscription_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'license_overrides_granted_by_fkey';
            columns: ['granted_by'];
            isOneToOne: false;
            referencedRelation: 'internal_users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'license_overrides_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_features: {
        Row: {
          feature_id: string;
          plan_id: string;
        };
        Insert: {
          feature_id: string;
          plan_id: string;
        };
        Update: {
          feature_id?: string;
          plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_features_feature_id_fkey';
            columns: ['feature_id'];
            isOneToOne: false;
            referencedRelation: 'product_features';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_features_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_modules: {
        Row: {
          module_id: string;
          plan_id: string;
        };
        Insert: {
          module_id: string;
          plan_id: string;
        };
        Update: {
          module_id?: string;
          plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_modules_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'product_modules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_modules_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      plans: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          product_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          product_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          product_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plans_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      product_deployments: {
        Row: {
          created_at: string;
          id: string;
          model: string;
          name: string;
          product_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          model?: string;
          name: string;
          product_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          model?: string;
          name?: string;
          product_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_deployments_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      product_environments: {
        Row: {
          created_at: string;
          database_resource_ref: string | null;
          deployment_id: string;
          entry_url: string | null;
          environment: string;
          id: string;
          status: string;
          version_sha: string | null;
        };
        Insert: {
          created_at?: string;
          database_resource_ref?: string | null;
          deployment_id: string;
          entry_url?: string | null;
          environment: string;
          id?: string;
          status?: string;
          version_sha?: string | null;
        };
        Update: {
          created_at?: string;
          database_resource_ref?: string | null;
          deployment_id?: string;
          entry_url?: string | null;
          environment?: string;
          id?: string;
          status?: string;
          version_sha?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'product_environments_deployment_id_fkey';
            columns: ['deployment_id'];
            isOneToOne: false;
            referencedRelation: 'product_deployments';
            referencedColumns: ['id'];
          },
        ];
      };
      product_features: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          module_id: string | null;
          name: string;
          product_id: string;
          status: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          module_id?: string | null;
          name: string;
          product_id: string;
          status?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          module_id?: string | null;
          name?: string;
          product_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_features_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'product_modules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_features_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      product_modules: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          product_id: string;
          status: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          product_id: string;
          status?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          product_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_modules_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      product_roles: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          product_id: string;
          status: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          product_id: string;
          status?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          product_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_roles_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      products: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          entry_url: string | null;
          id: string;
          login_url: string | null;
          logo_path: string | null;
          name: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          entry_url?: string | null;
          id?: string;
          login_url?: string | null;
          logo_path?: string | null;
          name: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          entry_url?: string | null;
          id?: string;
          login_url?: string | null;
          logo_path?: string | null;
          name?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provisioning_jobs: {
        Row: {
          attempts: number;
          created_at: string;
          id: string;
          idempotency_key: string;
          job_type: string;
          last_error: string | null;
          payload: Json;
          status: string;
          target_system: string;
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          id?: string;
          idempotency_key: string;
          job_type: string;
          last_error?: string | null;
          payload: Json;
          status?: string;
          target_system: string;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          id?: string;
          idempotency_key?: string;
          job_type?: string;
          last_error?: string | null;
          payload?: Json;
          status?: string;
          target_system?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscription_features: {
        Row: {
          feature_id: string;
          subscription_id: string;
        };
        Insert: {
          feature_id: string;
          subscription_id: string;
        };
        Update: {
          feature_id?: string;
          subscription_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscription_features_feature_id_fkey';
            columns: ['feature_id'];
            isOneToOne: false;
            referencedRelation: 'product_features';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscription_features_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      subscription_modules: {
        Row: {
          module_id: string;
          subscription_id: string;
        };
        Insert: {
          module_id: string;
          subscription_id: string;
        };
        Update: {
          module_id?: string;
          subscription_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscription_modules_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'product_modules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscription_modules_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          client_id: string;
          contract_id: string;
          created_at: string;
          end_date: string | null;
          grace_days: number;
          id: string;
          implementation_value: number | null;
          license_limit: number;
          monthly_value: number | null;
          notes: string | null;
          plan_id: string | null;
          product_id: string;
          start_date: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          contract_id: string;
          created_at?: string;
          end_date?: string | null;
          grace_days?: number;
          id?: string;
          implementation_value?: number | null;
          license_limit: number;
          monthly_value?: number | null;
          notes?: string | null;
          plan_id?: string | null;
          product_id: string;
          start_date: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          contract_id?: string;
          created_at?: string;
          end_date?: string | null;
          grace_days?: number;
          id?: string;
          implementation_value?: number | null;
          license_limit?: number;
          monthly_value?: number | null;
          notes?: string | null;
          plan_id?: string | null;
          product_id?: string;
          start_date?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_contract_id_fkey';
            columns: ['contract_id'];
            isOneToOne: false;
            referencedRelation: 'contracts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      support_incidents: {
        Row: {
          assigned_to: string | null;
          client_id: string;
          created_at: string;
          created_by: string;
          description: string | null;
          environment_id: string | null;
          id: string;
          product_id: string | null;
          resolved_at: string | null;
          severity: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          client_id: string;
          created_at?: string;
          created_by: string;
          description?: string | null;
          environment_id?: string | null;
          id?: string;
          product_id?: string | null;
          resolved_at?: string | null;
          severity?: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          client_id?: string;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          environment_id?: string | null;
          id?: string;
          product_id?: string | null;
          resolved_at?: string | null;
          severity?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'support_incidents_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'internal_users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_incidents_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_incidents_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'internal_users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_incidents_environment_id_fkey';
            columns: ['environment_id'];
            isOneToOne: false;
            referencedRelation: 'product_environments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_incidents_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      user_access_features: {
        Row: {
          feature_id: string;
          user_product_access_id: string;
        };
        Insert: {
          feature_id: string;
          user_product_access_id: string;
        };
        Update: {
          feature_id?: string;
          user_product_access_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_access_features_feature_id_fkey';
            columns: ['feature_id'];
            isOneToOne: false;
            referencedRelation: 'product_features';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_access_features_user_product_access_id_fkey';
            columns: ['user_product_access_id'];
            isOneToOne: false;
            referencedRelation: 'user_product_access';
            referencedColumns: ['id'];
          },
        ];
      };
      user_access_modules: {
        Row: {
          module_id: string;
          user_product_access_id: string;
        };
        Insert: {
          module_id: string;
          user_product_access_id: string;
        };
        Update: {
          module_id?: string;
          user_product_access_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_access_modules_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'product_modules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_access_modules_user_product_access_id_fkey';
            columns: ['user_product_access_id'];
            isOneToOne: false;
            referencedRelation: 'user_product_access';
            referencedColumns: ['id'];
          },
        ];
      };
      user_product_access: {
        Row: {
          client_id: string;
          created_at: string;
          id: string;
          identity_id: string;
          membership_id: string;
          product_role_id: string;
          status: string;
          subscription_id: string;
          suspended_at: string | null;
          suspended_reason: string | null;
          updated_at: string;
          valid_from: string;
          valid_until: string | null;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          id?: string;
          identity_id: string;
          membership_id: string;
          product_role_id: string;
          status?: string;
          subscription_id: string;
          suspended_at?: string | null;
          suspended_reason?: string | null;
          updated_at?: string;
          valid_from?: string;
          valid_until?: string | null;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          id?: string;
          identity_id?: string;
          membership_id?: string;
          product_role_id?: string;
          status?: string;
          subscription_id?: string;
          suspended_at?: string | null;
          suspended_reason?: string | null;
          updated_at?: string;
          valid_from?: string;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'access_membership_client_fk';
            columns: ['membership_id', 'identity_id', 'client_id'];
            isOneToOne: false;
            referencedRelation: 'client_memberships';
            referencedColumns: ['id', 'identity_id', 'client_id'];
          },
          {
            foreignKeyName: 'access_subscription_client_fk';
            columns: ['subscription_id', 'client_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id', 'client_id'];
          },
          {
            foreignKeyName: 'user_product_access_identity_id_fkey';
            columns: ['identity_id'];
            isOneToOne: false;
            referencedRelation: 'identities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_product_access_product_role_id_fkey';
            columns: ['product_role_id'];
            isOneToOne: false;
            referencedRelation: 'product_roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_product_access_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_identity_client_id: { Args: never; Returns: string };
      has_internal_permission: {
        Args: { permission_code: string };
        Returns: boolean;
      };
      is_internal_operator: { Args: never; Returns: boolean };
      replace_internal_operator_roles: {
        Args: {
          p_actor_id: string;
          p_role_codes: string[];
          p_target_id: string;
        };
        Returns: undefined;
      };
      subscription_effective_status: {
        Args: { sub: Database['public']['Tables']['subscriptions']['Row'] };
        Returns: string;
      };
      subscription_license_usage: {
        Args: { p_subscription_id: string };
        Returns: {
          available: number;
          extra_licenses: number;
          license_limit: number;
          used: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
