/**
 * Location-Based Features (Optional Enhancement)
 * Adds social and competitive features based on location
 */

export class LocationBasedFeatures {
  private userLocation: GeolocationCoordinates | null = null;
  private nearbyPlayers: NearbyPlayer[] = [];
  private localTournaments: Tournament[] = [];

  constructor() {
    // Only initialize if user opts in
    this.requestLocationPermission();
  }

  /**
   * Better alternative to geofencing - Location-aware features
   */
  public async enableLocationFeatures(): Promise<LocationFeatures> {
    const features: LocationFeatures = {
      enabled: false,
      availableFeatures: []
    };

    // Check permission
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    if (permission.state === 'granted') {
      features.enabled = true;

      // Get current location (one-time, not continuous)
      const position = await this.getCurrentPosition();
      if (position) {
        this.userLocation = position.coords;

        // Enable features based on location
        features.availableFeatures = [
          'nearby_players',     // Show players in your city
          'local_tournaments',  // Join city/region tournaments
          'local_leaderboard', // Compete locally
          'meetup_events',     // Find local domino clubs
          'cultural_rules'     // Region-specific game variations
        ];

        // Load region-specific content
        await this.loadRegionalContent(position.coords);
      }
    }

    return features;
  }

  /**
   * Get current position (one-time, not continuous tracking)
   */
  private getCurrentPosition(): Promise<GeolocationPosition | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => resolve(null),
        {
          enableHighAccuracy: false, // Don't need precise location
          timeout: 5000,
          maximumAge: 3600000 // Cache for 1 hour
        }
      );
    });
  }

  /**
   * Load regional content and rules
   */
  private async loadRegionalContent(coords: GeolocationCoordinates): Promise<void> {
    // Get country/region from coordinates
    const region = await this.reverseGeocode(coords.latitude, coords.longitude);

    // Load region-specific game rules
    const regionalRules = this.getRegionalRules(region);
    if (regionalRules) {
      this.applyRegionalVariations(regionalRules);
    }

    // Show local tournaments
    this.localTournaments = await this.fetchLocalTournaments(region);

    // Find nearby players (anonymized)
    this.nearbyPlayers = await this.findNearbyPlayers(region);
  }

  /**
   * Region-specific game variations
   */
  private getRegionalRules(region: string): RegionalRules | null {
    const rules: Record<string, RegionalRules> = {
      'Caribbean': {
        defaultMode: 'Cuban',
        specialRules: ['partners', 'capicu_bonus'],
        scoringMultiplier: 1.5
      },
      'Mexico': {
        defaultMode: 'Mexican Train',
        specialRules: ['double_start', 'branching'],
        allowBetting: true
      },
      'Texas': {
        defaultMode: 'Texas 42',
        specialRules: ['bidding', 'trump'],
        tournamentStyle: true
      },
      'UK': {
        defaultMode: 'Block',
        specialRules: ['muggins', 'all_threes'],
        pubStyle: true
      }
    };

    return rules[region] || null;
  }

  /**
   * Find players in the same city/region (privacy-preserving)
   */
  private async findNearbyPlayers(region: string): Promise<NearbyPlayer[]> {
    // Don't share exact location, just city/region
    const response = await fetch('/api/nearby-players', {
      method: 'POST',
      body: JSON.stringify({
        region,
        radius: 50, // 50km radius
        maxResults: 20
      })
    });

    const players = await response.json();

    // Anonymize and show only distance ranges
    return players.map((p: any) => ({
      id: p.id,
      displayName: p.displayName,
      avatar: p.avatar,
      distanceRange: this.getDistanceRange(p.distance), // "< 5km", "5-10km", etc.
      skill: p.skill,
      isOnline: p.isOnline,
      canChallenge: p.acceptingChallenges
    }));
  }

  /**
   * Create location-based tournaments
   */
  public async createLocalTournament(options: TournamentOptions): Promise<Tournament> {
    return {
      id: this.generateId(),
      name: options.name,
      type: 'local',
      region: options.region,
      startDate: options.startDate,
      maxPlayers: options.maxPlayers || 32,
      entryFee: options.entryFee || 0,
      prizes: options.prizes,
      rules: options.rules,
      participants: []
    };
  }

  /**
   * Smart matchmaking based on location AND skill
   */
  public async findMatch(preferences: MatchPreferences): Promise<NearbyPlayer | null> {
    const candidates = this.nearbyPlayers.filter(p => {
      if (!p.isOnline || !p.canChallenge) return false;

      // Match skill level
      const skillDiff = Math.abs(p.skill - preferences.mySkill);
      if (skillDiff > preferences.maxSkillDifference) return false;

      // Match distance preference
      if (preferences.preferLocal) {
        const distance = this.parseDistanceRange(p.distanceRange);
        if (distance > preferences.maxDistance) return false;
      }

      return true;
    });

    // Return best match
    return candidates.length > 0 ? candidates[0] : null;
  }

  /**
   * Privacy-preserving distance ranges
   */
  private getDistanceRange(distance: number): string {
    if (distance < 1) return 'Same neighborhood';
    if (distance < 5) return '< 5 km away';
    if (distance < 10) return '5-10 km away';
    if (distance < 25) return '10-25 km away';
    if (distance < 50) return '25-50 km away';
    return 'Same region';
  }

  /**
   * Request location permission properly
   */
  private async requestLocationPermission(): Promise<boolean> {
    // Only ask if user initiates location features
    const result = await this.showLocationPrompt();
    if (!result) return false;

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Show user-friendly location prompt
   */
  private showLocationPrompt(): Promise<boolean> {
    // Show custom UI explaining benefits
    const benefits = [
      'Find players in your area',
      'Join local tournaments',
      'Compete on city leaderboards',
      'Discover domino clubs nearby'
    ];

    // Return user's choice
    return Promise.resolve(confirm(
      `Enable location features?\n\n${benefits.join('\n')}\n\nYour exact location is never shared.`
    ));
  }

  private generateId(): string {
    return `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async reverseGeocode(lat: number, lon: number): Promise<string> {
    // Implementation would use a geocoding API
    return 'Caribbean'; // Placeholder
  }

  private applyRegionalVariations(rules: RegionalRules): void {
    // Apply region-specific rules to game
    console.log('Applying regional rules:', rules);
  }

  private async fetchLocalTournaments(region: string): Promise<Tournament[]> {
    // Fetch tournaments for region
    return [];
  }

  private parseDistanceRange(range: string): number {
    const match = range.match(/\d+/);
    return match ? parseInt(match[0]) : 100;
  }
}

// Type definitions
interface LocationFeatures {
  enabled: boolean;
  availableFeatures: string[];
}

interface NearbyPlayer {
  id: string;
  displayName: string;
  avatar: string;
  distanceRange: string;
  skill: number;
  isOnline: boolean;
  canChallenge: boolean;
}

interface Tournament {
  id: string;
  name: string;
  type: string;
  region: string;
  startDate: Date;
  maxPlayers: number;
  entryFee: number;
  prizes: any[];
  rules: any;
  participants: any[];
}

interface RegionalRules {
  defaultMode: string;
  specialRules: string[];
  scoringMultiplier?: number;
  allowBetting?: boolean;
  tournamentStyle?: boolean;
  pubStyle?: boolean;
}

interface TournamentOptions {
  name: string;
  region: string;
  startDate: Date;
  maxPlayers?: number;
  entryFee?: number;
  prizes: any[];
  rules: any;
}

interface MatchPreferences {
  mySkill: number;
  maxSkillDifference: number;
  preferLocal: boolean;
  maxDistance: number;
}

export const locationFeatures = new LocationBasedFeatures();