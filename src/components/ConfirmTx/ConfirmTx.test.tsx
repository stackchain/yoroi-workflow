import {NavigationContainer} from '@react-navigation/native'
import {render} from '@testing-library/react-native'
import React from 'react'
import {Provider} from 'react-redux'

import configureStore from '../../../legacy/helpers/configureStore.js'

global.window = {}
global.React = React

const store = configureStore(true)

import {ConfirmTx} from './ConfirmTx'

describe('ConfirmTx', () => {
  const handleOnSuccess = jest.fn()
  const handleSetUseUSB = jest.fn()
  it.skip('renders correctly with defaults', () => {
    const component = (
      <Provider store={store}>
        <NavigationContainer>
          <ConfirmTx
            biometricRoute=""
            onSuccess={handleOnSuccess}
            process="signAndSubmit"
            setUseUSB={handleSetUseUSB}
            txDataSignRequest={{
              senderUtxos: [],
              changeAddr: [],
            }}
            useUSB
          />
        </NavigationContainer>
      </Provider>
    )
    const {getByPlaceholderText} = render(component)
    const input = getByPlaceholderText(/password/i)
    expect(input).toBeTruthy()
  })
})