import {useNavigation} from '@react-navigation/native'
import React from 'react'
import {defineMessages, useIntl} from 'react-intl'
import {StyleSheet, View, ViewProps} from 'react-native'
import {SafeAreaView} from 'react-native-safe-area-context'

import {Button, LanguagePicker} from '../../components'
import {FIRST_RUN_ROUTES} from '../../legacy/RoutesList'

export const LanguagePickerScreen = () => {
  const navigation = useNavigation()
  const intl = useIntl()

  return (
    <SafeAreaView style={styles.safeAreaView}>
      <LanguagePicker />

      <Actions>
        <Button
          onPress={() => navigation.navigate(FIRST_RUN_ROUTES.ACCEPT_TERMS_OF_SERVICE)}
          title={intl.formatMessage(messages.continueButton)}
          testID="chooseLangButton"
        />
      </Actions>
    </SafeAreaView>
  )
}

const Actions: React.FC = (props: ViewProps) => <View {...props} style={{padding: 16}} />

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
    backgroundColor: '#fff',
  },
})

const messages = defineMessages({
  continueButton: {
    id: 'components.common.languagepicker.continueButton',
    defaultMessage: '!!!Choose language',
  },
})
