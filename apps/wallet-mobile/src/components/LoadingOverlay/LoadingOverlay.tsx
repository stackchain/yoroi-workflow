import React from 'react'
import {ActivityIndicator, StyleSheet, View} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

export const LoadingOverlay = ({loading}: {loading: boolean}) => {
  return loading ? (
    <LinearGradient
      style={[StyleSheet.absoluteFill, {opacity: 0.5}]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      colors={['#E4E8F7', '#C6F7F7']}
    >
      <View style={[StyleSheet.absoluteFill, {alignItems: 'center', justifyContent: 'center'}]}>
        <ActivityIndicator
          animating
          size="large"
          color="black"
          style={{padding: 20, backgroundColor: '#EAEDF2', borderRadius: 10, opacity: 0.8}}
        />
      </View>
    </LinearGradient>
  ) : null
}
