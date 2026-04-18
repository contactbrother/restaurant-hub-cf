export type UserRole = "super_admin" | "restaurant_admin";

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  restaurant_id: string | null;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  image_url: string | null;
  name: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: Restaurant;
        Insert: Partial<Restaurant> & { name: string; slug: string };
        Update: Partial<Restaurant>;
        Relationships: [];
      };
      user_profiles: {
        Row: UserProfile;
        Insert: Partial<UserProfile> & { id: string; role: UserRole };
        Update: Partial<UserProfile>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: Partial<Category> & { restaurant_id: string; name: string };
        Update: Partial<Category>;
        Relationships: [];
      };
      menu_items: {
        Row: MenuItem;
        Insert: Partial<MenuItem> & { restaurant_id: string; name: string; price: number };
        Update: Partial<MenuItem>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
