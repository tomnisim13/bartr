import React from 'react';
import { Image, StyleSheet, View, ImageStyle, StyleProp } from 'react-native';
import { getLocalImage } from '../itemImages';

interface Props {
  imageUrl: string | null;
  style?: StyleProp<ImageStyle>;
}

export function ItemImage({ imageUrl, style }: Props) {
  const localImg = getLocalImage(imageUrl);
  if (localImg) return <Image source={localImg} style={style} />;
  if (imageUrl) return <Image source={{ uri: imageUrl }} style={style} />;
  return <View style={[style, styles.placeholder]} />;
}

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
