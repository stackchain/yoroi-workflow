// @flow

import React from 'react'
import {connect} from 'react-redux'
import {compose} from 'redux'
import {withHandlers, withStateHandlers} from 'recompose'
import {View} from 'react-native'
import {NavigationEvents} from 'react-navigation'

import {withNavigationTitle} from '../../utils/renderUtils'
import walletManager from '../../crypto/wallet'
import {Text, Button, ValidatedTextInput} from '../UiKit'
import {setEasyConfirmation, showErrorDialog} from '../../actions'
import {easyConfirmationSelector} from '../../selectors'
import {WrongPassword} from '../../crypto/errors'

import styles from './styles/ToggleEasyConfirmationScreen.style'

const getTranslations = (state) => state.trans.EasyConfirmationScreen

const enableEasyConfirmation = ({
  navigation,
  masterPassword,
  setEasyConfirmation,
}) => async () => {
  try {
    await walletManager.enableEasyConfirmation(masterPassword)
    setEasyConfirmation(true)

    navigation.goBack()
  } catch (error) {
    if (error instanceof WrongPassword) {
      await showErrorDialog((dialogs) => dialogs.incorrectPassword)
    } else {
      await showErrorDialog((dialogs) => dialogs.general)
    }
  }
}

const disableEasyConfirmation = ({navigation}) => async () => {
  try {
    await walletManager.disableEasyConfirmation()
    setEasyConfirmation(false)
    navigation.goBack()
  } catch (error) {
    await showErrorDialog((dialogs) => dialogs.general)
  }
}

const ToggleEasyConfirmationScreen = ({
  translations,
  isEasyConfirmationEnabled,
  enableEasyConfirmation,
  disableEasyConfirmation,
  clearPassword,
  setMasterPassword,
  masterPassword,
}) => (
  <View style={styles.root}>
    <NavigationEvents onDidBlur={clearPassword} />

    {!isEasyConfirmationEnabled ? (
      <View style={styles.main}>
        <Text style={styles.heading}>
          {translations.enableLessSecureOption}
        </Text>

        <ValidatedTextInput
          secureTextEntry
          label={translations.masterPassword}
          onChangeText={setMasterPassword}
          value={masterPassword}
        />
      </View>
    ) : (
      <View style={[styles.main, styles.mainCentered]}>
        <Text style={styles.heading}>{translations.disableThisOption}</Text>
      </View>
    )}

    <Button
      title={
        isEasyConfirmationEnabled
          ? translations.disableButton
          : translations.enableButton
      }
      onPress={
        isEasyConfirmationEnabled
          ? disableEasyConfirmation
          : enableEasyConfirmation
      }
      disabled={!masterPassword && !isEasyConfirmationEnabled}
    />
  </View>
)

export default compose(
  connect(
    (state) => ({
      translations: getTranslations(state),
      isEasyConfirmationEnabled: easyConfirmationSelector(state),
    }),
    {setEasyConfirmation},
  ),
  withStateHandlers(
    {masterPassword: ''},
    {
      setMasterPassword: () => (masterPassword) => ({masterPassword}),
      clearPassword: () => () => ({masterPassword: ''}),
    },
  ),
  withHandlers({
    enableEasyConfirmation,
    disableEasyConfirmation,
  }),
  withNavigationTitle(({translations}) => translations.title),
)(ToggleEasyConfirmationScreen)
