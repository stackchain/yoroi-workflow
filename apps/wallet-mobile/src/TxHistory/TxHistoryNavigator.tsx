import {createStackNavigator} from '@react-navigation/stack'
import React from 'react'
import {defineMessages, useIntl} from 'react-intl'
import {StyleSheet, Text, TouchableOpacity, TouchableOpacityProps} from 'react-native'

import {Boundary, Icon} from '../components'
import {useNavigateTo} from '../features/Send/common/navigation'
import {SendProvider} from '../features/Send/common/SendContext'
import {ConfirmTxScreen} from '../features/Send/useCases/ConfirmTx/ConfirmTxScreen'
import {FailedTxScreen} from '../features/Send/useCases/ConfirmTx/FailedTx/FailedTxScreen'
import {SubmittedTxScreen} from '../features/Send/useCases/ConfirmTx/SubmittedTx/SubmittedTxScreen'
import {ListAmountsToSendScreen} from '../features/Send/useCases/ListAmountsToSend'
import {SelectTokenFromListScreen} from '../features/Send/useCases/ListAmountsToSend/AddToken/SelectTokenFromListScreen'
import {EditAmountScreen} from '../features/Send/useCases/ListAmountsToSend/EditAmount/EditAmountScreen'
import {ReadQRCodeScreen} from '../features/Send/useCases/StartMultiTokenTx/InputReceiver/ReadQRCodeScreen'
import {StartMultiTokenTxScreen} from '../features/Send/useCases/StartMultiTokenTx/StartMultiTokenTxScreen'
import {
  defaultStackNavigationOptions,
  defaultStackNavigationOptionsV2,
  TxHistoryRoutes,
  useWalletNavigation,
} from '../navigation'
import {ReceiveScreen} from '../Receive/ReceiveScreen'
import {useSelectedWallet} from '../SelectedWallet'
import {COLORS} from '../theme'
import {useWalletName} from '../yoroi-wallets/hooks'
import {ModalInfo} from './ModalInfo'
import {TxDetails} from './TxDetails'
import {TxHistory} from './TxHistory'

const Stack = createStackNavigator<TxHistoryRoutes>()
export const TxHistoryNavigator = () => {
  const strings = useStrings()
  const wallet = useSelectedWallet()

  const walletName = useWalletName(wallet)
  const [modalInfoState, setModalInfoState] = React.useState(false)
  const showModalInfo = () => setModalInfoState(true)
  const hideModalInfo = () => setModalInfoState(false)

  return (
    <SendProvider key={wallet.id}>
      <Stack.Navigator
        screenOptions={{
          ...defaultStackNavigationOptions,
          detachPreviousScreen: false /* https://github.com/react-navigation/react-navigation/issues/9883 */,
        }}
      >
        <Stack.Screen
          name="history-list"
          component={TxHistory}
          options={{
            ...defaultStackNavigationOptionsV2,
            title: walletName ?? '',
            headerRight: () => <HeaderRightHistory />,
          }}
        />

        <Stack.Screen name="history-details" options={{title: ''}}>
          {() => (
            <Boundary loading={{size: 'full'}}>
              <TxDetails />
            </Boundary>
          )}
        </Stack.Screen>

        <Stack.Screen
          name="receive"
          component={ReceiveScreen}
          options={{
            ...defaultStackNavigationOptionsV2,
            title: strings.receiveTitle,
            headerRight: () => <ModalInfoIconButton onPress={showModalInfo} />,
            headerStyle: {
              elevation: 0,
              shadowOpacity: 0,
              backgroundColor: '#fff',
            },
          }}
        />

        <Stack.Screen
          name="send-start-tx"
          options={{
            title: strings.sendTitle,
            ...sendOptions,
          }}
        >
          {() => (
            <Boundary>
              <StartMultiTokenTxScreen />
            </Boundary>
          )}
        </Stack.Screen>

        <Stack.Screen
          name="send-select-token-from-list"
          options={{
            title: strings.selectAssetTitle,
            ...sendOptions,
          }}
        >
          {() => (
            <Boundary>
              <SelectTokenFromListScreen />
            </Boundary>
          )}
        </Stack.Screen>

        <Stack.Screen //
          name="send-list-amounts-to-send"
          options={{
            title: strings.listAmountsToSendTitle,
            ...sendOptions,
          }}
        >
          {() => (
            <Boundary>
              <ListAmountsToSendScreen />
            </Boundary>
          )}
        </Stack.Screen>

        <Stack.Screen //
          name="send-edit-amount"
          options={{
            title: strings.editAmountTitle,
            ...sendOptions,
            headerLeft: () => <SendEditAmountBackButton />,
          }}
        >
          {() => (
            <Boundary>
              <EditAmountScreen />
            </Boundary>
          )}
        </Stack.Screen>

        <Stack.Screen //
          name="send-read-qr-code"
          component={ReadQRCodeScreen}
          options={{
            title: strings.qrScannerTitle,
            ...sendOptions,
          }}
        />

        <Stack.Screen //
          name="send-confirm-tx"
          component={ConfirmTxScreen}
          options={{
            title: strings.confirmTitle,
            ...sendOptions,
          }}
        />

        <Stack.Screen name="send-submitted-tx" component={SubmittedTxScreen} options={{headerShown: false}} />

        <Stack.Screen name="send-failed-tx" component={FailedTxScreen} options={{headerShown: false}} />
      </Stack.Navigator>

      <ModalInfo hideModalInfo={hideModalInfo} visible={modalInfoState}>
        <Text style={styles.receiveInfoText}>{strings.receiveInfoText}</Text>
      </ModalInfo>
    </SendProvider>
  )
}

const SendEditAmountBackButton = () => {
  const navigateTo = useNavigateTo()
  return (
    <TouchableOpacity onPress={() => navigateTo.selectedTokens()}>
      <Icon.Chevron direction="left" color="#000000" />
    </TouchableOpacity>
  )
}

const messages = defineMessages({
  receiveTitle: {
    id: 'components.receive.receivescreen.title',
    defaultMessage: '!!!Receive',
  },
  sendTitle: {
    id: 'components.send.sendscreen.title',
    defaultMessage: '!!!Send',
  },
  qrScannerTitle: {
    id: 'components.send.addressreaderqr.title',
    defaultMessage: '!!!Scan QR code address',
  },
  selectAssetTitle: {
    id: 'components.send.selectasset.title',
    defaultMessage: '!!!Select asset',
  },
  listAmountsToSendTitle: {
    id: 'components.send.listamountstosendscreen.title',
    defaultMessage: '!!!Selected tokens',
  },
  editAmountTitle: {
    id: 'components.send.editamountscreen.title',
    defaultMessage: '!!!Edit amount',
  },
  confirmTitle: {
    id: 'components.send.confirmscreen.title',
    defaultMessage: '!!!Confirm',
  },
  receiveInfoText: {
    id: 'components.receive.receivescreen.infoText',
    defaultMessage:
      '!!!Share this address to receive payments. ' +
      'To protect your privacy, new addresses are ' +
      'generated automatically once you use them.',
  },
})

const useStrings = () => {
  const intl = useIntl()

  return {
    receiveTitle: intl.formatMessage(messages.receiveTitle),
    sendTitle: intl.formatMessage(messages.sendTitle),
    qrScannerTitle: intl.formatMessage(messages.qrScannerTitle),
    selectAssetTitle: intl.formatMessage(messages.selectAssetTitle),
    confirmTitle: intl.formatMessage(messages.confirmTitle),
    receiveInfoText: intl.formatMessage(messages.receiveInfoText),
    editAmountTitle: intl.formatMessage(messages.editAmountTitle),
    listAmountsToSendTitle: intl.formatMessage(messages.listAmountsToSendTitle),
  }
}

const ModalInfoIconButton = (props: TouchableOpacityProps) => {
  return (
    <TouchableOpacity {...props}>
      <Icon.Info size={25} color={COLORS.ACTION_GRAY} />
    </TouchableOpacity>
  )
}

const SettingsIconButton = (props: TouchableOpacityProps) => {
  return (
    <TouchableOpacity {...props}>
      <Icon.Settings size={30} color={COLORS.ACTION_GRAY} />
    </TouchableOpacity>
  )
}

const HeaderRightHistory = () => {
  const {navigateToSettings} = useWalletNavigation()

  return <SettingsIconButton style={styles.settingIconButton} onPress={() => navigateToSettings()} />
}

const styles = StyleSheet.create({
  receiveInfoText: {
    lineHeight: 24,
    fontSize: 16,
  },
  settingIconButton: {
    width: 40,
  },
})

const sendOptions = {
  ...defaultStackNavigationOptionsV2,
  headerStyle: {
    elevation: 0,
    shadowOpacity: 0,
    backgroundColor: '#fff',
  },
}
