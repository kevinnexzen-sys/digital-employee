/**
 * KevinJr Mobile App
 * Your AI companion on mobile
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Alert,
  AppState,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';

// Screens
import ChatScreen from './src/screens/ChatScreen';
import StatusScreen from './src/screens/StatusScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

// Services
import KevinJrAPI from './src/services/KevinJrAPI';
import AuthService from './src/services/AuthService';
import NotificationService from './src/services/NotificationService';

// Utils
import { Colors, Fonts } from './src/utils/Theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Chat') {
            iconName = 'chat';
          } else if (route.name === 'Status') {
            iconName = 'dashboard';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.medium,
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: Colors.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: Colors.white,
        headerTitleStyle: {
          fontFamily: Fonts.bold,
          fontSize: 18,
        },
      })}
    >
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{
          title: 'KevinJr',
          headerRight: () => (
            <View style={styles.headerRight}>
              <Icon name="smart-toy" size={24} color={Colors.white} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Status" 
        component={StatusScreen}
        options={{
          title: 'Status',
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Component
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [kevinJrStatus, setKevinJrStatus] = useState('connecting');

  useEffect(() => {
    initializeApp();
    setupNetworkListener();
    setupAppStateListener();
  }, []);

  const initializeApp = async () => {
    try {
      // Check if first launch
      const hasLaunched = await AuthService.hasLaunchedBefore();
      setIsFirstLaunch(!hasLaunched);

      // Initialize services
      await AuthService.initialize();
      await NotificationService.initialize();
      
      // Connect to KevinJr
      await connectToKevinJr();

      // Mark as launched
      if (!hasLaunched) {
        await AuthService.markAsLaunched();
      }

    } catch (error) {
      console.error('App initialization failed:', error);
      Alert.alert(
        'Initialization Error',
        'Failed to initialize the app. Please restart and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const connectToKevinJr = async () => {
    try {
      setKevinJrStatus('connecting');
      
      const status = await KevinJrAPI.getStatus();
      if (status.success) {
        setKevinJrStatus('connected');
        console.log('✅ Connected to KevinJr:', status.data);
      } else {
        setKevinJrStatus('disconnected');
        console.warn('⚠️ KevinJr connection failed:', status.error);
      }
    } catch (error) {
      setKevinJrStatus('error');
      console.error('❌ KevinJr connection error:', error);
    }
  };

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      
      if (state.isConnected && kevinJrStatus !== 'connected') {
        // Retry connection when network is restored
        connectToKevinJr();
      }
    });

    return unsubscribe;
  };

  const setupAppStateListener = () => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && kevinJrStatus !== 'connected') {
        // Retry connection when app becomes active
        connectToKevinJr();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  };

  // Loading Screen
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <View style={styles.loadingContent}>
          <Icon name="smart-toy" size={80} color={Colors.primary} />
          <Text style={styles.loadingTitle}>KevinJr</Text>
          <Text style={styles.loadingSubtitle}>Your AI Companion</Text>
          <View style={styles.loadingIndicator}>
            <Text style={styles.loadingText}>Initializing...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Connection Status Banner
  const ConnectionBanner = () => {
    if (isConnected && kevinJrStatus === 'connected') return null;

    let message = '';
    let backgroundColor = Colors.warning;

    if (!isConnected) {
      message = '📡 No internet connection';
      backgroundColor = Colors.error;
    } else if (kevinJrStatus === 'connecting') {
      message = '🔄 Connecting to KevinJr...';
      backgroundColor = Colors.warning;
    } else if (kevinJrStatus === 'disconnected') {
      message = '⚠️ KevinJr is offline';
      backgroundColor = Colors.warning;
    } else if (kevinJrStatus === 'error') {
      message = '❌ Connection error';
      backgroundColor = Colors.error;
    }

    return (
      <View style={[styles.connectionBanner, { backgroundColor }]}>
        <Text style={styles.connectionBannerText}>{message}</Text>
      </View>
    );
  };

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ConnectionBanner />
      
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isFirstLaunch ? (
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingScreen}
            options={{ gestureEnabled: false }}
          />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    marginBottom: 40,
  },
  loadingIndicator: {
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  headerRight: {
    marginRight: 15,
  },
  connectionBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  connectionBannerText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
});
