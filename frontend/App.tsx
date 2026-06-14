import { StatusBar } from 'expo-status-bar';
import { SwipeScreen } from './src/screens/SwipeScreen';

export default function App() {
  return (
    <>
      <SwipeScreen />
      <StatusBar style="dark" />
    </>
  );
}
