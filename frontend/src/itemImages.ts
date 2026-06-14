const images: Record<string, any> = {
  guitar: require('../assets/items/guitar.png'),
  macbook: require('../assets/items/macbook.png'),
  jacket: require('../assets/items/jacket.png'),
  headphones: require('../assets/items/headphones.png'),
  bike: require('../assets/items/bike.png'),
  switch: require('../assets/items/switch.png'),
  camera: require('../assets/items/camera.png'),
  desk: require('../assets/items/desk.png'),
  skateboard: require('../assets/items/skateboard.png'),
  keyboard: require('../assets/items/keyboard.png'),
};

export function getLocalImage(imageUrl: string | null): any | null {
  if (!imageUrl) return null;
  const key = imageUrl.replace('local://', '');
  return images[key] || null;
}
