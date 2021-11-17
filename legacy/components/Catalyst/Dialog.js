// @flow

/**
 * Step 5 for the Catalyst registration
 * Ask password used for signing transaction or sign with HW wallet
 * submit the transaction
 */

import React from 'react'
import {useIntl} from 'react-intl'

import type {DeviceId, DeviceObj} from '../../crypto/shelley/ledgerUtils'
import globalMessages, {ledgerMessages, txLabels} from '../../i18n/global-messages'
import {ErrorView} from '../Common/ErrorModal'
import LedgerConnect from '../Ledger/LedgerConnect'
import {LedgerTransportSwitch} from '../Ledger/LedgerTransportSwitchModal'
import {Modal} from '../UiKit'
import {PleaseWaitView} from '../UiKit/PleaseWaitModal'

type ErrorData = {|
  errorMessage: string,
  errorLogs: ?string,
|}

export const DIALOG_STEPS = {
  CLOSED: 'CLOSED',
  CHOOSE_TRANSPORT: 'CHOOSE_TRANSPORT',
  LEDGER_CONNECT: 'LEDGER_CONNECT',
  ERROR: 'ERROR',
  SUBMITTING: 'SUBMITTING',
  WAITING_HW_RESPONSE: 'WAITING_HW_RESPONSE',
}
export type DialogStep = $Values<typeof DIALOG_STEPS>

type DialogProps = {
  +step: DialogStep,
  +onRequestClose: () => void,
  +onChooseTransport: (Object, boolean) => mixed,
  +onConnectBLE: (DeviceId) => mixed,
  +onConnectUSB: (DeviceObj) => mixed,
  +useUSB: boolean,
  +errorData: ErrorData,
}
const Dialog = ({
  step,
  onRequestClose,
  onChooseTransport,
  onConnectBLE,
  onConnectUSB,
  useUSB,
  errorData,
}: DialogProps) => {
  const strings = useStrings()
  const getBody = () => {
    switch (step) {
      case DIALOG_STEPS.CLOSED:
        return null
      case DIALOG_STEPS.CHOOSE_TRANSPORT:
        return (
          <LedgerTransportSwitch
            onSelectUSB={(event) => onChooseTransport(event, true)}
            onSelectBLE={(event) => onChooseTransport(event, false)}
          />
        )
      case DIALOG_STEPS.LEDGER_CONNECT:
        return <LedgerConnect onConnectBLE={onConnectBLE} onConnectUSB={onConnectUSB} useUSB={useUSB} />
      case DIALOG_STEPS.WAITING_HW_RESPONSE:
        return <PleaseWaitView title={''} spinnerText={strings.followSteps} />
      case DIALOG_STEPS.SUBMITTING:
        return <PleaseWaitView title={strings.submittingTx} spinnerText={strings.pleaseWait} />
      case DIALOG_STEPS.ERROR:
        return (
          <ErrorView errorMessage={errorData.errorMessage} errorLogs={errorData.errorLogs} onDismiss={onRequestClose} />
        )
      default:
        return null
    }
  }
  return (
    <Modal
      visible={step !== DIALOG_STEPS.CLOSED}
      onRequestClose={onRequestClose}
      showCloseIcon={step !== DIALOG_STEPS.WAITING_HW_RESPONSE && step !== DIALOG_STEPS.SUBMITTING}
    >
      {getBody()}
    </Modal>
  )
}

export default Dialog

const useStrings = () => {
  const intl = useIntl()

  return {
    followSteps: intl.formatMessage(ledgerMessages.followSteps),
    submittingTx: intl.formatMessage(txLabels.submittingTx),
    pleaseWait: intl.formatMessage(globalMessages.pleaseWait),
  }
}