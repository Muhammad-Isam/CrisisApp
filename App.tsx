import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
} from 'react-native';

// TODO: Replace with your actual GCP Cloud Run URL once deployed
const BACKEND_URL = 'https://crisisapp-957944136608.europe-west1.run.app';

const getCrisisColor = (type: string) => {
  switch (type.toUpperCase()) {
    case 'FIRE': return '#d32f2f'; // Red
    case 'EARTHQUAKE': return '#f57c00'; // Orange
    case 'FLOOD': return '#1976d2'; // Blue
    case 'HEATWAVE': return '#fbc02d'; // Yellow
    default: return '#388e3c'; // Green fallback
  }
};

const App = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/events`);
      const data = await response.json();
      if (data.events) setEvents(data.events);
    } catch (error) {
      console.error("Failed to fetch events. Is backend running?", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderEventCard = ({ item }: { item: any }) => {
    const typeColor = getCrisisColor(item.crisis_type || 'UNKNOWN');
    const isVerified = item.confidence_score > 75;

    return (
      <View style={[styles.card, { borderLeftColor: typeColor, borderLeftWidth: 6 }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.crisisType, { color: typeColor }]}>
            {item.crisis_type || 'UNKNOWN EVENT'}
          </Text>
          <View style={[styles.badge, { backgroundColor: isVerified ? '#e8f5e9' : '#fff3e0' }]}>
            <Text style={[styles.badgeText, { color: isVerified ? '#2e7d32' : '#e65100' }]}>
              {isVerified ? 'VERIFIED' : 'PROBABLE'}
            </Text>
          </View>
        </View>

        <Text style={styles.location}>📍 {item.location || 'Unknown Sector'}</Text>
        <Text style={styles.confidence}>Confidence Score: {item.confidence_score || 0}%</Text>

        {item.actions_taken && item.actions_taken.length > 0 && (
          <View style={[styles.mitigationContainer, { backgroundColor: typeColor + '15' }]}>
            <Text style={[styles.mitigationTitle, { color: typeColor }]}>
              Active Mitigations & Alerts:
            </Text>
            {item.actions_taken.map((action: any, idx: number) => {
              // Format the action text nicely
              let actionText = JSON.stringify(action);
              if (action.action === 'public_alert_issued') {
                 actionText = `🚨 ALERT: ${action.message}`;
              } else if (action.action === 'route_calculated') {
                 actionText = `🗺️ ROUTE: Avoid ${action.avoid}. Use ${action.recommended_path}`;
              } else if (action.action === 'stakeholder_notified') {
                 actionText = `📞 NOTIFIED [${action.target}]: ${action.message}`;
              }

              return (
                <Text key={idx} style={[styles.actionText, { color: '#374151' }]}>
                  {actionText}
                </Text>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Crisis Orchestrator</Text>
        <Text style={styles.headerSub}>Live Agentic Feeds</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2e7d32" style={styles.loader} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderEventCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
             <Text style={styles.emptyText}>Monitoring sectors. No active crises detected.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4', // Very light green background
  },
  header: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
    elevation: 4, // shadow for android
    shadowColor: '#000', // shadow for ios
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#166534', // Dark green text
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 14,
    color: '#22c55e', // Vibrant green
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
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
    padding: 20,
    marginBottom: 16,
    elevation: 3, // shadow for android
    shadowColor: '#000', // shadow for ios
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  crisisType: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  location: {
    fontSize: 15,
    color: '#4b5563', // Dark gray
    marginBottom: 6,
    fontWeight: '500',
  },
  confidence: {
    fontSize: 14,
    color: '#6b7280', // Medium gray
    marginBottom: 16,
    fontWeight: '500',
  },
  mitigationContainer: {
    padding: 16,
    borderRadius: 12,
    marginTop: 4,
  },
  mitigationTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionText: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
    lineHeight: 20,
  },
  emptyText: {
    color: '#15803d',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    fontWeight: '500',
  }
});

export default App;
