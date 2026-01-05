/**
 * Anomaly detection hooks for authentication events
 */

export interface LoginContext {
  userId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
  geoLocation?: {
    country?: string;
    city?: string;
  };
  timestamp: Date;
}

export interface AnomalyResult {
  isAnomalous: boolean;
  severity: 'low' | 'medium' | 'high';
  reasons: string[];
  action?: 'allow' | 'challenge' | 'block';
}

/**
 * Anomaly detection service
 */
export class AnomalyDetector {
  private userLoginHistory: Map<string, LoginContext[]> = new Map();
  private userKnownDevices: Map<string, Set<string>> = new Map();
  private userKnownIPs: Map<string, Set<string>> = new Map();

  /**
   * Detect anomalies in login attempt
   * @param context Login context
   * @param previousLogins Previous login contexts for user (from database)
   * @returns Anomaly detection result
   */
  detectAnomalies(context: LoginContext, previousLogins: LoginContext[] = []): AnomalyResult {
    const reasons: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';
    let action: 'allow' | 'challenge' | 'block' = 'allow';

    // Check for new device
    if (context.deviceId) {
      const knownDevices = this.userKnownDevices.get(context.userId) || new Set();
      if (!knownDevices.has(context.deviceId) && previousLogins.length > 0) {
        reasons.push('New device detected');
        severity = 'medium';
      }
    }

    // Check for unusual IP
    if (previousLogins.length > 0) {
      const knownIPs = new Set(previousLogins.map(login => login.ipAddress));
      if (!knownIPs.has(context.ipAddress)) {
        reasons.push('Login from new IP address');
        if (severity === 'low') severity = 'low';
        else if (severity === 'medium') severity = 'medium';
      }
    }

    // Check for unusual location (if geo data available)
    if (context.geoLocation && previousLogins.length > 0) {
      const previousCountries = new Set(
        previousLogins
          .filter(login => login.geoLocation?.country)
          .map(login => login.geoLocation!.country!)
      );
      if (
        context.geoLocation.country &&
        !previousCountries.has(context.geoLocation.country) &&
        previousCountries.size > 0
      ) {
        reasons.push('Login from new country');
        severity = 'high';
      }
    }

    // Check for impossible travel (same user, different countries in short time)
    if (context.geoLocation && previousLogins.length > 0) {
      const recentLogin = previousLogins[0];
      if (recentLogin.geoLocation?.country && context.geoLocation.country) {
        const timeDiff = context.timestamp.getTime() - recentLogin.timestamp.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        // If login from different country within 2 hours, flag as impossible travel
        if (
          recentLogin.geoLocation.country !== context.geoLocation.country &&
          hoursDiff < 2
        ) {
          reasons.push('Impossible travel detected');
          severity = 'high';
        }
      }
    }

    // Determine action based on severity
    if (severity === 'high') {
      action = 'challenge'; // Require additional verification
    } else if (severity === 'medium') {
      action = 'allow'; // Allow but alert
    }

    return {
      isAnomalous: reasons.length > 0,
      severity,
      reasons,
      action
    };
  }

  /**
   * Record successful login for anomaly detection
   * @param context Login context
   */
  recordLogin(context: LoginContext): void {
    // Update login history
    const history = this.userLoginHistory.get(context.userId) || [];
    history.unshift(context);
    // Keep last 50 logins
    if (history.length > 50) {
      history.pop();
    }
    this.userLoginHistory.set(context.userId, history);

    // Update known devices
    if (context.deviceId) {
      const devices = this.userKnownDevices.get(context.userId) || new Set();
      devices.add(context.deviceId);
      this.userKnownDevices.set(context.userId, devices);
    }

    // Update known IPs
    const ips = this.userKnownIPs.get(context.userId) || new Set();
    ips.add(context.ipAddress);
    this.userKnownIPs.set(context.userId, ips);
  }

  /**
   * Clear user data (for testing or user deletion)
   * @param userId User ID
   */
  clearUserData(userId: string): void {
    this.userLoginHistory.delete(userId);
    this.userKnownDevices.delete(userId);
    this.userKnownIPs.delete(userId);
  }
}

// Singleton instance
export const anomalyDetector = new AnomalyDetector();


