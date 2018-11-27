import React from 'react'
import {compose} from 'redux'
import _ from 'lodash'
import {View, TouchableOpacity} from 'react-native'
import {withState, withHandlers} from 'recompose'

import Text from '../../components/UiKit/Text'

import styles from './styles/PinInput.style'

const BACKSPACE = '⌫'
const keyboard = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', BACKSPACE],
]

const processPin = (pin, setPin, pinMaxLength, keyDown, onPinEnter) => {
  if (keyDown === BACKSPACE) {
    setPin(pin.substring(0, pin.length - 1))
  } else {
    const newPin = pin.concat(keyDown)
    setPin(newPin)

    if (newPin.length === pinMaxLength) {
      setPin('')
      onPinEnter(newPin)
    }
  }
}

const PinPlaceholder = ({isActive}) => (
  <View style={isActive ? styles.pinActive : styles.pinInactive} />
)

const KeyboardKey = ({value, onKeyDown}) => (
  <TouchableOpacity
    style={styles.keyboardKey}
    onPress={onKeyDown}
    disabled={value === ''}
  >
    <Text style={styles.keyboardKeyText}>{value}</Text>
  </TouchableOpacity>
)

const EnhancedKeyboardKey = withHandlers({
  onKeyDown: ({value, onPress}) => () => onPress(value),
})(KeyboardKey)

type Props = {
  pin: string,
  setPin: (string) => void,
  pinMaxLength: number,
  labels: {title: string, subtitle: string, subtitle2: string},
  onKeyDown: (string) => void,
  onPinEnter: (string) => void,
}

const PinInput = ({
  pin,
  setPin,
  pinMaxLength,
  labels,
  onKeyDown,
  onPinEnter,
}: Props) => (
  <View style={styles.root}>
    <View style={styles.titleContainer}>
      <Text style={styles.title}>{labels.title}</Text>
    </View>

    <View style={styles.pinContainer}>
      {_.range(0, pinMaxLength).map((index) => (
        <PinPlaceholder key={index} isActive={index < pin.length} />
      ))}
    </View>

    <View style={styles.subtitleContainer}>
      <Text style={styles.subtitle}>{labels.subtitle}</Text>
      <Text style={styles.subtitle}>{labels.subtitle2}</Text>
    </View>

    <View style={styles.keyboard}>
      {keyboard.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.keyboardRow}>
          {row.map((value, index) => (
            <EnhancedKeyboardKey
              key={index}
              value={value}
              onPress={onKeyDown}
            />
          ))}
        </View>
      ))}
    </View>
  </View>
)

export default compose(
  withState('pin', 'setPin', ''),
  withHandlers({
    onKeyDown: ({pin, setPin, pinMaxLength, onPinEnter}) => (value) =>
      processPin(pin, setPin, pinMaxLength, value, onPinEnter),
  }),
)(PinInput)