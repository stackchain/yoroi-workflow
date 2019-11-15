// @flow

import React from 'react'
import {compose} from 'redux'
import {withHandlers} from 'recompose'
import {View, TouchableOpacity} from 'react-native'
import {injectIntl, defineMessages, intlShape} from 'react-intl'
import Markdown from 'react-native-easy-markdown'
import {withNavigation} from 'react-navigation'
import {BigNumber} from 'bignumber.js'

import type {Navigation} from '../../../types/navigation'
import {Text, Button, Modal} from '../../UiKit'
import {formatAdaWithText} from '../../../utils/format'

import styles from './styles/BalanceCheckModal.style'

import type {ComponentType} from 'react'

const messages = defineMessages({
  recoveryTitle: {
    id: 'components.walletinit.balancecheck.balancecheckmodal.recoveryTitle',
    defaultMessage: '!!!Recovery Successful',
  },
  attention: {
    id: 'components.walletinit.balancecheck.balancecheckmodal.attention',
    defaultMessage: '!!!Attention',
  },
  attentionDescription: {
    id:
      'components.walletinit.balancecheck.balancecheckmodal.attentionDescription',
    defaultMessage:
      '!!!The balance check executed successfully, and we were ' +
      'able to match your wallet with the balance displayed below. Remember that ' +
      'the balance displayed should only match the one that you **had on ' +
      'November 12th**.',
  },
  walletAddressesLabel: {
    id:
      'components.walletinit.balancecheck.balancecheckmodal.walletAddressesLabel',
    defaultMessage: '!!!Wallet addresses',
  },
  recoveredBalanceLabel: {
    id:
      'components.walletinit.balancecheck.balancecheckmodal.recoveredBalanceLabel',
    defaultMessage: '!!!Recovered balance',
  },
  buttonText: {
    id: 'components.walletinit.balancecheck.balancecheckmodal.buttonText',
    defaultMessage: '!!!Done',
  },
})

const AddressEntry = ({address}) => {
  return (
    <TouchableOpacity activeOpacity={0.5}>
      <Text secondary>{address}</Text>
    </TouchableOpacity>
  )
}

type Props = {
  intl: any,
  visible: boolean,
  addresses: Array<string>,
  balance: BigNumber,
  onRequestClose: () => any,
  buttonHandler: () => any,
}

class BalanceCheckModal extends React.Component<Props> {
  render() {
    const {
      intl,
      visible,
      addresses,
      balance,
      buttonHandler,
      onRequestClose,
    } = this.props

    return (
      <Modal visible={visible} onRequestClose={onRequestClose} showCloseIcon>
        <View style={styles.content}>
          <Text style={styles.title} small>
            {intl.formatMessage(messages.recoveryTitle)}
          </Text>

          <View style={styles.item}>
            <Text style={styles.heading} small>
              {intl.formatMessage(messages.attention)}
            </Text>
            <Markdown>
              {intl.formatMessage(messages.attentionDescription)}
            </Markdown>
          </View>

          <View style={styles.item}>
            <Text style={styles.heading} small>
              {intl.formatMessage(messages.walletAddressesLabel)}
            </Text>
            {addresses.map((address, i) => (
              <AddressEntry key={i} address={address} />
            ))}
          </View>

          <View style={styles.item}>
            <Text style={styles.heading} small>
              {intl.formatMessage(messages.recoveredBalanceLabel)}
            </Text>
            <Text style={styles.balanceAmount}>
              {balance && formatAdaWithText(balance)}
            </Text>
          </View>
        </View>

        <Button
          onPress={buttonHandler}
          title={intl.formatMessage(messages.buttonText)}
          shelleyTheme
        />
      </Modal>
    )
  }
}

type ExternalProps = {
  visible: boolean,
  addresses: Array<string>,
  balance: BigNumber,
  onRequestClose: () => any,
  intl: intlShape,
  navigation: Navigation,
}

export default injectIntl(
  (compose(
    withNavigation,
    withHandlers({
      buttonHandler: ({navigation}) => (event) => navigation.popToTop(),
    }),
  )(BalanceCheckModal): ComponentType<ExternalProps>),
)
