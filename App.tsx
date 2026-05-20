import React, { useEffect, useRef, useState } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { WebView } from 'react-native-webview';

const BACKEND_URL = 'https://crisisapp-957944136608.europe-west1.run.app';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getCrisisColor = (type: string) => {
  switch (type?.toUpperCase()) {
    case 'FIRE':       return '#ef4444';
    case 'EARTHQUAKE': return '#f97316';
    case 'FLOOD':      return '#3b82f6';
    case 'HEATWAVE':   return '#eab308';
    default:           return '#10b981';
  }
};

const getCrisisBg = (type: string) => {
  switch (type?.toUpperCase()) {
    case 'FIRE':       return '#fef2f2';
    case 'EARTHQUAKE': return '#fff7ed';
    case 'FLOOD':      return '#eff6ff';
    case 'HEATWAVE':   return '#fefce8';
    default:           return '#f0fdf4';
  }
};

const getCrisisEmoji = (type: string) => {
  switch (type?.toUpperCase()) {
    case 'FIRE':       return '🔥';
    case 'EARTHQUAKE': return '🌍';
    case 'FLOOD':      return '🌊';
    case 'HEATWAVE':   return '☀️';
    default:           return '⚠️';
  }
};

// Builds a Leaflet HTML string for a real interactive map centred on Karachi
const buildMapHtml = (events: any[]) => {
  const markersJs = events
    .filter(e => e.coordinates)
    .map(e => {
      const color = getCrisisColor(e.crisis_type);
      const emoji  = getCrisisEmoji(e.crisis_type);
      const label  = `${emoji} ${e.crisis_type} – ${e.location}`;
      const popup  = `
        <b>${emoji} ${e.crisis_type}</b><br/>
        <span style="color:#64748b;font-size:12px">📍 ${e.location}</span><br/>
        <span style="color:${color};font-weight:bold">Confidence: ${e.confidence_score}%</span><br/>
        <span style="color:#1e293b;font-size:11px">${e.mitigation_plan?.public_alert || ''}</span>
      `;
      return `
        var circleOpts${e.id?.replace(/\W/g,'_')} = {
          radius: 800,
          fillColor: '${color}',
          color: '${color}',
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.25,
        };
        var circle_${e.id?.replace(/\W/g,'_')} = L.circle(
          [${e.coordinates.latitude}, ${e.coordinates.longitude}],
          circleOpts${e.id?.replace(/\W/g,'_')}
        ).addTo(map);

        var markerIcon_${e.id?.replace(/\W/g,'_')} = L.divIcon({
          className:'',
          html: '<div style="background:${color};color:#fff;font-size:11px;font-weight:700;padding:4px 7px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${label}</div>',
          iconAnchor: [60, 8]
        });
        L.marker(
          [${e.coordinates.latitude}, ${e.coordinates.longitude}],
          { icon: markerIcon_${e.id?.replace(/\W/g,'_')} }
        ).addTo(map).bindPopup('${popup.replace(/\n/g,' ')}');
      `;
    })
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html,body,#map { height:100%; margin:0; padding:0; background:#0f172a; }
    .leaflet-popup-content { font-family: -apple-system, sans-serif; min-width:180px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([24.88, 67.06], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap, &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);
    ${markersJs}
  </script>
</body>
</html>
  `;
};

// ─────────────────────────────────────────────────────────────
// AgentFlowTimeline component
// ─────────────────────────────────────────────────────────────
const AgentFlowTimeline = ({ steps, color }: { steps: any[]; color: string }) => {
  return (
    <View style={styles.flowSection}>
      <Text style={styles.sectionTitle}>🕵️ Agentic Verification Flow</Text>
      {steps.map((step: any, idx: number) => {
        const isLast   = idx === steps.length - 1;
        const isActive = step.status === 'DEPLOYED';
        return (
          <View key={idx} style={styles.timelineRow}>
            {/* Left column: dot + line */}
            <View style={styles.timelineLeft}>
              <View style={[
                styles.timelineDot,
                { backgroundColor: isActive ? color : '#94a3b8' },
                isActive && { transform: [{ scale: 1.2 }] }
              ]} />
              {!isLast && <View style={[styles.timelineLine, { backgroundColor: color + '30' }]} />}
            </View>

            {/* Right column: content */}
            <View style={[styles.timelineContent, !isLast && { paddingBottom: 16 }]}>
              <View style={styles.timelineHeaderRow}>
                <Text style={styles.timelineStep}>{step.step}</Text>
                <View style={[
                  styles.timelineBadge,
                  { backgroundColor: isActive ? color + '20' : '#f1f5f9' }
                ]}>
                  <Text style={[styles.timelineBadgeText, { color: isActive ? color : '#64748b' }]}>
                    {step.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.timelineDetails}>{step.details}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// SocialFeed component
// ─────────────────────────────────────────────────────────────
const SocialFeed = ({ posts, color }: { posts: any[]; color: string }) => (
  <View style={styles.socialSection}>
    <Text style={styles.sectionTitle}>💬 Ingested Social Signals</Text>
    {posts.map((post: any, idx: number) => (
      <View key={idx} style={[styles.socialCard, { borderLeftColor: color }]}>
        <View style={styles.socialTop}>
          <View style={[styles.socialAvatar, { backgroundColor: color }]}>
            <Text style={styles.socialAvatarText}>
              {(post.user || '@U').replace('@', '').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.socialHandle}>{post.user}</Text>
            <Text style={styles.socialTime}>{post.time}</Text>
          </View>
        </View>
        <Text style={styles.socialText}>{post.text}</Text>
      </View>
    ))}
  </View>
);

// ─────────────────────────────────────────────────────────────
// CrisisCard component
// ─────────────────────────────────────────────────────────────
const CrisisCard = ({ item }: { item: any }) => {
  const [expanded, setExpanded] = useState(true);
  const typeColor   = getCrisisColor(item.crisis_type || 'UNKNOWN');
  const typeBg      = getCrisisBg(item.crisis_type || 'UNKNOWN');
  const isVerified  = (item.confidence_score || 0) > 80;
  const mitigation  = item.mitigation_plan || {};
  const agentFlow   = item.agent_flow || [];
  const socialFeed  = item.social_feed || [];

  return (
    <View style={[styles.card, { borderTopColor: typeColor, borderTopWidth: 4 }]}>

      {/* ── Header ── */}
      <TouchableOpacity activeOpacity={0.85} onPress={() => setExpanded(v => !v)}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 20 }}>{getCrisisEmoji(item.crisis_type)}</Text>
              <Text style={[styles.crisisType, { color: typeColor }]}>
                {item.crisis_type?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
            <Text style={styles.location}>📍 {item.location || 'Sector Unknown'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={[styles.badge, { backgroundColor: isVerified ? '#10b981' : '#f59e0b' }]}>
              <Text style={styles.badgeText}>
                {item.status ? item.status.toUpperCase() : (isVerified ? 'VERIFIED' : 'PROBABLE')}
              </Text>
            </View>
            <Text style={{ fontSize: 16, color: '#94a3b8' }}>{expanded ? '▲' : '▼'}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Confidence Bar ── */}
      <View style={styles.confidenceBlock}>
        <View style={styles.confRow}>
          <Text style={styles.confLabel}>Confidence Index</Text>
          <Text style={[styles.confValue, { color: typeColor }]}>{item.confidence_score || 0}%</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${item.confidence_score || 0}%`, backgroundColor: typeColor }]} />
        </View>
      </View>

      {expanded && (
        <>
          {/* ── Source Verification ── */}
          {item.sources_verified?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📡 Sensor Verifications</Text>
              {item.sources_verified.map((src: any, i: number) => (
                <View key={i} style={styles.sourceRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sourceName}>{src.name}</Text>
                    <Text style={styles.sourceReading}>{src.reading}</Text>
                  </View>
                  <View style={[
                    styles.srcBadge,
                    { backgroundColor: src.status === 'CONFIRMED' ? '#dcfce7' : '#fef3c7' }
                  ]}>
                    <Text style={[
                      styles.srcBadgeText,
                      { color: src.status === 'CONFIRMED' ? '#166534' : '#92400e' }
                    ]}>
                      {src.status || 'PENDING'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Social Feed ── */}
          {socialFeed.length > 0 && (
            <SocialFeed posts={socialFeed} color={typeColor} />
          )}

          {/* ── Mitigation Plan ── */}
          {Object.keys(mitigation).length > 0 && (
            <View style={[styles.mitigBlock, { backgroundColor: typeBg, borderColor: typeColor + '30' }]}>
              <Text style={[styles.mitigTitle, { color: typeColor }]}>🛡️ Agentic Mitigation Plan</Text>

              {mitigation.public_alert && (
                <View style={styles.mitigRow}>
                  <Text style={styles.mitigIcon}>🚨</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mitigSubtitle}>Public Alert</Text>
                    <Text style={styles.mitigText}>{mitigation.public_alert}</Text>
                  </View>
                </View>
              )}

              {mitigation.hospital_notification && (
                <View style={styles.mitigRow}>
                  <Text style={styles.mitigIcon}>🏥</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mitigSubtitle}>{mitigation.hospital_notification.target} Standby</Text>
                    <Text style={styles.mitigText}>
                      Prepare {mitigation.hospital_notification.beds_to_prepare} emergency beds.{' '}
                      {mitigation.hospital_notification.message}
                    </Text>
                  </View>
                </View>
              )}

              {mitigation.resources_allocated?.length > 0 && (
                <View style={styles.mitigRow}>
                  <Text style={styles.mitigIcon}>🚒</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mitigSubtitle}>Dispatched Units</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {mitigation.resources_allocated.map((r: any, i: number) => (
                        <View key={i} style={[styles.resourcePill, { borderColor: typeColor + '50' }]}>
                          <Text style={[styles.resourcePillText, { color: typeColor }]}>
                            {r.quantity}× {r.unit}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {mitigation.safe_route && (
                <View style={styles.mitigRow}>
                  <Text style={styles.mitigIcon}>🗺️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mitigSubtitle}>Traffic Rerouting</Text>
                    <Text style={[styles.mitigText, { color: '#dc2626', marginBottom: 2 }]}>
                      ❌ Avoid: {mitigation.safe_route.avoid}
                    </Text>
                    <Text style={[styles.mitigText, { color: '#16a34a' }]}>
                      ✅ Use: {mitigation.safe_route.recommended_path}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── Agentic Flow Timeline ── */}
          {agentFlow.length > 0 && (
            <AgentFlowTimeline steps={agentFlow} color={typeColor} />
          )}
        </>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// MapView (real Leaflet via WebView)
// ─────────────────────────────────────────────────────────────
const LeafletMapView = ({ events }: { events: any[] }) => {
  const html = buildMapHtml(events);

  return (
    <View style={{ flex: 1 }}>
      {/* Map */}
      <View style={styles.leafletContainer}>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={{ flex: 1, borderRadius: 16 }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.mapLoader}>
              <ActivityIndicator color="#10b981" size="large" />
              <Text style={styles.mapLoadText}>Loading live map…</Text>
            </View>
          )}
        />
        <View style={styles.mapBadge}>
          <View style={styles.mapBadgeDot} />
          <Text style={styles.mapBadgeText}>LIVE MAP — {events.length} ACTIVE CRISIS ZONES</Text>
        </View>
      </View>

      {/* Route summary cards */}
      <ScrollView style={styles.routeList} contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={styles.routeListTitle}>Active Traffic Rerouting Commands</Text>
        {events.length === 0 ? (
          <Text style={styles.noRoute}>All city streets are clear. No hazard routes computed.</Text>
        ) : (
          events.map((event, i) => {
            const color = getCrisisColor(event.crisis_type);
            const route = event.mitigation_plan?.safe_route;
            return (
              <View key={event.id || i} style={[styles.routeCard, { borderLeftColor: color }]}>
                <Text style={[styles.routeCardTitle, { color }]}>
                  {getCrisisEmoji(event.crisis_type)} {event.crisis_type} @ {event.location}
                </Text>
                {route ? (
                  <>
                    <Text style={styles.routeText}>❌ <Text style={{ fontWeight: '700' }}>Avoid:</Text> {route.avoid}</Text>
                    <Text style={styles.routeText}>✅ <Text style={{ fontWeight: '700' }}>Route:</Text> {route.recommended_path}</Text>
                  </>
                ) : (
                  <Text style={styles.routeText}>⚠️ Monitoring. Route updates deploying shortly.</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────
const App = () => {
  const [events, setEvents]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'map'>('feed');
  const [refreshing, setRefreshing] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  }, [pulseAnim]);

  const fetchEvents = async () => {
    try {
      const res  = await fetch(`${BACKEND_URL}/api/events`);
      const data = await res.json();
      if (data.events) {
        const sorted = [...data.events].sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
        setEvents(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const startSession = async () => {
    setLoading(true);
    try {
      await fetch(`${BACKEND_URL}/api/session/start`, { method: 'POST' });
      await fetchEvents();
    } catch (err) {
      console.error('Failed to start session:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const iv = setInterval(fetchEvents, 8000);
    return () => clearInterval(iv);
  }, []);

  const verifiedCount  = events.filter(e => (e.confidence_score || 0) > 80).length;
  const avgConf        = events.length ? Math.round(events.reduce((a, e) => a + (e.confidence_score || 0), 0) / events.length) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>🛡️ CrisisAI</Text>
            <Text style={styles.headerSub}>Karachi Real-Time Agentic Ops</Text>
          </View>
          <Animated.View style={[styles.liveIndicator, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </Animated.View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{events.length}</Text>
            <Text style={styles.statLbl}>ACTIVE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#10b981' }]}>{verifiedCount}</Text>
            <Text style={styles.statLbl}>VERIFIED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#f97316' }]}>{avgConf}%</Text>
            <Text style={styles.statLbl}>AVG CONF</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.btnPrimary} onPress={startSession}>
            <Text style={styles.btnPrimaryText}>⚡ New Simulation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={fetchEvents}>
            <Text style={styles.btnSecondaryText}>🔄 Refresh Feed</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'feed' && styles.tabActive]}
            onPress={() => setActiveTab('feed')}
          >
            <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>📋 Crisis Feed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'map' && styles.tabActive]}
            onPress={() => setActiveTab('map')}
          >
            <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>🗺️ Live Map</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator color="#10b981" size="large" />
          <Text style={styles.loaderText}>Initializing Crisis Agents…</Text>
        </View>
      ) : activeTab === 'feed' ? (
        <FlatList
          data={events}
          keyExtractor={item => item.id || String(Math.random())}
          renderItem={({ item }) => <CrisisCard item={item} />}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchEvents(); }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📡</Text>
              <Text style={styles.emptyText}>No active crises detected.{'\n'}Tap "New Simulation" to initialize.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={startSession}>
                <Text style={styles.emptyBtnText}>⚡ Start Simulation</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <LeafletMapView events={events} />
      )}
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8fafc' },

  // Header
  header:      { backgroundColor: '#fff', padding: 16, paddingBottom: 0, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: 0.5 },
  headerSub:   { fontSize: 12, color: '#10b981', fontWeight: '600', marginTop: 2 },

  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#dcfce7' },
  liveDot:       { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#16a34a', marginRight: 5 },
  liveText:      { fontSize: 11, fontWeight: '800', color: '#166534', letterSpacing: 1 },

  statsRow:    { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  statBox:     { flex: 1, alignItems: 'center' },
  statVal:     { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  statLbl:     { fontSize: 9, color: '#94a3b8', fontWeight: '700', marginTop: 2, letterSpacing: 0.8 },
  statDivider: { width: 1, height: 30, backgroundColor: '#e2e8f0', marginHorizontal: 4 },

  actionRow:   { flexDirection: 'row', gap: 10, marginBottom: 14 },
  btnPrimary:  { flex: 1.2, backgroundColor: '#0f172a', paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnSecondary: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  btnSecondaryText: { color: '#475569', fontSize: 13, fontWeight: '700' },

  tabRow:      { flexDirection: 'row', gap: 8, paddingBottom: 0 },
  tab:         { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:   { borderBottomColor: '#0f172a' },
  tabText:     { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  tabTextActive: { color: '#0f172a' },

  // Loader
  loaderBox:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText:  { color: '#64748b', fontWeight: '600', fontSize: 14, marginTop: 12 },

  // List
  listContent: { padding: 14, gap: 14 },

  // Card
  card:        { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 3, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  crisisType:  { fontSize: 18, fontWeight: '900', letterSpacing: 0.3 },
  location:    { fontSize: 13, color: '#64748b', marginTop: 3, fontWeight: '500' },
  badge:       { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  badgeText:   { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  confidenceBlock: { marginBottom: 14 },
  confRow:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  confLabel:       { fontSize: 11, color: '#64748b', fontWeight: '600' },
  confValue:       { fontSize: 12, fontWeight: '800' },
  progressBg:      { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: 3 },

  section:     { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  sourceRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 9, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#f1f5f9' },
  sourceName:   { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  sourceReading: { fontSize: 11, color: '#64748b', marginTop: 1 },
  srcBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8 },
  srcBadgeText: { fontSize: 9, fontWeight: '800' },

  // Social feed
  socialSection: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, marginBottom: 12 },
  socialCard:    { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginBottom: 8, borderLeftWidth: 3 },
  socialTop:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  socialAvatar:  { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  socialAvatarText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  socialHandle:  { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  socialTime:    { fontSize: 10, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  socialText:    { fontSize: 12, color: '#334155', lineHeight: 17, fontWeight: '500' },

  // Mitigation block
  mitigBlock:    { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 12 },
  mitigTitle:    { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  mitigRow:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 11 },
  mitigIcon:     { fontSize: 16, marginRight: 10, marginTop: 1 },
  mitigSubtitle: { fontSize: 12, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  mitigText:     { fontSize: 12, color: '#334155', lineHeight: 17, fontWeight: '500' },
  resourcePill:  { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  resourcePillText: { fontSize: 11, fontWeight: '700' },

  // Agentic flow timeline
  flowSection:      { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  timelineRow:      { flexDirection: 'row' },
  timelineLeft:     { width: 28, alignItems: 'center' },
  timelineDot:      { width: 12, height: 12, borderRadius: 6, marginTop: 2 },
  timelineLine:     { width: 2, flex: 1, marginTop: 4 },
  timelineContent:  { flex: 1, paddingLeft: 10 },
  timelineHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  timelineStep:     { fontSize: 12, fontWeight: '700', color: '#1e293b', flex: 1 },
  timelineBadge:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginLeft: 6 },
  timelineBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  timelineDetails:  { fontSize: 11, color: '#64748b', lineHeight: 16, fontWeight: '500' },

  // Empty
  emptyBox:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 30 },
  emptyEmoji:  { fontSize: 48, marginBottom: 16 },
  emptyText:   { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22, fontWeight: '600', marginBottom: 20 },
  emptyBtn:    { backgroundColor: '#0f172a', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Leaflet map
  leafletContainer: { height: 340, margin: 14, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', elevation: 4, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, position: 'relative' },
  mapLoader:   { ...StyleSheet.absoluteFillObject, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  mapLoadText: { color: '#64748b', fontWeight: '600', marginTop: 10 },
  mapBadge:    { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.85)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  mapBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 6 },
  mapBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },

  routeList:      { flex: 1 },
  routeListTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  routeCard:      { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  routeCardTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
  routeText:      { fontSize: 12, color: '#334155', lineHeight: 18, fontWeight: '500', marginTop: 2 },
  noRoute:        { fontSize: 13, color: '#94a3b8', textAlign: 'center', fontWeight: '500', paddingVertical: 20 },
});

export default App;
