// @flow
import React from 'react'
import {Button} from '../UiKit'
import {createStackNavigator} from 'react-navigation'
import TxHistory from './TxHistory'
import TxDetails from './TxDetails'
import {TX_HISTORY_ROUTES, WALLET_ROUTES} from '../../RoutesList'
import SettingsScreenNavigator from '../Settings/SettingsScreenNavigator'
import utfSymbols from '../../utils/utfSymbols'

import {defaultNavigationOptions} from '../../navigationOptions'

const TxHistoryNavigator = createStackNavigator(
  {
    [TX_HISTORY_ROUTES.MAIN]: {
      screen: TxHistory,
      navigationOptions: ({navigation}) => ({
        title: navigation.getParam('title'),
        headerRight: (
          <Button
            onPress={() => navigation.navigate(WALLET_ROUTES.SETTINGS)}
            title={utfSymbols.GEAR}
          />
        ),
        ...defaultNavigationOptions,
      }),
    },
    [TX_HISTORY_ROUTES.TX_DETAIL]: {
      screen: TxDetails,
      navigationOptions: ({navigation}) => ({
        title: navigation.getParam('title'),
        ...defaultNavigationOptions,
      }),
    },
    [WALLET_ROUTES.SETTINGS]: {
      screen: SettingsScreenNavigator,
      navigationOptions: {
        header: null,
        ...defaultNavigationOptions,
      },
    },
  },
  {
    initialRouteName: TX_HISTORY_ROUTES.MAIN,
  },
)

export default TxHistoryNavigator
