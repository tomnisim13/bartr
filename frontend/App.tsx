import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SwipeScreen } from './src/screens/SwipeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

type Screen = 'swipe' | 'profile';

export default function App() {
  const [screen, setScreen] = useState<Screen>('swipe');

  return (
    <>
      {screen === 'swipe' ? (
        <SwipeScreen onProfilePress={() => setScreen('profile')} />
      ) : (
        <ProfileScreen onBack={() => setScreen('swipe')} />
      )}
      <StatusBar style="dark" />
    </>
  );
}
