import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';

// TODO: Replace with your actual GCP Cloud Run URL once deployed
const BACKEND_URL = 'https://crisisapp-957944136608.europe-west1.run.app';

const getCrisisColor = (type: string) => {
  switch (type.toUpperCase()) {
    case 'FIRE': return '#dc2626'; // Vivid Red
    case 'EARTHQUAKE': return '#ea580c'; // Vivid Orange
    case 'FLOOD': return '#2563eb'; // Vivid Blue
    case 'HEATWAVE': return '#d97706'; // Dark Yellow / Amber
    default: return '#16a34a'; // Green fallback
  }
};

const getCrisisBg = (type: string) => {
  switch (type.toUpperCase()) {
    case 'FIRE': return '#fef2f2';
    case 'EARTHQUAKE': return '#fff7ed';
    case 'FLOOD': return '#eff6ff';
    case 'HEATWAVE': return '#fef3c7';
    default: return '#f0fdf4';
  }
};

const App = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'map'>('feed');
  const [refreshing, setRefreshing] = useState(false);
  const [pulse, setPulse] = useState(false);

  // Micro-animation timer for pulsing map warnings
  useEffect(() => {
    const timer = setInterval(() => {
      setPulse(prev => !prev);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/events`);
      const data = await response.json();
      if (data.events) {
        // Sort events by confidence score descending
        const sorted = [...data.events].sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
        setEvents(sorted);
      }
    } catch (error) {
      console.error("Failed to fetch events. Is backend running?", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const startNewSession = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/session/start`, { method: 'POST' });
      const data = await response.json();
      console.log(data.message);
      await fetchEvents();
    } catch (error) {
      console.error("Failed to start session:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 6000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  // Coordinates bounding box for mapping Karachi locations onto the screen canvas
  // Lat: 24.8 to 25.0
  // Long: 66.9 to 67.2
  const mapWidth = Dimensions.get('window').width - 32;
  const mapHeight = 280;

  const projectCoordinates = (lat: number, lng: number) => {
    if (!lat || !lng) return { x: mapWidth / 2, y: mapHeight / 2 };
    
    const minLat = 24.80;
    const maxLat = 25.00;
    const minLng = 66.90;
    const maxLng = 67.20;

    // Projection calculation
    let x = ((lng - minLng) / (maxLng - minLng)) * mapWidth;
    let y = (1.0 - (lat - minLat) / (maxLat - minLat)) * mapHeight;

    // Bounding limits
    x = Math.max(10, Math.min(mapWidth - 10, x));
    y = Math.max(10, Math.min(mapHeight - 10, y));

    return { x, y };
  };

  const renderEventCard = ({ item }: { item: any }) => {
    const typeColor = getCrisisColor(item.crisis_type || 'UNKNOWN');
    const isVerified = (item.confidence_score || 0) > 80;
    const mitigation = item.mitigation_plan || {};

    return (
      <View style={[styles.card, { borderTopColor: typeColor, borderTopWidth: 4 }]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.crisisType, { color: typeColor }]}>
              {item.crisis_type ? item.crisis_type.toUpperCase() : 'UNKNOWN CRITICAL SIGNAL'}
            </Text>
            <Text style={styles.location}>📍 {item.location || 'Sector Unknown'}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: isVerified ? '#10b981' : '#f59e0b' }]}>
            <Text style={styles.badgeText}>
              {item.status ? item.status.toUpperCase() : (isVerified ? 'VERIFIED' : 'PROBABLE')}
            </Text>
          </View>
        </View>

        {/* Confidence Progress Meter */}
        <View style={styles.confidenceContainer}>
          <View style={styles.confidenceLabelRow}>
            <Text style={styles.confidenceText}>Confidence Index</Text>
            <Text style={[styles.confidenceValue, { color: typeColor }]}>{item.confidence_score || 0}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${item.confidence_score || 0}%`, backgroundColor: typeColor }]} />
          </View>
        </View>

        {/* Sources Verification Section */}
        {item.sources_verified && item.sources_verified.length > 0 && (
          <View style={styles.verificationSection}>
            <Text style={styles.sectionTitle}>📡 Ingested Signal Verifications</Text>
            {item.sources_verified.map((source: any, idx: number) => (
              <View key={idx} style={styles.sourceRow}>
                <View style={styles.sourceLabelCell}>
                  <Text style={styles.sourceName}>{source.name}</Text>
                  <Text style={styles.sourceReading}>{source.reading}</Text>
                </View>
                <View style={[styles.sourceStatusBadge, { backgroundColor: source.status === 'CONFIRMED' ? '#e8f5e9' : '#fff3e0' }]}>
                  <Text style={[styles.sourceStatusText, { color: source.status === 'CONFIRMED' ? '#166534' : '#b45309' }]}>
                    {source.status || 'PENDING'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Mitigation Plan section */}
        {mitigation && (Object.keys(mitigation).length > 0) && (
          <View style={[styles.mitigationContainer, { backgroundColor: getCrisisBg(item.crisis_type || 'DEFAULT') }]}>
            <Text style={[styles.mitigationHeader, { color: typeColor }]}>🛡️ Agentic Mitigation Decisions</Text>
            
            {/* Public Alert Warning */}
            {mitigation.public_alert && (
              <View style={styles.mitigationItem}>
                <Text style={styles.mitigationIcon}>🚨</Text>
                <Text style={styles.mitigationText}>{mitigation.public_alert}</Text>
              </View>
            )}

            {/* Hospital Beds preparation alert */}
            {mitigation.hospital_notification && (
              <View style={styles.mitigationItem}>
                <Text style={styles.mitigationIcon}>🏥</Text>
                <View style={styles.mitigationTextGroup}>
                  <Text style={styles.mitigationSubTitle}>
                    {mitigation.hospital_notification.target} Standby
                  </Text>
                  <Text style={styles.mitigationText}>
                    Prepare {mitigation.hospital_notification.beds_to_prepare} emergency beds. {mitigation.hospital_notification.message}
                  </Text>
                </View>
              </View>
            )}

            {/* Dispatched resources */}
            {mitigation.resources_allocated && mitigation.resources_allocated.length > 0 && (
              <View style={styles.mitigationItem}>
                <Text style={styles.mitigationIcon}>🚒</Text>
                <View style={styles.mitigationTextGroup}>
                  <Text style={styles.mitigationSubTitle}>Dispatched Units</Text>
                  <Text style={styles.mitigationText}>
                    {mitigation.resources_allocated.map((res: any, idx: number) => (
                      `${res.quantity}x ${res.unit}${idx < mitigation.resources_allocated.length - 1 ? ', ' : ''}`
                    ))}
                  </Text>
                </View>
              </View>
            )}

            {/* Safety routes */}
            {mitigation.safe_route && (
              <View style={styles.mitigationItem}>
                <Text style={styles.mitigationIcon}>🗺️</Text>
                <View style={styles.mitigationTextGroup}>
                  <Text style={styles.mitigationSubTitle}>Alternate Navigation Route</Text>
                  <Text style={styles.mitigationText}>
                    Avoid {mitigation.safe_route.avoid}. Rerouting users via: {mitigation.safe_route.recommended_path}.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header section with white/green branding */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.headerTitle}>Crisis Orchestrator</Text>
            <Text style={styles.headerSub}>Adaptive AI Emergency Control</Text>
          </View>
          <View style={styles.statusOnlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusOnlineText}>Live Agent</Text>
          </View>
        </View>

        {/* Dashboard Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{events.length}</Text>
            <Text style={styles.statLabel}>Active Events</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: events.length > 0 ? '#dc2626' : '#166534' }]}>
              {events.filter(e => e.confidence_score > 80).length}
            </Text>
            <Text style={styles.statLabel}>Verified Risks</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#2563eb' }]}>
              {events.reduce((sum, e) => sum + (e.mitigation_plan?.hospital_notification?.beds_to_prepare || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Standby Beds</Text>
          </View>
        </View>

        {/* Session Action Control Buttons */}
        <View style={styles.actionButtonRow}>
          <TouchableOpacity style={styles.primaryActionButton} onPress={startNewSession}>
            <Text style={styles.primaryActionText}>🔄 Restart Simulation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryActionButton} onPress={onRefresh}>
            <Text style={styles.secondaryActionText}>⚙️ Poll Live Feed</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Switcher Segmented Control */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'feed' && styles.tabButtonActive]}
          onPress={() => setActiveTab('feed')}
        >
          <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>
            📝 Risk Feeds ({events.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'map' && styles.tabButtonActive]}
          onPress={() => setActiveTab('map')}
        >
          <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>
            🗺️ Mitigation Map
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={styles.loader} />
      ) : activeTab === 'feed' ? (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={renderEventCard}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Monitoring city sectors. No active crises detected.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={startNewSession}>
                <Text style={styles.emptyButtonText}>Trigger Event Simulator</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.mapTabScroll}>
          {/* Simulated Vector Grid Map */}
          <Text style={styles.mapSectionTitle}>Karachi Emergency Sector Control</Text>
          <View style={[styles.mapContainer, { width: mapWidth, height: mapHeight }]}>
            {/* Blueprint Grid Layout */}
            <View style={styles.mapGridLineH1} />
            <View style={styles.mapGridLineH2} />
            <View style={styles.mapGridLineV1} />
            <View style={styles.mapGridLineV2} />

            {/* Static Sectors Labels */}
            <Text style={[styles.sectorLabel, { top: 30, left: 30 }]}>Orangi Town</Text>
            <Text style={[styles.sectorLabel, { top: 25, right: 30 }]}>North Karachi</Text>
            <Text style={[styles.sectorLabel, { top: 120, left: mapWidth / 2 - 40 }]}>Saddar Town</Text>
            <Text style={[styles.sectorLabel, { bottom: 30, right: 40 }]}>Korangi Industrial</Text>
            <Text style={[styles.sectorLabel, { bottom: 25, left: 50 }]}>Clifton Beach</Text>

            {/* Dynamic Coordinates Projecting on Map */}
            {events.map((event) => {
              if (!event.coordinates) return null;
              const { x, y } = projectCoordinates(event.coordinates.latitude, event.coordinates.longitude);
              const color = getCrisisColor(event.crisis_type || 'UNKNOWN');
              
              return (
                <View key={event.id} style={[styles.mapMarkerContainer, { left: x - 25, top: y - 25 }]}>
                  {/* Pulsing Risk Circle Halo */}
                  <View style={[
                    styles.markerPulseCircle, 
                    { 
                      borderColor: color, 
                      transform: [{ scale: pulse ? 1.4 : 1.0 }],
                      opacity: pulse ? 0.2 : 0.5 
                    }
                  ]} />
                  {/* Center Dot */}
                  <View style={[styles.markerDot, { backgroundColor: color }]} />
                  {/* Mini-Tag Label */}
                  <Text style={[styles.markerTextTag, { backgroundColor: color }]}>
                    {event.crisis_type} ({event.confidence_score}%)
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Map Mitigation List */}
          <View style={styles.mapDirectionsContainer}>
            <Text style={styles.mapDirectionsHeader}>Active Evacuations & Rerouting Commands</Text>
            {events.length === 0 ? (
              <Text style={styles.noRouteText}>No hazard routes computed. City streets are running clear.</Text>
            ) : (
              events.map((event, index) => {
                const color = getCrisisColor(event.crisis_type);
                const route = event.mitigation_plan?.safe_route;
                return (
                  <View key={event.id || index} style={[styles.directionRow, { borderLeftColor: color }]}>
                    <Text style={[styles.directionCrisisTitle, { color: color }]}>
                      {event.crisis_type} @ {event.location}
                    </Text>
                    {route ? (
                      <View>
                        <Text style={styles.directionInstruction}>
                          ❌ <Text style={styles.boldText}>Avoid Area:</Text> {route.avoid}
                        </Text>
                        <Text style={styles.directionInstruction}>
                          🟢 <Text style={styles.boldText}>Recommended Route:</Text> {route.recommended_path}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.directionInstruction}>⚠️ Monitoring signal. Route updates will deploy shortly.</Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Slate 50
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b', // Slate 800
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#16a34a', // Green 600
    fontWeight: '600',
    marginTop: 2,
  },
  statusOnlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
    marginRight: 6,
  },
  statusOnlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#334155',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  actionButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  primaryActionButton: {
    flex: 1.2,
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#1e293b',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  crisisType: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  location: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  confidenceContainer: {
    marginBottom: 16,
  },
  confidenceLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  confidenceText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  confidenceValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  verificationSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sourceLabelCell: {
    flex: 1,
  },
  sourceName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  sourceReading: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  sourceStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sourceStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  mitigationContainer: {
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mitigationHeader: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mitigationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  mitigationIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 1,
  },
  mitigationTextGroup: {
    flex: 1,
  },
  mitigationSubTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  mitigationText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 20,
    lineHeight: 22,
    paddingHorizontal: 30,
  },
  emptyButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  mapTabScroll: {
    padding: 16,
    alignItems: 'center',
  },
  mapSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mapContainer: {
    backgroundColor: '#ecfdf5', // Light green blueprint
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#a7f3d0',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapGridLineH1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33.3%',
    height: 1,
    backgroundColor: '#a7f3d0',
    opacity: 0.5,
  },
  mapGridLineH2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '66.6%',
    height: 1,
    backgroundColor: '#a7f3d0',
    opacity: 0.5,
  },
  mapGridLineV1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33.3%',
    width: 1,
    backgroundColor: '#a7f3d0',
    opacity: 0.5,
  },
  mapGridLineV2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '66.6%',
    width: 1,
    backgroundColor: '#a7f3d0',
    opacity: 0.5,
  },
  sectorLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46',
    opacity: 0.4,
    textTransform: 'uppercase',
  },
  mapMarkerContainer: {
    position: 'absolute',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPulseCircle: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  markerTextTag: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 4,
    textAlign: 'center',
    overflow: 'hidden',
  },
  mapDirectionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mapDirectionsHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noRouteText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 12,
    fontWeight: '500',
  },
  directionRow: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  directionCrisisTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  directionInstruction: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
    marginTop: 2,
    fontWeight: '500',
  },
  boldText: {
    fontWeight: '700',
  },
});

export default App;
