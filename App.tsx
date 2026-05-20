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

// ─── Helpers ───────────────────────────────────────────────────
const getCrisisColor = (type: string, status?: string) => {
  if (status === 'FALSE ALARM') return '#64748b';
  switch (type?.toUpperCase()) {
    case 'FIRE':       return '#ef4444';
    case 'EARTHQUAKE': return '#f97316';
    case 'FLOOD':      return '#3b82f6';
    case 'HEATWAVE':   return '#eab308';
    default:           return '#10b981';
  }
};
const getCrisisBg = (type: string, status?: string) => {
  if (status === 'FALSE ALARM') return '#f8fafc';
  switch (type?.toUpperCase()) {
    case 'FIRE':       return '#fef2f2';
    case 'EARTHQUAKE': return '#fff7ed';
    case 'FLOOD':      return '#eff6ff';
    case 'HEATWAVE':   return '#fefce8';
    default:           return '#f0fdf4';
  }
};
const getCrisisEmoji = (type: string, status?: string) => {
  if (status === 'FALSE ALARM') return '✅';
  switch (type?.toUpperCase()) {
    case 'FIRE':       return '🔥';
    case 'EARTHQUAKE': return '🌍';
    case 'FLOOD':      return '🌊';
    case 'HEATWAVE':   return '☀️';
    default:           return '⚠️';
  }
};

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'VERIFIED':     return '#10b981';
    case 'FALSE ALARM':  return '#64748b';
    case 'PROBABLE':     return '#f59e0b';
    default:             return '#6366f1';
  }
};

const getCredibilityColor = (c: string) =>
  c?.startsWith('HIGH') ? '#16a34a' : c?.startsWith('LOW') ? '#dc2626' : '#d97706';

// ─── Leaflet HTML ───────────────────────────────────────────────
const buildMapHtml = (events: any[]) => {
  const markers = events
    .filter(e => e.coordinates?.latitude)
    .map(e => {
      const isFalse = e.status === 'FALSE ALARM';
      const color   = getCrisisColor(e.crisis_type, e.status);
      const emoji   = getCrisisEmoji(e.crisis_type, e.status);
      const safeId  = (e.id || 'evt').replace(/\W/g, '_');
      const popupHtml = [
        `<b style="font-size:14px">${emoji} ${e.crisis_type}</b>`,
        `<span style="color:#64748b;font-size:12px">📍 ${e.location}</span>`,
        `<span style="color:${color};font-weight:bold">Confidence: ${e.confidence_score}%</span>`,
        isFalse
          ? `<span style="color:#10b981;font-size:11px">✅ FALSE ALARM — Sensors normal</span>`
          : `<span style="color:#1e293b;font-size:11px">${(e.mitigation_plan?.public_alert || '').substring(0, 80)}…</span>`
      ].join('<br/>');

      return `
        L.circle([${e.coordinates.latitude}, ${e.coordinates.longitude}], {
          radius: ${isFalse ? 400 : 900},
          fillColor: '${color}', color: '${color}',
          weight: ${isFalse ? 1 : 2}, opacity: ${isFalse ? 0.4 : 1}, fillOpacity: ${isFalse ? 0.08 : 0.22}
        }).addTo(map);

        L.marker([${e.coordinates.latitude}, ${e.coordinates.longitude}], {
          icon: L.divIcon({
            className:'', iconAnchor:[70,10],
            html: '<div style="background:${color};color:#fff;font-size:10px;font-weight:800;padding:4px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.4);opacity:${isFalse ? 0.55 : 1}">${emoji} ${e.crisis_type.toUpperCase()} · ${e.confidence_score}%</div>'
          })
        }).addTo(map).bindPopup(\`${popupHtml.replace(/`/g, "'")}\`);
      `;
    }).join('\n');

  return `<!DOCTYPE html><html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>html,body,#map{height:100%;margin:0;padding:0;background:#0f172a}.leaflet-popup-content{font-family:-apple-system,sans-serif;min-width:190px;line-height:1.6}</style>
</head>
<body><div id="map"></div>
<script>
  var map=L.map('map',{zoomControl:true}).setView([24.88,67.04],12);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
    attribution:'© OpenStreetMap © CARTO',subdomains:'abcd',maxZoom:19
  }).addTo(map);
  ${markers}
</script></body></html>`;
};

// ─── Sub-components ─────────────────────────────────────────────

const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
  <View style={ss.sectionHeaderRow}>
    <Text style={ss.sectionHeaderIcon}>{icon}</Text>
    <Text style={ss.sectionHeaderText}>{title}</Text>
  </View>
);

const Divider = () => <View style={ss.divider} />;

// Source verification rows
const SourceRows = ({ sources }: { sources: any[] }) => (
  <View style={ss.block}>
    <SectionHeader icon="📡" title="Signal Verifications" />
    {sources.map((src, i) => {
      const confirmed = src.status === 'CONFIRMED';
      const debunked  = src.status === 'DEBUNKED';
      const bgColor   = confirmed ? '#f0fdf4' : debunked ? '#fef2f2' : '#fefce8';
      const txtColor  = confirmed ? '#166534' : debunked ? '#991b1b' : '#92400e';
      return (
        <View key={i} style={[ss.sourceRow, { backgroundColor: bgColor, borderColor: bgColor }]}>
          <View style={{ flex: 1 }}>
            <Text style={ss.sourceName}>{src.name}</Text>
            <Text style={ss.sourceReading}>{src.reading}</Text>
          </View>
          <View style={[ss.srcBadge, { backgroundColor: bgColor, borderColor: txtColor + '40' }]}>
            <Text style={[ss.srcBadgeText, { color: txtColor }]}>{src.status}</Text>
          </View>
        </View>
      );
    })}
  </View>
);

// Social media feed
const SocialFeed = ({ posts, color }: { posts: any[]; color: string }) => (
  <View style={ss.block}>
    <SectionHeader icon="💬" title="Ingested Social Signals" />
    {posts.map((post, i) => {
      const credColor = getCredibilityColor(post.credibility || '');
      return (
        <View key={i} style={[ss.socialCard, { borderLeftColor: color }]}>
          <View style={ss.socialTop}>
            <View style={[ss.avatar, { backgroundColor: color }]}>
              <Text style={ss.avatarText}>
                {(post.user || '@U').replace('@','').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={ss.socialHandle}>{post.user}</Text>
                <Text style={ss.socialTime}>{post.time}</Text>
              </View>
              {post.credibility && (
                <View style={[ss.credBadge, { backgroundColor: credColor + '18', borderColor: credColor + '50' }]}>
                  <Text style={[ss.credText, { color: credColor }]}>
                    {post.credibility.split('—')[0].trim()}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Text style={ss.socialText}>{post.text}</Text>
        </View>
      );
    })}
  </View>
);

// Authorities notification list
const AuthoritiesList = ({ list, color }: { list: any[]; color: string }) => {
  if (!list?.length) return null;
  const getAuthStatus = (s: string) => {
    if (s?.includes('EN ROUTE'))   return { bg: '#eff6ff', txt: '#1d4ed8' };
    if (s?.includes('DEPLOYED'))   return { bg: '#f0fdf4', txt: '#166534' };
    if (s?.includes('NO ACTION'))  return { bg: '#f1f5f9', txt: '#475569' };
    return { bg: '#fefce8', txt: '#92400e' };
  };
  return (
    <View style={ss.subBlock}>
      <Text style={ss.subBlockTitle}>🏛️ Authorities Notified</Text>
      {list.map((a, i) => {
        const { bg, txt } = getAuthStatus(a.status);
        return (
          <View key={i} style={ss.authRow}>
            <View style={{ flex: 1 }}>
              <Text style={ss.authName}>{a.name}</Text>
              {a.units > 0 && (
                <Text style={ss.authUnits}>{a.units} unit{a.units !== 1 ? 's' : ''}{a.eta_minutes > 0 ? ` · ETA ${a.eta_minutes} min` : ''}</Text>
              )}
            </View>
            <View style={[ss.authBadge, { backgroundColor: bg }]}>
              <Text style={[ss.authBadgeText, { color: txt }]}>{a.status}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// Hospital notification
const HospitalAlert = ({ hosp, color }: { hosp: any; color: string }) => {
  if (!hosp) return null;
  const pct = hosp.beds_available ? Math.round((hosp.beds_to_prepare / hosp.beds_available) * 100) : 0;
  return (
    <View style={[ss.hospitalCard, { borderColor: color + '40' }]}>
      <View style={ss.hospitalHeader}>
        <Text style={ss.hospitalIcon}>🏥</Text>
        <View style={{ flex: 1 }}>
          <Text style={[ss.hospitalName, { color }]}>{hosp.target}</Text>
          {hosp.specialization && <Text style={ss.hospitalSpec}>{hosp.specialization}</Text>}
        </View>
        {hosp.eta_minutes > 0 && (
          <View style={[ss.etaBadge, { backgroundColor: color + '18' }]}>
            <Text style={[ss.etaText, { color }]}>ETA {hosp.eta_minutes}m</Text>
          </View>
        )}
      </View>

      {/* Bed utilization bar */}
      {hosp.beds_available && (
        <View style={ss.bedSection}>
          <View style={ss.bedRow}>
            <Text style={ss.bedLabel}>Available Beds</Text>
            <Text style={ss.bedCount}>{hosp.beds_available} total</Text>
          </View>
          <View style={ss.bedBarBg}>
            <View style={[ss.bedBarFill, { width: `${pct}%`, backgroundColor: color }]} />
          </View>
          <View style={ss.bedRow}>
            <Text style={[ss.bedPrepText, { color }]}>⚡ {hosp.beds_to_prepare} beds being prepared now</Text>
          </View>
        </View>
      )}
      <Text style={ss.hospitalMsg}>{hosp.message}</Text>
    </View>
  );
};

// Resources pills
const ResourcePills = ({ resources, color }: { resources: any[]; color: string }) => {
  if (!resources?.length) return null;
  return (
    <View style={ss.subBlock}>
      <Text style={ss.subBlockTitle}>🚒 Resources Dispatched</Text>
      <View style={ss.pillRow}>
        {resources.map((r, i) => (
          <View key={i} style={[ss.pill, { borderColor: color + '60', backgroundColor: color + '12' }]}>
            <Text style={[ss.pillText, { color }]}>{r.quantity}× {r.unit}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Traffic routing
const TrafficRouting = ({ route }: { route: any }) => {
  if (!route) return null;
  return (
    <View style={ss.subBlock}>
      <Text style={ss.subBlockTitle}>🗺️ Traffic Rerouting</Text>
      <View style={[ss.routeBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
        <Text style={ss.routeAvoidLabel}>❌ AVOID</Text>
        <Text style={ss.routeAvoid}>{route.avoid}</Text>
      </View>
      <View style={[ss.routeBox, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', marginTop: 6 }]}>
        <Text style={ss.routeUseLabel}>✅ USE INSTEAD</Text>
        <Text style={ss.routeUse}>{route.recommended_path}</Text>
      </View>
    </View>
  );
};

// Agentic flow timeline
const AgentTimeline = ({ steps, color }: { steps: any[]; color: string }) => (
  <View style={ss.block}>
    <SectionHeader icon="🤖" title="Agentic AI Verification Flow" />
    {steps.map((step, i) => {
      const isLast     = i === steps.length - 1;
      const isDeployed = step.status === 'DEPLOYED';
      const isCompleted= step.status === 'COMPLETED';
      const dotColor   = isDeployed ? color : isCompleted ? '#10b981' : '#94a3b8';
      return (
        <View key={i} style={ss.tlRow}>
          <View style={ss.tlLeft}>
            <View style={[ss.tlDot, { backgroundColor: dotColor, borderColor: dotColor + '40' }]}>
              <Text style={ss.tlDotText}>{isDeployed ? '⚡' : '✓'}</Text>
            </View>
            {!isLast && <View style={[ss.tlLine, { backgroundColor: dotColor + '35' }]} />}
          </View>
          <View style={[ss.tlContent, !isLast && { paddingBottom: 14 }]}>
            <View style={ss.tlTopRow}>
              <Text style={ss.tlStep}>{step.step}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {step.timestamp && (
                  <Text style={ss.tlTime}>{step.timestamp}</Text>
                )}
                <View style={[ss.tlBadge, {
                  backgroundColor: isDeployed ? color + '20' : '#f1f5f9',
                }]}>
                  <Text style={[ss.tlBadgeText, { color: isDeployed ? color : '#475569' }]}>
                    {step.status}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={ss.tlDetails}>{step.details}</Text>
          </View>
        </View>
      );
    })}
  </View>
);

// ─── CrisisCard ─────────────────────────────────────────────────
const CrisisCard = ({ item }: { item: any }) => {
  const [expanded, setExpanded] = useState(true);
  const isFalseAlarm = item.status === 'FALSE ALARM';
  const color      = getCrisisColor(item.crisis_type, item.status);
  const bg         = getCrisisBg(item.crisis_type, item.status);
  const emoji      = getCrisisEmoji(item.crisis_type, item.status);
  const statusColor= getStatusColor(item.status);
  const mitigation = item.mitigation_plan || {};
  const agentFlow  = item.agent_flow || [];
  const socialFeed = item.social_feed || [];
  const sources    = item.sources_verified || [];

  return (
    <View style={[ss.card, { borderTopColor: color, borderTopWidth: 4 }]}>

      {/* Header */}
      <TouchableOpacity activeOpacity={0.85} onPress={() => setExpanded(v => !v)}>
        <View style={ss.cardHeader}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 22 }}>{emoji}</Text>
              <Text style={[ss.crisisType, { color }]}>
                {item.crisis_type?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
            <Text style={ss.location}>📍 {item.location}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <View style={[ss.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={ss.statusBadgeText}>{item.status?.toUpperCase()}</Text>
            </View>
            <Text style={{ fontSize: 14, color: '#94a3b8' }}>{expanded ? '▲' : '▼'}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Confidence bar */}
      <View style={ss.confBlock}>
        <View style={ss.confRow}>
          <Text style={ss.confLabel}>AI Confidence Index</Text>
          <Text style={[ss.confPct, { color }]}>{item.confidence_score}%</Text>
        </View>
        <View style={ss.confBg}>
          <View style={[ss.confFill, { width: `${item.confidence_score}%`, backgroundColor: color }]} />
        </View>
        {isFalseAlarm && (
          <Text style={ss.falseAlarmNote}>
            🛡️ All physical sensors nominal — below 10% confidence threshold. No deployment.
          </Text>
        )}
      </View>

      {expanded && (
        <>
          {/* False alarm banner */}
          {isFalseAlarm && (
            <View style={ss.falseAlarmBanner}>
              <Text style={ss.falseAlarmTitle}>✅ SOCIAL MEDIA RUMOUR — DEBUNKED</Text>
              <Text style={ss.falseAlarmBody}>
                This alert was triggered by an unverified social media post. All 3 physical sensor networks confirmed NO event. A public correction was issued to 47,000 users.
              </Text>
            </View>
          )}

          {/* Public alert box (only for real crises) */}
          {!isFalseAlarm && mitigation.public_alert && (
            <View style={[ss.alertBox, { backgroundColor: bg, borderColor: color + '50' }]}>
              <Text style={[ss.alertBoxText, { color }]}>{mitigation.public_alert}</Text>
            </View>
          )}

          {/* False alarm correction box */}
          {isFalseAlarm && mitigation.public_alert && (
            <View style={[ss.alertBox, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
              <Text style={[ss.alertBoxText, { color: '#166534' }]}>{mitigation.public_alert}</Text>
            </View>
          )}

          <Divider />
          {/* Sources */}
          {sources.length > 0 && <SourceRows sources={sources} />}

          <Divider />
          {/* Social feed */}
          {socialFeed.length > 0 && <SocialFeed posts={socialFeed} color={color} />}

          {/* Mitigation plan — skip for false alarms */}
          {!isFalseAlarm && (
            <>
              <Divider />
              <View style={ss.block}>
                <SectionHeader icon="🛡️" title="Agentic Mitigation Plan" />

                {/* Hospital */}
                {mitigation.hospital_notification && (
                  <HospitalAlert hosp={mitigation.hospital_notification} color={color} />
                )}

                {/* Authorities */}
                {mitigation.authorities_notified?.length > 0 && (
                  <AuthoritiesList list={mitigation.authorities_notified} color={color} />
                )}

                {/* Resources */}
                {mitigation.resources_allocated?.length > 0 && (
                  <ResourcePills resources={mitigation.resources_allocated} color={color} />
                )}

                {/* Traffic routing */}
                {mitigation.safe_route && (
                  <TrafficRouting route={mitigation.safe_route} />
                )}
              </View>
            </>
          )}

          {/* Authorities for false alarms (informed only) */}
          {isFalseAlarm && mitigation.authorities_notified?.length > 0 && (
            <>
              <Divider />
              <View style={ss.block}>
                <AuthoritiesList list={mitigation.authorities_notified} color={color} />
              </View>
            </>
          )}

          {/* Agent timeline */}
          {agentFlow.length > 0 && (
            <>
              <Divider />
              <AgentTimeline steps={agentFlow} color={color} />
            </>
          )}
        </>
      )}
    </View>
  );
};

// ─── LeafletMapView ─────────────────────────────────────────────
const LeafletMapView = ({ events }: { events: any[] }) => {
  const html = buildMapHtml(events);
  return (
    <View style={{ flex: 1 }}>
      <View style={ss.leafletWrap}>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={ss.mapLoader}>
              <ActivityIndicator color="#10b981" size="large" />
              <Text style={ss.mapLoadTxt}>Loading OpenStreetMap…</Text>
            </View>
          )}
        />
        <View style={ss.mapOverlayBadge}>
          <View style={ss.mapDot} />
          <Text style={ss.mapOverlayText}>LIVE — {events.length} CRISIS ZONES PLOTTED</Text>
        </View>
      </View>

      <ScrollView style={ss.routeScroll} contentContainerStyle={{ padding: 14, gap: 10 }}>
        <Text style={ss.routeListTitle}>⚡ Active Traffic Rerouting Commands</Text>
        {events.length === 0 ? (
          <Text style={ss.noRoute}>No active hazards. City traffic clear.</Text>
        ) : (
          events.map((ev, i) => {
            const color = getCrisisColor(ev.crisis_type, ev.status);
            const route = ev.mitigation_plan?.safe_route;
            if (!route) return null;
            return (
              <View key={ev.id || i} style={[ss.routeCard, { borderLeftColor: color }]}>
                <Text style={[ss.routeCardTitle, { color }]}>
                  {getCrisisEmoji(ev.crisis_type, ev.status)} {ev.crisis_type} @ {ev.location}
                </Text>
                <Text style={ss.routeCardAvoid}>❌ Avoid: {route.avoid}</Text>
                <Text style={ss.routeCardUse}>✅ Use: {route.recommended_path}</Text>
              </View>
            );
          }).filter(Boolean)
        )}
      </ScrollView>
    </View>
  );
};

// ─── App ─────────────────────────────────────────────────────────
const App = () => {
  const [events, setEvents]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'map'>('feed');
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  }, []);

  const fetchEvents = async () => {
    try {
      const res  = await fetch(`${BACKEND_URL}/api/events`);
      const data = await res.json();
      if (data.events?.length) {
        const sorted = [...data.events].sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
        setEvents(sorted);
      }
    } catch (e) { console.error('fetch error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const startSession = async () => {
    setLoading(true);
    try {
      await fetch(`${BACKEND_URL}/api/session/start`, { method: 'POST' });
      await fetchEvents();
    } catch (e) { console.error(e); setLoading(false); }
  };

  useEffect(() => {
    startSession();
    const iv = setInterval(fetchEvents, 8000);
    return () => clearInterval(iv);
  }, []);

  const verified   = events.filter(e => e.status === 'Verified').length;
  const falseAlarm = events.filter(e => e.status === 'FALSE ALARM').length;
  const avgConf    = events.length
    ? Math.round(events.reduce((s, e) => s + (e.confidence_score || 0), 0) / events.length)
    : 0;

  return (
    <SafeAreaView style={ss.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={ss.header}>
        <View style={ss.headerTopRow}>
          <View>
            <Text style={ss.headerTitle}>🛡️ CrisisAI</Text>
            <Text style={ss.headerSub}>Karachi Real-Time Agentic Ops</Text>
          </View>
          <Animated.View style={[ss.liveBadge, { transform: [{ scale: pulseAnim }] }]}>
            <View style={ss.liveDot} />
            <Text style={ss.liveText}>LIVE</Text>
          </Animated.View>
        </View>

        {/* Stats */}
        <View style={ss.statsRow}>
          <View style={ss.statBox}>
            <Text style={ss.statVal}>{events.length}</Text>
            <Text style={ss.statLbl}>EVENTS</Text>
          </View>
          <View style={ss.statDiv} />
          <View style={ss.statBox}>
            <Text style={[ss.statVal, { color: '#ef4444' }]}>{verified}</Text>
            <Text style={ss.statLbl}>VERIFIED</Text>
          </View>
          <View style={ss.statDiv} />
          <View style={ss.statBox}>
            <Text style={[ss.statVal, { color: '#10b981' }]}>{falseAlarm}</Text>
            <Text style={ss.statLbl}>DEBUNKED</Text>
          </View>
          <View style={ss.statDiv} />
          <View style={ss.statBox}>
            <Text style={[ss.statVal, { color: '#f97316' }]}>{avgConf}%</Text>
            <Text style={ss.statLbl}>AVG CONF</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={ss.actionRow}>
          <TouchableOpacity style={ss.btnPrimary} onPress={startSession}>
            <Text style={ss.btnPrimaryTxt}>⚡ New Simulation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ss.btnSecondary} onPress={() => { setRefreshing(true); fetchEvents(); }}>
            <Text style={ss.btnSecondaryTxt}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={ss.tabRow}>
          {(['feed', 'map'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[ss.tab, activeTab === tab && ss.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[ss.tabTxt, activeTab === tab && ss.tabTxtActive]}>
                {tab === 'feed' ? '📋 Crisis Feed' : '🗺️ Live Map'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={ss.loaderBox}>
          <ActivityIndicator color="#10b981" size="large" />
          <Text style={ss.loaderTxt}>Initializing Crisis Agents…</Text>
          <Text style={ss.loaderSub}>Cross-checking sensors, social feeds & satellite data</Text>
        </View>
      ) : activeTab === 'feed' ? (
        <FlatList
          data={events}
          keyExtractor={item => item.id || String(Math.random())}
          renderItem={({ item }) => <CrisisCard item={item} />}
          contentContainerStyle={ss.listContent}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchEvents(); }}
          ListEmptyComponent={
            <View style={ss.emptyBox}>
              <Text style={{ fontSize: 52, marginBottom: 16 }}>📡</Text>
              <Text style={ss.emptyTxt}>No active crises detected.{'\n'}Tap New Simulation to begin.</Text>
              <TouchableOpacity style={ss.btnPrimary} onPress={startSession}>
                <Text style={ss.btnPrimaryTxt}>⚡ Start Simulation</Text>
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

// ─── Styles ──────────────────────────────────────────────────────
const ss = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f1f5f9' },

  // Header
  header:       { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 0, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerTitle:  { fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: 0.3 },
  headerSub:    { fontSize: 11, color: '#10b981', fontWeight: '700', marginTop: 1 },
  liveBadge:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#dcfce7' },
  liveDot:      { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#16a34a', marginRight: 5 },
  liveText:     { fontSize: 11, fontWeight: '800', color: '#166534', letterSpacing: 1 },

  statsRow:     { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  statBox:      { flex: 1, alignItems: 'center' },
  statVal:      { fontSize: 17, fontWeight: '900', color: '#1e293b' },
  statLbl:      { fontSize: 9, color: '#94a3b8', fontWeight: '700', marginTop: 2, letterSpacing: 0.8 },
  statDiv:      { width: 1, height: 28, backgroundColor: '#e2e8f0' },

  actionRow:    { flexDirection: 'row', gap: 10, marginBottom: 14 },
  btnPrimary:   { flex: 1.2, backgroundColor: '#0f172a', paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  btnPrimaryTxt:{ color: '#fff', fontSize: 13, fontWeight: '700' },
  btnSecondary: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  btnSecondaryTxt: { color: '#475569', fontSize: 13, fontWeight: '700' },

  tabRow:       { flexDirection: 'row', gap: 4 },
  tab:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:    { borderBottomColor: '#0f172a' },
  tabTxt:       { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  tabTxtActive: { color: '#0f172a' },

  loaderBox:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loaderTxt:    { color: '#334155', fontWeight: '700', fontSize: 15 },
  loaderSub:    { color: '#94a3b8', fontWeight: '500', fontSize: 12, textAlign: 'center', paddingHorizontal: 30 },

  listContent:  { padding: 12, gap: 12 },

  // Card
  card:         { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 3, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, padding: 16 },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  crisisType:   { fontSize: 19, fontWeight: '900', letterSpacing: 0.2 },
  location:     { fontSize: 12, color: '#64748b', fontWeight: '600' },
  statusBadge:  { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  statusBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.6 },

  confBlock:    { marginBottom: 4 },
  confRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  confLabel:    { fontSize: 11, color: '#64748b', fontWeight: '600' },
  confPct:      { fontSize: 12, fontWeight: '900' },
  confBg:       { height: 7, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  confFill:     { height: '100%', borderRadius: 4 },
  falseAlarmNote: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: '500', fontStyle: 'italic' },

  falseAlarmBanner: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#86efac', marginTop: 10 },
  falseAlarmTitle:  { fontSize: 12, fontWeight: '800', color: '#166534', marginBottom: 4 },
  falseAlarmBody:   { fontSize: 12, color: '#166534', lineHeight: 17, fontWeight: '500' },

  alertBox:     { borderRadius: 10, padding: 12, borderWidth: 1, marginTop: 10, marginBottom: 4 },
  alertBoxText: { fontSize: 12, fontWeight: '600', lineHeight: 18 },

  divider:      { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },

  block:        { gap: 8 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  sectionHeaderIcon: { fontSize: 14 },
  sectionHeaderText: { fontSize: 11, fontWeight: '800', color: '#334155', textTransform: 'uppercase', letterSpacing: 0.8 },

  // Sources
  sourceRow:    { flexDirection: 'row', alignItems: 'center', padding: 9, borderRadius: 9, marginBottom: 5, borderWidth: 1 },
  sourceName:   { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  sourceReading:{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 15 },
  srcBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, marginLeft: 8, alignSelf: 'flex-start' },
  srcBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },

  // Social
  socialCard:   { backgroundColor: '#f8fafc', borderRadius: 10, padding: 11, marginBottom: 7, borderLeftWidth: 3 },
  socialTop:    { flexDirection: 'row', gap: 8, marginBottom: 7, alignItems: 'flex-start' },
  avatar:       { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { color: '#fff', fontSize: 12, fontWeight: '900' },
  socialHandle: { fontSize: 12, fontWeight: '800', color: '#1e293b' },
  socialTime:   { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
  credBadge:    { marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1, alignSelf: 'flex-start' },
  credText:     { fontSize: 8, fontWeight: '800', letterSpacing: 0.3 },
  socialText:   { fontSize: 12, color: '#334155', lineHeight: 17, fontWeight: '500' },

  // Hospital
  hospitalCard: { borderRadius: 12, borderWidth: 1.5, padding: 13, marginBottom: 10 },
  hospitalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  hospitalIcon: { fontSize: 20, marginTop: 2 },
  hospitalName: { fontSize: 13, fontWeight: '800' },
  hospitalSpec: { fontSize: 10, color: '#64748b', marginTop: 2, fontWeight: '600' },
  etaBadge:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, alignSelf: 'flex-start' },
  etaText:      { fontSize: 10, fontWeight: '800' },
  bedSection:   { marginBottom: 8 },
  bedRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  bedLabel:     { fontSize: 10, color: '#64748b', fontWeight: '600' },
  bedCount:     { fontSize: 10, color: '#64748b', fontWeight: '600' },
  bedBarBg:     { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  bedBarFill:   { height: '100%', borderRadius: 4 },
  bedPrepText:  { fontSize: 11, fontWeight: '700' },
  hospitalMsg:  { fontSize: 11, color: '#475569', lineHeight: 16, fontWeight: '500' },

  // Sub-block
  subBlock:     { marginBottom: 10, marginTop: 4 },
  subBlockTitle:{ fontSize: 11, fontWeight: '800', color: '#334155', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Authorities
  authRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 9, borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: '#f1f5f9' },
  authName:     { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  authUnits:    { fontSize: 11, color: '#64748b', marginTop: 1, fontWeight: '500' },
  authBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8, alignSelf: 'flex-start' },
  authBadgeText:{ fontSize: 9, fontWeight: '800' },

  // Resources
  pillRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pill:         { borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  pillText:     { fontSize: 11, fontWeight: '800' },

  // Route
  routeBox:     { borderRadius: 8, padding: 10, borderWidth: 1 },
  routeAvoidLabel: { fontSize: 9, fontWeight: '800', color: '#dc2626', letterSpacing: 0.5, marginBottom: 3 },
  routeAvoid:   { fontSize: 11, color: '#7f1d1d', lineHeight: 16, fontWeight: '600' },
  routeUseLabel:{ fontSize: 9, fontWeight: '800', color: '#16a34a', letterSpacing: 0.5, marginBottom: 3 },
  routeUse:     { fontSize: 11, color: '#14532d', lineHeight: 16, fontWeight: '600' },

  // Timeline
  tlRow:        { flexDirection: 'row' },
  tlLeft:       { width: 30, alignItems: 'center' },
  tlDot:        { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tlDotText:    { fontSize: 9, fontWeight: '900', color: '#fff' },
  tlLine:       { width: 2, flex: 1, marginTop: 2 },
  tlContent:    { flex: 1, paddingLeft: 10 },
  tlTopRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, flexWrap: 'wrap', gap: 4 },
  tlStep:       { fontSize: 12, fontWeight: '800', color: '#1e293b', flex: 1 },
  tlTime:       { fontSize: 9, color: '#94a3b8', fontWeight: '600' },
  tlBadge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  tlBadgeText:  { fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  tlDetails:    { fontSize: 11, color: '#64748b', lineHeight: 16, fontWeight: '500' },

  // Empty
  emptyBox:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 30, gap: 12 },
  emptyTxt:     { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22, fontWeight: '600' },

  // Map
  leafletWrap:  { height: 340, margin: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.09, shadowRadius: 10 },
  mapLoader:    { ...StyleSheet.absoluteFillObject, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  mapLoadTxt:   { color: '#94a3b8', fontWeight: '600', marginTop: 10 },
  mapOverlayBadge: { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.88)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  mapDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 6 },
  mapOverlayText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },

  routeScroll:  { flex: 1 },
  routeListTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  routeCard:    { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, marginBottom: 2 },
  routeCardTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 5 },
  routeCardAvoid: { fontSize: 11, color: '#7f1d1d', lineHeight: 16, fontWeight: '600', marginTop: 2 },
  routeCardUse:   { fontSize: 11, color: '#14532d', lineHeight: 16, fontWeight: '600', marginTop: 3 },
  noRoute:      { fontSize: 13, color: '#94a3b8', textAlign: 'center', fontWeight: '500', paddingVertical: 20 },
});

export default App;
