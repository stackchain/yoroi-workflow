// @flow

// Handles interfacing w/ cardano-serialization-lib to create transaction

import {BigNumber} from 'bignumber.js'
/* eslint-disable camelcase */
import {
  BigNum,
  Bip32PrivateKey,
  BootstrapWitnesses,
  ByronAddress,
  LinearFee,
  hash_transaction,
  make_icarus_bootstrap_witness,
  make_vkey_witness,
  Transaction,
  TransactionBody,
  TransactionBuilder,
  TransactionHash,
  TransactionInput,
  TransactionMetadata,
  TransactionOutput,
  TransactionWitnessSet,
  Vkeywitnesses,
} from 'react-native-haskell-shelley'
/* eslint-enable camelcase */
import {CONFIG} from '../../config/config'
import {InsufficientFunds} from '../errors'
import {getCardanoAddrKeyHash, normalizeToAddress} from './utils'

import type {
  Address,
  Addressing,
  BaseSignRequest,
  V4UnsignedTxUtxoResponse,
  V4UnsignedTxAddressedUtxoResponse,
  AddressedUtxo,
} from '../types'
import type {RawUtxo} from '../../api/types'

/**
 * based off what the cardano-wallet team found worked empirically
 * note: slots are 1 second in Shelley mainnet, so this is 2 minutes
 */
const defaultTtlOffset = 7200

export const sendAllUnsignedTxFromUtxo = async (
  receiver: string,
  allUtxos: Array<RawUtxo>,
  absSlotNumber: BigNumber,
  protocolParams: {|
    linearFee: LinearFee,
    minimumUtxoVal: BigNum,
    poolDeposit: BigNum,
    keyDeposit: BigNum,
  |},
): Promise<V4UnsignedTxUtxoResponse> => {
  const totalBalance = allUtxos
    .map((utxo) => new BigNumber(utxo.amount))
    .reduce((acc, amount) => acc.plus(amount), new BigNumber(0))
  if (totalBalance.isZero()) {
    throw new InsufficientFunds()
  }

  const txBuilder = await TransactionBuilder.new(
    protocolParams.linearFee,
    protocolParams.minimumUtxoVal,
    protocolParams.poolDeposit,
    protocolParams.keyDeposit,
  )
  await txBuilder.set_ttl(absSlotNumber.plus(defaultTtlOffset).toNumber())
  for (const input of allUtxos) {
    await addUtxoInput(txBuilder, input)
  }

  if (totalBalance.lt(await (await txBuilder.estimate_fee()).to_str())) {
    // not enough in inputs to even cover the cost of including themselves in a tx
    throw new InsufficientFunds()
  }
  {
    const wasmReceiver = await normalizeToAddress(receiver)
    if (wasmReceiver == null) {
      throw new Error(
        'sendAllUnsignedTxFromUtxo receiver not a valid Shelley address',
      )
    }

    // semantically, sending all ADA to somebody
    // is the same as if you're sending all the ADA as change to yourself
    // (module the fact the address doesn't belong to you)
    const couldSendAmount = await txBuilder.add_change_if_needed(wasmReceiver)
    if (!couldSendAmount) {
      // if you couldn't send any amount,
      // it's because you couldn't cover the fee of adding an output
      throw new InsufficientFunds()
    }
  }

  return {
    senderUtxos: allUtxos,
    txBuilder,
    changeAddr: [], // no change for sendAll
  }
}

export const sendAllUnsignedTx = async (
  receiver: string,
  allUtxos: Array<AddressedUtxo>,
  absSlotNumber: BigNumber,
  protocolParams: {|
    linearFee: LinearFee,
    minimumUtxoVal: BigNum,
    poolDeposit: BigNum,
    keyDeposit: BigNum,
  |},
): Promise<V4UnsignedTxAddressedUtxoResponse> => {
  const addressingMap = new Map<RawUtxo, AddressedUtxo>()
  for (const utxo of allUtxos) {
    addressingMap.set(
      {
        amount: utxo.amount,
        receiver: utxo.receiver,
        tx_hash: utxo.tx_hash,
        tx_index: utxo.tx_index,
        utxo_id: utxo.utxo_id,
      },
      utxo,
    )
  }
  const unsignedTxResponse = await sendAllUnsignedTxFromUtxo(
    receiver,
    Array.from(addressingMap.keys()),
    absSlotNumber,
    protocolParams,
  )

  const addressedUtxos = unsignedTxResponse.senderUtxos.map((utxo) => {
    const addressedUtxo = addressingMap.get(utxo)
    if (addressedUtxo == null) {
      throw new Error(
        'sendAllUnsignedTx:: utxo reference was changed. Should not happen',
      )
    }
    return addressedUtxo
  })

  return {
    senderUtxos: addressedUtxos,
    txBuilder: unsignedTxResponse.txBuilder,
    changeAddr: unsignedTxResponse.changeAddr,
  }
}

async function addUtxoInput(
  txBuilder: TransactionBuilder,
  input: RawUtxo,
): Promise<void> {
  const wasmInput = await normalizeToAddress(input.receiver)
  if (wasmInput == null) {
    throw new Error('addUtxoInput:: input not a valid Shelley address')
  }
  const keyHash = await getCardanoAddrKeyHash(wasmInput)
  if (keyHash === null) {
    const byronAddr = await ByronAddress.from_address(wasmInput)
    if (byronAddr == null) {
      throw new Error(
        'addUtxoInput:: should never happen: non-byron address without key hash',
      )
    }
    await txBuilder.add_bootstrap_input(
      byronAddr,
      await utxoToTxInput(input),
      await BigNum.from_str(input.amount),
    )
    return
  }
  if (keyHash === undefined) {
    throw new Error('addUtxoInput:: script inputs not expected')
  }
  await txBuilder.add_key_input(
    keyHash,
    await utxoToTxInput(input),
    await BigNum.from_str(input.amount),
  )
}

/**
 * This function operates on UTXOs without a way to generate the private key for them
 * Private key needs to be added afterwards either through
 * A) Addressing
 * B) Having the key provided externally
 */
export const newAdaUnsignedTxFromUtxo = async (
  receiver: string,
  amount: string,
  changeAdaAddr: void | {|...Address, ...Addressing|},
  utxos: Array<RawUtxo>,
  absSlotNumber: BigNumber,
  protocolParams: {|
    linearFee: LinearFee,
    minimumUtxoVal: BigNum,
    poolDeposit: BigNum,
    keyDeposit: BigNum,
  |},
): Promise<V4UnsignedTxUtxoResponse> => {
  const wasmReceiver = await normalizeToAddress(receiver)
  if (wasmReceiver == null) {
    throw new Error(
      'newAdaUnsignedTxFromUtxo:: receiver not a valid Shelley address',
    )
  }

  const txBuilder = await TransactionBuilder.new(
    protocolParams.linearFee,
    protocolParams.minimumUtxoVal,
    protocolParams.poolDeposit,
    protocolParams.keyDeposit,
  )
  await txBuilder.set_ttl(absSlotNumber.plus(defaultTtlOffset).toNumber())
  await txBuilder.add_output(
    await TransactionOutput.new(wasmReceiver, await BigNum.from_str(amount)),
  )

  let currentInputSum = new BigNumber(0)
  const usedUtxos: Array<RawUtxo> = []
  // add utxos until we have enough to send the transaction
  for (const utxo of utxos) {
    usedUtxos.push(utxo)
    currentInputSum = currentInputSum.plus(utxo.amount)
    await addUtxoInput(txBuilder, utxo)
    const output = new BigNumber(
      await (await (await txBuilder.get_explicit_output()).checked_add(
        await txBuilder.estimate_fee(),
      )).to_str(),
    )

    if (currentInputSum.gte(output)) {
      break
    }
  }
  // check to see if we have enough balance in the wallet to cover the transaction
  {
    const output = new BigNumber(
      await (await (await txBuilder.get_explicit_output()).checked_add(
        await txBuilder.estimate_fee(),
      )).to_str(),
    )
    if (currentInputSum.lt(output)) {
      throw new InsufficientFunds()
    }
  }

  const changeAddr = await (async () => {
    if (changeAdaAddr == null) {
      await txBuilder.set_fee(await txBuilder.estimate_fee())
      return []
    }
    const oldOutput = await txBuilder.get_explicit_output()

    const wasmChange = await normalizeToAddress(changeAdaAddr.address)
    if (wasmChange == null) {
      throw new Error(
        'newAdaUnsignedTxFromUtxo:: change not a valid Shelley address',
      )
    }
    const changeWasAdded = await txBuilder.add_change_if_needed(wasmChange)
    const changeValue = new BigNumber(
      await (await (await txBuilder.get_explicit_output()).checked_sub(
        oldOutput,
      )).to_str(),
    )
    // prettier-ignore
    return changeWasAdded
      ? [{
        ...changeAdaAddr,
        value: changeValue,
      }]
      : []
  })()

  return {
    senderUtxos: usedUtxos,
    txBuilder,
    changeAddr,
  }
}

/**
 * we use all UTXOs as possible inputs for selection
 */
export const newAdaUnsignedTx = async (
  receiver: string,
  amount: string,
  changeAdaAddr: void | {|...Address, ...Addressing|},
  allUtxos: Array<AddressedUtxo>,
  absSlotNumber: BigNumber,
  protocolParams: {|
    linearFee: LinearFee,
    minimumUtxoVal: BigNum,
    poolDeposit: BigNum,
    keyDeposit: BigNum,
  |},
): Promise<V4UnsignedTxAddressedUtxoResponse> => {
  const addressingMap = new Map<RawUtxo, AddressedUtxo>()
  for (const utxo of allUtxos) {
    addressingMap.set(
      {
        amount: utxo.amount,
        receiver: utxo.receiver,
        tx_hash: utxo.tx_hash,
        tx_index: utxo.tx_index,
        utxo_id: utxo.utxo_id,
      },
      utxo,
    )
  }
  const unsignedTxResponse = await newAdaUnsignedTxFromUtxo(
    receiver,
    amount,
    changeAdaAddr,
    Array.from(addressingMap.keys()),
    absSlotNumber,
    protocolParams,
  )

  const addressedUtxos = unsignedTxResponse.senderUtxos.map((utxo) => {
    const addressedUtxo = addressingMap.get(utxo)
    if (addressedUtxo == null) {
      throw new Error(
        'newAdaUnsignedTx utxo reference was changed. Should not happen',
      )
    }
    return addressedUtxo
  })

  return {
    senderUtxos: addressedUtxos,
    txBuilder: unsignedTxResponse.txBuilder,
    changeAddr: unsignedTxResponse.changeAddr,
  }
}

export const signTransaction = async (
  signRequest:
    | BaseSignRequest<TransactionBuilder>
    | BaseSignRequest<TransactionBody>,
  keyLevel: number,
  signingKey: Bip32PrivateKey,
  metadata: void | TransactionMetadata,
): Promise<Transaction> => {
  const seenByronKeys: Set<string> = new Set()
  const seenKeyHashes: Set<string> = new Set()
  const deduped: Array<AddressedUtxo> = []
  for (const senderUtxo of signRequest.senderUtxos) {
    const wasmAddr = await normalizeToAddress(senderUtxo.receiver)
    if (wasmAddr == null) {
      throw new Error('signTransaction:: utxo not a valid Shelley address')
    }
    const keyHash = await getCardanoAddrKeyHash(wasmAddr)
    const addrHex = Buffer.from(wasmAddr.to_bytes()).toString('hex')
    if (keyHash === null) {
      if (!seenByronKeys.has(addrHex)) {
        seenByronKeys.add(addrHex)
        deduped.push(senderUtxo)
      }
      continue
    }
    if (keyHash === undefined) {
      throw new Error('signTransaction:: cannot sign script inputs')
    }
    {
      const keyHex = Buffer.from(await keyHash.to_bytes()).toString('hex')
      if (!seenKeyHashes.has(keyHex)) {
        seenKeyHashes.add(keyHex)
        deduped.push(senderUtxo)
      }
    }
  }

  const txBody =
    signRequest.unsignedTx instanceof TransactionBuilder
      ? await signRequest.unsignedTx.build()
      : signRequest.unsignedTx

  const witnessSet = await addWitnesses(txBody, deduped, keyLevel, signingKey)
  return await Transaction.new(txBody, witnessSet, metadata)
}

async function utxoToTxInput(utxo: RawUtxo): TransactionInput {
  return await TransactionInput.new(
    await TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, 'hex')),
    utxo.tx_index,
  )
}

async function addWitnesses(
  txBody: TransactionBody,
  uniqueUtxos: Array<AddressedUtxo>, // pre-req: does not contain duplicate keys
  keyLevel: number,
  signingKey: Bip32PrivateKey,
): Promise<TransactionWitnessSet> {
  // get private keys
  const privateKeys = uniqueUtxos.map((utxo) => {
    const lastLevelSpecified =
      utxo.addressing.startLevel + utxo.addressing.path.length - 1
    if (lastLevelSpecified !== CONFIG.NUMBERS.BIP44_DERIVATION_LEVELS.ADDRESS) {
      throw new Error('addWitnesses:: incorrect addressing size')
    }
    if (keyLevel + 1 < utxo.addressing.startLevel) {
      throw new Error('addWitnesses keyLevel < startLevel')
    }
    let key = signingKey
    // TODO: addressing
    for (
      let i = keyLevel - utxo.addressing.startLevel + 1;
      i < utxo.addressing.path.length;
      i++
    ) {
      key = key.derive(utxo.addressing.path[i])
    }
    return key
  })

  // sign the transactions
  const txHash = await hash_transaction(txBody)
  const vkeyWits = await Vkeywitnesses.new()
  const bootstrapWits = await BootstrapWitnesses.new()
  for (let i = 0; i < uniqueUtxos.length; i++) {
    const wasmAddr = await normalizeToAddress(uniqueUtxos[i].receiver)
    if (wasmAddr == null) {
      throw new Error('addWitnesses)} utxo not a valid Shelley address')
    }
    const byronAddr = await ByronAddress.from_address(wasmAddr)
    if (byronAddr == null) {
      const vkeyWit = await make_vkey_witness(
        txHash,
        await privateKeys[i].to_raw_key(),
      )
      await vkeyWits.add(vkeyWit)
    } else {
      const bootstrapWit = await make_icarus_bootstrap_witness(
        txHash,
        byronAddr,
        privateKeys[i],
      )
      await bootstrapWits.add(bootstrapWit)
    }
  }

  const witSet = await TransactionWitnessSet.new()
  if ((await bootstrapWits.len()) > 0) {
    await witSet.set_bootstraps(bootstrapWits)
  }
  if ((await vkeyWits.len()) > 0) await witSet.set_vkeys(vkeyWits)
  return witSet
}

// TODO(v-almonacid): I think I'll put this one in the corresponding wallet
// class
// export function asAddressedUtxo(
//   utxos: IGetAllUtxosResponse,
// ): Array<AddressedUtxo> {
//   return utxos.map((utxo) => {
//     return {
//       amount: utxo.output.UtxoTransactionOutput.Amount,
//       receiver: utxo.address,
//       tx_hash: utxo.output.Transaction.Hash,
//       tx_index: utxo.output.UtxoTransactionOutput.OutputIndex,
//       utxo_id: utxo.output.Transaction.Hash + utxo.output.UtxoTransactionOutput.OutputIndex,
//       addressing: utxo.addressing,
//     }
//   })
// }