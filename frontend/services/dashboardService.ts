// frontend/services/dashboardService.ts
// Story 9-3: Admin Dashboard Real Data Service
// CRIT-1/2 FIX: Added user stats support
// HIGH-3 FIX: Use relative URL for proxy compatibility

export interface TrendDataPoint {
  label: string;
  value: number;
  fullDate?: string;
}

export interface ActivityItem {
  id: string | number;
  type: 'signup' | 'api_key' | 'alert';
  user: string;
  time: string;
  desc: string;
}

export interface AdminStats {
  // Basic stats
  totalUsers: number;
  totalContacts: number;
  contactsThisWeek: number;
  
  // API stats
  totalApiKeys: number;
  activeApiKeys: number;
  
  // Trends
  userGrowthTrend: TrendDataPoint[];
  contactTrend: TrendDataPoint[];
  newUsersThisWeek: number;
  growthRate: number;
  
  // UI-FIX: Full source distribution from API
  sourceCounts: Record<string, number>;
  
  // Activity feed
  recentActivity: ActivityItem[];
}

// CRIT-1/2 FIX: New interface for user (non-admin) stats
export interface UserStats {
  myContactCount: number;
  newToday: number;
  optInRate: number;
  contactTrend: TrendDataPoint[];
  newThisWeek: number;
  growthRate: number;
  // UI-FIX: Full source distribution from API
  sourceCounts: Record<string, number>;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// HIGH-3 FIX: Use environment variable or fallback
const getApiBaseUrl = (): string => {
  // Always use Laravel backend URL for API calls
  // In production, this should be configured via environment variable
  return 'http://localhost:8000/api';
};

export const dashboardService = {
  /**
   * Fetch dashboard statistics from API
   * 
   * Story 9-3: Admin Dashboard Real Data
   * CRIT-1/2 FIX: Returns different data based on user role
   * - Admin: full platform stats (AdminStats)
   * - User: personal contact stats (UserStats)
   */
  async getStats(): Promise<AdminStats | UserStats> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${getApiBaseUrl()}/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to fetch dashboard stats');
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Check if stats response is admin stats (has userGrowthTrend)
   */
  isAdminStats(stats: AdminStats | UserStats): stats is AdminStats {
    return 'userGrowthTrend' in stats;
  },

  /**
   * CRIT-1/2 FIX: Check if stats response is user stats (has myContactCount but no userGrowthTrend)
   */
  isUserStats(stats: AdminStats | UserStats): stats is UserStats {
    return 'myContactCount' in stats && !('userGrowthTrend' in stats);
  },
};

export default dashboardService;
