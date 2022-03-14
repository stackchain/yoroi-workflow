/* eslint-disable @typescript-eslint/no-explicit-any */
import {useNavigation} from '@react-navigation/native'
import {CommonActions} from '@react-navigation/routers'
import {BigNumber} from 'bignumber.js'
import React, {useEffect, useState} from 'react'
import {useIntl} from 'react-intl'
import {defineMessages} from 'react-intl'
import {ScrollView, StyleSheet, View, ViewProps} from 'react-native'
import {useSelector} from 'react-redux'

import {CONFIG, UI_V2} from '../../../legacy/config/config'
import {MultiToken} from '../../../legacy/crypto/MultiToken'
import type {CreateDelegationTxResponse} from '../../../legacy/crypto/shelley/delegationUtils'
import type {CreateUnsignedTxResponse} from '../../../legacy/crypto/shelley/transactionUtils'
import globalMessages, {txLabels} from '../../../legacy/i18n/global-messages'
import {useParams} from '../../../legacy/navigation'
import {SEND_ROUTES, STAKING_CENTER_ROUTES, STAKING_DASHBOARD_ROUTES, WALLET_ROUTES} from '../../../legacy/RoutesList'
import {defaultNetworkAssetSelector} from '../../../legacy/selectors'
import {COLORS} from '../../../legacy/styles/config'
import {formatTokenAmount, formatTokenWithText} from '../../../legacy/utils/format'
import {OfflineBanner, Text, ValidatedTextInput} from '../../components'
import {ConfirmTx} from '../../components/ConfirmTx'
import {Instructions as HWInstructions} from '../../HW'
import {useSelectedWallet} from '../../SelectedWallet'
import {DefaultAsset} from '../../types'

export type Params = {
  poolHash: string
  poolName: string
  transactionData: CreateDelegationTxResponse
}

const isParams = (params?: Params | object | undefined): params is Params => {
  return (
    !!params &&
    'transactionData' in params &&
    typeof params.transactionData === 'object' &&
    'poolHash' in params &&
    typeof params.poolHash === 'string' &&
    'poolName' in params &&
    typeof params.poolHash === 'string'
  )
}

export const DelegationConfirmation = ({mockDefaultAsset}: {mockDefaultAsset?: DefaultAsset}) => {
  const navigation = useNavigation()
  const wallet = useSelectedWallet()
  const {isHW, isEasyConfirmationEnabled} = wallet
  const defaultNetworkAsset = useSelector(defaultNetworkAssetSelector)
  const defaultAsset = mockDefaultAsset || defaultNetworkAsset
  const {poolHash, poolName, transactionData: delegationTxData} = useParams<Params>(isParams)
  const [transactionFee, setTransactionFee] = useState<MultiToken>()
  const strings = useStrings()
  const [password, setPassword] = useState(CONFIG.DEBUG.PREFILL_FORMS ? CONFIG.DEBUG.PASSWORD : '')
  const [useUSB, setUseUSB] = useState(false)

  const signRequest: CreateUnsignedTxResponse = delegationTxData.signRequest
  const amountToDelegate: MultiToken = delegationTxData.totalAmountToDelegate
  const reward = approximateReward(amountToDelegate.getDefault())

  useEffect(() => {
    void (async () => {
      setTransactionFee(await delegationTxData.signRequest.fee())
    })()
  }, [delegationTxData])

  const onSuccess = () => {
    navigation.dispatch(
      CommonActions.reset({
        key: null as any,
        index: 0,
        routes: [{name: STAKING_CENTER_ROUTES.MAIN}],
      }),
    )
    if (UI_V2) {
      navigation.dispatch(
        CommonActions.reset({
          key: null as any,
          index: 0,
          routes: [{name: STAKING_DASHBOARD_ROUTES.MAIN}],
        }),
      )
    }
    navigation.navigate(WALLET_ROUTES.TX_HISTORY)
  }

  return (
    <View style={styles.container}>
      <OfflineBanner />

      <ScrollView style={styles.scrollView}>
        <View style={styles.itemBlock}>
          <Text style={styles.itemTitle}>{strings.stakePoolName}</Text>
          <Text>{poolName}</Text>
        </View>

        <View style={styles.itemBlock}>
          <Text style={styles.itemTitle}>{strings.stakePoolHash}</Text>
          <Text>{poolHash}</Text>
        </View>

        <View style={styles.input}>
          <Text small style={styles.fees}>
            {`+ ${transactionFee ? formatTokenAmount(transactionFee.getDefault(), defaultAsset) : ''} ${
              strings.ofFees
            }`}
          </Text>

          {/* requires a handler so we pass on a dummy function */}
          <ValidatedTextInput
            onChangeText={() => undefined}
            editable={false}
            value={formatTokenAmount(amountToDelegate.getDefault(), defaultAsset)}
            label={strings.amount}
          />
        </View>

        {!isEasyConfirmationEnabled && !isHW && (
          <View style={styles.input}>
            <ValidatedTextInput secureTextEntry value={password} label={strings.password} onChangeText={setPassword} />
          </View>
        )}

        <View style={styles.itemBlock}>
          <Text style={styles.itemTitle}>{strings.rewardsExplanation}</Text>
          <Text style={styles.rewards}>{formatTokenWithText(reward, defaultAsset)}</Text>
        </View>

        {isHW && <HWInstructions useUSB={useUSB} addMargin />}
      </ScrollView>

      <Actions>
        <ConfirmTx
          process="signAndSubmit"
          buttonProps={{
            shelleyTheme: true,
            title: strings.delegateButtonLabel,
          }}
          isProvidingPassword
          providedPassword={password}
          onSuccess={onSuccess}
          setUseUSB={setUseUSB}
          useUSB={useUSB}
          txDataSignRequest={signRequest}
          biometricRoute={SEND_ROUTES.BIOMETRICS_SIGNING}
        />
      </Actions>
    </View>
  )
}

const Actions = (props: ViewProps) => <View {...props} style={{padding: 16}} />

const useStrings = () => {
  const intl = useIntl()

  return {
    stakePoolName: intl.formatMessage(globalMessages.stakePoolName),
    stakePoolHash: intl.formatMessage(globalMessages.stakePoolHash),
    ofFees: intl.formatMessage(messages.ofFees),
    amount: intl.formatMessage(txLabels.amount),
    password: intl.formatMessage(txLabels.password),
    rewardsExplanation: intl.formatMessage(messages.rewardsExplanation),
    delegateButtonLabel: intl.formatMessage(messages.delegateButtonLabel),
  }
}

const messages = defineMessages({
  delegateButtonLabel: {
    id: 'components.stakingcenter.confirmDelegation.delegateButtonLabel',
    defaultMessage: '!!!Delegate',
  },
  ofFees: {
    id: 'components.stakingcenter.confirmDelegation.ofFees',
    defaultMessage: '!!!of fees',
  },
  rewardsExplanation: {
    id: 'components.stakingcenter.confirmDelegation.rewardsExplanation',
    defaultMessage: '!!!Current approximation of rewards that you will receive per epoch:',
  },
})

/**
 * returns approximate rewards per epoch in lovelaces
 * TODO: based on https://staking.cardano.org/en/calculator/
 *  needs to be update per-network
 */
const approximateReward = (amount: BigNumber): BigNumber => {
  return amount
    .times(CONFIG.NETWORKS.HASKELL_SHELLEY.PER_EPOCH_PERCENTAGE_REWARD)
    .div(CONFIG.NUMBERS.EPOCH_REWARD_DENOMINATOR)
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flex: 1,
  },
  itemBlock: {
    marginTop: 24,
  },
  itemTitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#353535',
  },
  input: {
    marginTop: 16,
  },
  rewards: {
    marginTop: 5,
    fontSize: 16,
    lineHeight: 19,
    color: COLORS.SHELLEY_BLUE,
    fontWeight: '500',
  },
  fees: {
    textAlign: 'right',
    color: '#353535',
  },
})