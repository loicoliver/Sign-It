import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import DocumentDetailScreen from './src/screens/DocumentDetailScreen';
import DebugStorageScreen from './src/screens/DebugStorageScreen';
import { getAccessToken } from './src/services/secureStore';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    const token = await getAccessToken();
    if (token) {
      setInitialRoute('Home');
    } else {
      setInitialRoute('Login');
    }
  };

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f172a' }
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} />
        <Stack.Screen name="DebugStorage" component={DebugStorageScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
