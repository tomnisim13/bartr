import { StatusBar } from 'expo-status-bar';
import { Alert, Button, StyleSheet, View } from 'react-native';

const API_URL = 'http://192.168.1.118:3000';

export default function App() {
  const addTestItem = async () => {
    try {
      const response = await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Used iPhone from Bartr' }),
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      Alert.alert('Success', 'Item added to Bartr!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Add Test Item to Bartr" onPress={addTestItem} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
