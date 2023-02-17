import {getAssetFingerprint} from '../../legacy/format'
import {AssetMetadata, NftMetadata, YoroiNft} from '../types'
import {asciiToHex} from './api/utils'

export const convertNft = (assetMetadata: AssetMetadata, storageUrl: string): YoroiNft => {
  const policyId = Object.keys(assetMetadata)[0]
  const assetNameKey = Object.keys(assetMetadata[policyId])[0]
  const metadata: NftMetadata = assetMetadata[policyId][assetNameKey]
  const assetNameHex = asciiToHex(assetNameKey)
  const fingerprint = getAssetFingerprint(policyId, assetNameHex)
  const description = Array.isArray(metadata.description) ? metadata.description.join(' ') : metadata.description

  const id = `${policyId}.${assetNameHex}`
  return {
    id: id,
    fingerprint,
    name: metadata.name,
    description: description ?? '',
    thumbnail: `${storageUrl}/p_${fingerprint}.jpeg`,
    image: `${storageUrl}/${fingerprint}.jpeg`,
    metadata: {
      policyId,
      assetNameHex,
      originalMetadata: metadata,
    },
  }
}