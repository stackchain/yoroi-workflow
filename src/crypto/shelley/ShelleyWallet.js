// @flow

// TODO(v-almonacid): this doesn't include haskell shelley logic yet
// but still the byron-era implementation

import _ from 'lodash'
import uuid from 'uuid'
import DeviceInfo from 'react-native-device-info'
import {
  Bip32PrivateKey,
  /* eslint-disable-next-line camelcase */
  hash_transaction,
  Transaction,
  /* eslint-disable-next-line no-unused-vars */
  TransactionBuilder,
} from 'react-native-haskell-shelley'
import {BigNumber} from 'bignumber.js'

import Wallet from '../Wallet'
import {WalletInterface} from '../WalletInterface'
import {AddressChain, AddressGenerator} from '../chain'
import * as byronUtil from '../byron/util'
import {ADDRESS_TYPE_TO_CHANGE} from '../commonUtils'
import * as api from '../../api/byron/api'
import {CONFIG} from '../../config/config'
import {NETWORK_REGISTRY} from '../../config/types'
import {isJormungandr} from '../../config/networks'
import assert from '../../utils/assert'
import {Logger} from '../../utils/logging'
import {InvalidState} from '../errors'
import {TransactionCache} from '../transactionCache'
import {signTransaction} from './transactions'
import {createUnsignedTx} from './transactionUtils'
import {genTimeToSlot} from '../../utils/timeUtils'

import type {RawUtxo, TxBodiesRequest, TxBodiesResponse} from '../../api/types'
import type {AddressedUtxo, BaseSignRequest, SignedTx} from './../types'
import type {CryptoAccount} from '../byron/util'
import type {HWDeviceInfo} from '../byron/ledgerUtils'
import type {NetworkId} from '../../config/types'

export default class ShelleyWallet extends Wallet implements WalletInterface {
  // =================== create =================== //

  async _initialize(
    networkId: NetworkId,
    account: CryptoAccount | string,
    chimericAccountAddr: ?string,
    hwDeviceInfo: ?HWDeviceInfo,
  ) {
    this.networkId = networkId

    this.isHW = hwDeviceInfo != null

    this.hwDeviceInfo = hwDeviceInfo

    this.transactionCache = new TransactionCache()

    // initialize address chains
    this.internalChain = new AddressChain(
      new AddressGenerator(account, 'Internal', isJormungandr(networkId)),
    )
    this.externalChain = new AddressChain(
      new AddressGenerator(account, 'External', isJormungandr(networkId)),
    )

    this.chimericAccountAddress = chimericAccountAddr

    this.version = DeviceInfo.getVersion()

    // Create at least one address in each block
    await this.internalChain.initialize()
    await this.externalChain.initialize()

    this.setupSubscriptions()
    this.notify()

    this.isInitialized = true
    return this.id
  }

  async create(mnemonic: string, newPassword: string, networkId: NetworkId) {
    Logger.info(`create wallet (networkId=${String(networkId)})`)
    this.id = uuid.v4()
    assert.assert(!this.isInitialized, 'createWallet: !isInitialized')
    const masterKey = await byronUtil.getMasterKeyFromMnemonic(mnemonic)
    await this.encryptAndSaveMasterKey(
      'MASTER_PASSWORD',
      masterKey,
      newPassword,
    )
    const account: CryptoAccount = await byronUtil.getAccountFromMasterKey(
      masterKey,
    )

    return await this._initialize(
      networkId,
      account,
      null,
      null, // this is not a HW
    )
  }

  async createWithBip44Account(
    accountPublicKey: string,
    networkId: NetworkId,
    hwDeviceInfo: ?HWDeviceInfo,
  ) {
    Logger.info(
      `create wallet with account pub key (networkId=${String(networkId)})`,
    )
    Logger.debug('account pub key', accountPublicKey)
    this.id = uuid.v4()
    assert.assert(!this.isInitialized, 'createWallet: !isInitialized')
    const chimericAccountAddr = null // only byron wallets supported for now
    const accountObj: CryptoAccount = {
      root_cached_key: accountPublicKey,
      derivation_scheme: 'V2',
    }
    return await this._initialize(
      networkId,
      accountObj,
      chimericAccountAddr,
      hwDeviceInfo,
    )
  }

  // =================== persistence =================== //

  _integrityCheck(data): void {
    try {
      if (this.networkId == null) {
        if (data.isShelley != null && data.isShelley === false) {
          this.networkId = NETWORK_REGISTRY.BYRON_MAINNET
        } else {
          throw new Error('invalid networkId')
        }
      }
    } catch (e) {
      Logger.error('wallet::_integrityCheck', e)
      throw new InvalidState()
    }
  }

  // TODO(v-almonacid): move to parent class?
  restore(data: any, networkId?: NetworkId) {
    Logger.info('restore wallet')
    assert.assert(!this.isInitialized, 'restoreWallet: !isInitialized')
    if (networkId != null) {
      assert.assert(!isJormungandr(networkId), 'restore: !isJormungandr')
    }
    this.state = {
      lastGeneratedAddressIndex: data.lastGeneratedAddressIndex,
    }
    this.networkId = data.networkId // can be null for versions < 3.0.0
    this.isHW = data.isHW != null ? data.isHW : false
    this.hwDeviceInfo = data.hwDeviceInfo
    this.version = data.version
    this.internalChain = AddressChain.fromJSON(data.internalChain)
    this.externalChain = AddressChain.fromJSON(data.externalChain)
    this.transactionCache = TransactionCache.fromJSON(data.transactionCache)
    this.isEasyConfirmationEnabled = data.isEasyConfirmationEnabled

    this._integrityCheck(data)

    // subscriptions
    this.setupSubscriptions()

    this.isInitialized = true
    return Promise.resolve()
  }

  // =================== tx building =================== //

  getChangeAddress() {
    const candidateAddresses = this.internalChain.addresses
    const unseen = candidateAddresses.filter(
      (addr) => !this.isUsedAddress(addr),
    )
    assert.assert(unseen.length > 0, 'Cannot find change address')
    return _.first(unseen)
  }

  _getAddressedChangeAddress() {
    const changeAddr = this.getChangeAddress()
    const addressInfo = this.getAddressingInfo(changeAddr)
    if (addressInfo == null) {
      throw new Error("Couldn't get change addressing, should never happen")
    }
    return {
      address: changeAddr,
      addressing: addressInfo,
    }
  }

  getAllUtxosForKey(utxos: Array<RawUtxo>) {
    throw Error('not implemented')
  }

  getAddressingInfo(address: string) {
    const chains = [
      ['Internal', this.internalChain],
      ['External', this.externalChain],
    ]
    let addressInfo = null
    chains.forEach(([type, chain]) => {
      if (chain.isMyAddress(address)) {
        addressInfo = {
          path: [
            CONFIG.NUMBERS.ACCOUNT_INDEX,
            ADDRESS_TYPE_TO_CHANGE[type],
            chain.getIndexOfAddress(address),
          ],
          startLevel: CONFIG.NUMBERS.BIP44_DERIVATION_LEVELS.ACCOUNT,
        }
      }
    })
    return addressInfo
  }

  asAddressedUtxo(utxos: Array<RawUtxo>): Array<AddressedUtxo> {
    const addressedUtxos = utxos.map(
      (utxo: RawUtxo): AddressedUtxo => {
        const addressInfo = this.getAddressingInfo(utxo.receiver)
        if (addressInfo == null) {
          throw new Error(`Address not found for utxo: ${utxo.receiver}`)
        }
        return {
          ...utxo,
          addressing: addressInfo,
        }
      },
    )
    return addressedUtxos
  }

  async createUnsignedTx<TransactionBuilder>(
    utxos: Array<RawUtxo>,
    receiver: string,
    amount: string,
  ): Promise<BaseSignRequest<TransactionBuilder>> {
    const timeToSlotFn = await genTimeToSlot([
      {
        StartAt: CONFIG.NETWORKS.HASKELL_SHELLEY.START_AT,
        GenesisDate: CONFIG.NETWORKS.HASKELL_SHELLEY.GENESIS_DATE,
        SlotsPerEpoch: CONFIG.NETWORKS.HASKELL_SHELLEY.SLOTS_PER_EPOCH,
        SlotDuration: CONFIG.NETWORKS.HASKELL_SHELLEY.SLOT_DURATION,
      },
    ])
    const absSlotNumber = new BigNumber(timeToSlotFn({time: new Date()}).slot)
    const changeAddr = await this._getAddressedChangeAddress()
    const addressedUtxos = this.asAddressedUtxo(utxos)

    const resp = await createUnsignedTx({
      changeAddr,
      absSlotNumber,
      receiver,
      addressedUtxos,
      amount,
    })
    Logger.debug(JSON.stringify(resp))
    return resp
  }

  async signTx<TransactionBuilder>(
    signRequest: BaseSignRequest<TransactionBuilder>,
    decryptedMasterKey: string,
  ): Promise<SignedTx> {
    const masterKey = await Bip32PrivateKey.from_bytes(
      Buffer.from(decryptedMasterKey, 'hex'),
    )
    const accountPvrKey: Bip32PrivateKey = await (await (await masterKey.derive(
      CONFIG.NUMBERS.WALLET_TYPE_PURPOSE.BIP44,
    )).derive(CONFIG.NUMBERS.COIN_TYPES.CARDANO)).derive(
      0 + CONFIG.NUMBERS.HARD_DERIVATION_START,
    )
    const signedTx: Transaction = await signTransaction(
      signRequest,
      CONFIG.NUMBERS.BIP44_DERIVATION_LEVELS.ACCOUNT,
      accountPvrKey,
      [], // no staking key
      undefined,
    )
    const id = Buffer.from(
      await (await hash_transaction(await signedTx.body())).to_bytes(),
    ).toString('hex')
    const encodedTx = await signedTx.to_bytes()
    return {
      id,
      encodedTx,
    }
  }

  prepareDelegationTx(
    poolData: any,
    valueInAccount: number,
    utxos: Array<RawUtxo>,
  ): Promise<any> {
    throw Error('not implemented')
  }

  // remove and just use signTx
  signDelegationTx<V4UnsignedTxAddressedUtxoResponse>(
    unsignedTx: V4UnsignedTxAddressedUtxoResponse,
    decryptedMasterKey: string,
  ): Promise<SignedTx> {
    throw Error('not implemented')
  }

  // =================== backend API =================== //

  async getBestBlock() {
    return await api.getBestBlock()
  }

  async submitTransaction(signedTx: string) {
    const response = await api.submitTransaction(signedTx)
    Logger.info(response)
    return response
  }

  async getTxsBodiesForUTXOs(
    request: TxBodiesRequest,
  ): Promise<TxBodiesResponse> {
    return await api.getTxsBodiesForUTXOs(request)
  }

  async fetchUTXOs() {
    return await api.bulkFetchUTXOsForAddresses([
      ...this.internalAddresses,
      ...this.externalAddresses,
    ])
  }

  fetchAccountState() {
    throw Error('not implemented')
  }

  fetchPoolInfo() {
    throw Error('not implemented')
  }
}
