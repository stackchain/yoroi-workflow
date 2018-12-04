// @flow

import React from 'react'
import {compose} from 'redux'
import {connect} from 'react-redux'
import {withStateHandlers, withHandlers} from 'recompose'
import {View, KeyboardAvoidingView, Platform} from 'react-native'
import {SafeAreaView} from 'react-navigation'
import _ from 'lodash'

import {Button, ValidatedTextInput} from '../UiKit'
import {walletNameSelector, walletNamesSelector} from '../../selectors'
import {changeWalletName, showErrorDialog} from '../../actions'
import {withNavigationTitle} from '../../utils/renderUtils'
import {getWalletNameError, validateWalletName} from '../../utils/validators'

import styles from './styles/ChangeWalletName.style'

import type {SubTranslation} from '../../l10n/typeHelpers'
import type {WalletNameValidationErrors} from '../../utils/validators'
import type {ComponentType} from 'react'
import type {Navigation} from '../../types/navigation'

const getTranslations = (state) => state.trans.ChangeWalletNameScreen

type Props = {
  walletName: string,
  setWalletName: (string) => any,
  changeAndNavigate: () => any,
  translations: SubTranslation<typeof getTranslations>,
  validateWalletName: () => WalletNameValidationErrors,
}

const ChangeWalletName = ({
  walletName,
  setWalletName,
  changeAndNavigate,
  translations,
  validateWalletName,
}: Props) => {
  const validationErrors = validateWalletName()

  return (
    <KeyboardAvoidingView
      enabled={Platform.OS === 'ios'}
      behavior="padding"
      style={styles.keyboardAvoidingView}
    >
      <SafeAreaView style={styles.safeAreaView}>
        <View style={styles.content}>
          <ValidatedTextInput
            label={translations.walletNameInput.label}
            value={walletName}
            onChangeText={setWalletName}
            error={getWalletNameError(
              translations.walletNameInput.errors,
              validationErrors,
            )}
          />
        </View>
        <View style={styles.action}>
          <Button
            onPress={changeAndNavigate}
            title={translations.changeButton}
            disabled={!_.isEmpty(validationErrors)}
          />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

export default (compose(
  connect(
    (state) => ({
      translations: getTranslations(state),
      oldName: walletNameSelector(state),
      walletNames: walletNamesSelector(state),
    }),
    {changeWalletName},
  ),
  withNavigationTitle(({translations}) => translations.title),
  withStateHandlers(
    ({oldName}) => ({
      walletName: oldName,
    }),
    {
      setWalletName: (state) => (value) => ({walletName: value}),
    },
  ),
  withHandlers({
    validateWalletName: ({walletName, oldName, walletNames}) => () =>
      validateWalletName(walletName, oldName, walletNames),
  }),
  withHandlers({
    changeAndNavigate: ({
      navigation,
      walletName,
      changeWalletName,
      translations,
      validateWalletName,
    }) => async () => {
      if (!_.isEmpty(validateWalletName())) return

      try {
        await changeWalletName(walletName)
        navigation.goBack()
      } catch (e) {
        await showErrorDialog((dialogs) => dialogs.general)
      }
    },
  }),
)(ChangeWalletName): ComponentType<{|navigation: Navigation|}>)
