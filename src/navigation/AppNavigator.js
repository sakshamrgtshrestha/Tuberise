/**
 * AppNavigator — Fixed Tab Structure
 *
 * Bottom Tabs (in order):
 *   1. Campaign  🚀  → CampaignScreen  (Campaign list + create)
 *   2. View      📺  → HomeScreen     (Watch task feed)
 *   3. Subscribe 🔔  → SubscribeScreen (Subscribe task)
 *   4. Like      👍  → LikeScreen     (Like task)
 *   5. Comment   💬  → CommentScreen  (Comment task)
 *
 * Stack screens (modal-style, no tab):
 *   - TaskDetail, CampaignCreation, CampaignDetail, Profile
 *   (CoinSuccess removed — task completion now shows a toast and navigates to the correct tab)
 */
import React from 'react';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Auth ─────────────────────────────────────────────────────────────────────
import LoginScreen from '../screens/LoginScreen';

// ── User Tab Screens ─────────────────────────────────────────────────────────
import HomeScreen       from '../screens/HomeScreen';       // View tab (Watch)
import LikeScreen       from '../screens/LikeScreen';       // Like tab
import CommentScreen    from '../screens/CommentScreen';    // Comment tab
import SubscribeScreen  from '../screens/SubscribeScreen';  // Subscribe tab
import CampaignScreen   from '../screens/CampaignScreen';  // Campaign tab

// ── Stack-Only Screens ────────────────────────────────────────────────────────
import TaskDetailScreen      from '../screens/TaskDetailScreen';
import CampaignCreationScreen from '../screens/CampaignCreationScreen';
import CampaignDetailScreen  from '../screens/CampaignDetailScreen';
import ProfileScreen         from '../screens/ProfileScreen';
import HowToUseScreen        from '../screens/HowToUseScreen';
import PrivacyPolicyScreen   from '../screens/PrivacyPolicyScreen';
import BuyCoinsScreen        from '../screens/BuyCoinsScreen';

// ── Admin Screens ─────────────────────────────────────────────────────────────
import AdminScreen from '../screens/AdminScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Tab Icon Component ────────────────────────────────────────────────────────
function TabIcon({ iconName, label, focused }) {
  return (
    <View style={ti.wrap}>
      <MaterialIcons name={iconName} size={28} color={focused ? '#3366FF' : '#9CA3AF'} />
      {focused && <Text style={ti.labelFocused}>{label}</Text>}
    </View>
  );
}

// ── 5-Tab Bottom Navigator ────────────────────────────────────────────────────
function UserTabs() {
  const { isAdmin, user } = useAuth();
  const { bottom } = useSafeAreaInsets();
  // Show Admin tab if isAdmin flag OR role field says admin (belt-and-suspenders)
  const showAdmin = isAdmin || user?.role === 'admin';

  return (
    <Tab.Navigator
      key={isAdmin ? 'admin' : 'user'}
      initialRouteName="View"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { 
          height: 64 + bottom,
          paddingBottom: 8 + bottom,
          paddingTop: 4,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          elevation: 16,
        },
      }}
    >
      {/* 1 — Campaign */}
      <Tab.Screen
        name="Campaign"
        component={CampaignScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="inbox" label="Campaign" focused={focused} />
          ),
        }}
      />

      {/* 2 — View (Watch task feed) */}
      <Tab.Screen
        name="View"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="play-arrow" label="Views" focused={focused} />
          ),
        }}
      />

      {/* 3 — Subscribe */}
      <Tab.Screen
        name="Subscribe"
        component={SubscribeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="playlist-play" label="Subscribe" focused={focused} />
          ),
        }}
      />

      {/* 4 — Like */}
      <Tab.Screen
        name="Like"
        component={LikeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="thumb-up" label="Like" focused={focused} />
          ),
        }}
      />

      {/* 5 — Comment */}
      <Tab.Screen
        name="Comment"
        component={CommentScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="chat-bubble" label="Comment" focused={focused} />
          ),
        }}
      />

      {/* Admin Tab (Conditional) */}
      {showAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon iconName="admin-panel-settings" label="Admin" focused={focused} />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
}

// ── User Stack (tabs + pushed screens) ───────────────────────────────────────
function UserStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs"         component={UserTabs} />
      <Stack.Screen name="TaskDetail"       component={TaskDetailScreen} />
      <Stack.Screen name="CampaignCreation" component={CampaignCreationScreen} />
      <Stack.Screen name="CampaignDetail"   component={CampaignDetailScreen} />
      <Stack.Screen name="Profile"          component={ProfileScreen} />
      <Stack.Screen name="HowToUse"         component={HowToUseScreen} />
      <Stack.Screen name="PrivacyPolicy"    component={PrivacyPolicyScreen} />
      <Stack.Screen name="BuyCoins"         component={BuyCoinsScreen} />
    </Stack.Navigator>
  );
}


// ── Auth Stack ────────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { user, initializing } = useAuth();

  // While AsyncStorage session is being read, show a plain splash
  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#3366FF" />
      </View>
    );
  }

  if (!user) {
    return (
      <NavigationContainer>
        <AuthStack />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <UserStack />
    </NavigationContainer>
  );
}

// ── Tab Bar Styles ────────────────────────────────────────────────────────────
const ti = StyleSheet.create({
  tabBar: {
    height: 64,
    paddingBottom: 8,
    paddingTop: 4,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },
  wrap:         { alignItems: 'center', justifyContent: 'center' },
  labelFocused: { fontSize: 11, color: '#3366FF', marginTop: 2, fontWeight: '700' },
});
