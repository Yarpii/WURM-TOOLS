export interface DashboardStats {
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
    completeness: number;
    missing_fields: string[];
  };
  orders: {
    total: number;
    active: number;
    completed: number;
    buy: number;
    sell: number;
  };
  projects: {
    total: number;
    in_progress: number;
    completed: number;
    total_items: number;
    active_projects: Array<{
      id: number;
      name: string;
      progress: number;
      item_count: number;
    }>;
  };
  merchants: {
    total: number;
    active: number;
  };
  alliances: {
    member_of: number;
    is_leader: boolean;
    alliance_name: string | null;
  };
  trades: {
    total_matches: number;
    completed: number;
    pending: number;
  };
  reputation: {
    avg_rating: number;
    total_ratings: number;
  };
  achievements: {
    unlocked: number;
    total_xp: number;
    level: number;
  };
  treasures: {
    total_hunts: number;
    active_hunts: number;
    completed_hunts: number;
    shared_with_me: number;
    total_loot: number;
  };
  timers: {
    total: number;
    active: number;
    recent: Array<{
      id: number;
      name: string;
      timer_type: string;
      end_time: string;
    }>;
  };
  characters: {
    total: number;
    main_character: {
      name: string;
      server: string;
      is_premium: boolean;
    } | null;
  };
  leaderboard: {
    rank: number;
    total_players: number;
  };
  skills: {
    total: number;
    at_goal: number;
    closest_to_goal: Array<{
      id: number;
      skill_name: string;
      current_level: number;
      target_level: number;
      progress: number;
    }>;
  };
  events: {
    upcoming: Array<{
      id: number;
      title: string;
      event_type: string;
      start_date: string;
      server: string;
      status: string;
    }>;
  };
  activity: {
    recent_orders: Array<{
      id: number;
      order_type: string;
      item_name: string;
      quantity: number;
      status: string;
      created_at: string;
    }>;
    recent_hunts: Array<{
      id: number;
      name: string;
      status: string;
      server: string;
      updated_at: string;
    }>;
  };
}
