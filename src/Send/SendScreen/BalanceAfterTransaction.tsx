import {BigNumber} from 'bignumber.js'
import React from 'react'
import {StyleSheet} from 'react-native'
import {useSelector} from 'react-redux'

import {Text} from '../../../legacy/components/UiKit'
import {tokenBalanceSelector} from '../../../legacy/selectors'
import {formatTokenWithSymbol} from '../../../legacy/utils/format'
import {useTokenInfo} from '../../hooks'
import {useStrings} from './strings'

export const BalanceAfterTransaction = ({balanceAfter}: {balanceAfter: BigNumber | null}) => {
  const strings = useStrings()
  const tokenBalance = useSelector(tokenBalanceSelector)
  const tokenInfo = useTokenInfo(tokenBalance.getDefaultId())

  const value = balanceAfter ? formatTokenWithSymbol(balanceAfter, tokenInfo) : strings.balanceAfterNotAvailable

  return (
    <Text style={styles.info}>
      {strings.balanceAfterLabel}
      {': '}
      {value}
    </Text>
  )
}

const styles = StyleSheet.create({
  info: {
    fontSize: 14,
    lineHeight: 22,
  },
})
