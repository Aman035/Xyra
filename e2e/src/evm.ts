import { execSync } from 'child_process'

export const callContract = (
  contractAddress: string,
  types: string,
  values: string,
  privateKey: string,
  rpc: string,
  chainId: string
) => {
  const command = `zetachain evm call --receiver ${contractAddress} --types ${types} --values ${values} --private-key ${privateKey} --rpc ${rpc} --chain-id ${chainId} --yes`
  try {
    const output = execSync(command).toString()
    console.log(`Call Output: ${output}`)
    return output
  } catch (error) {
    console.error(`Error calling: ${error}`)
    throw error
  }
}

export const depositAndCallContract = (
  contractAddress: string,
  types: string,
  values: string,
  amount: string,
  privateKey: string,
  rpc: string,
  chainId: string
) => {
  const command = `zetachain evm deposit-and-call --receiver ${contractAddress} --types ${types} --values ${values} --amount ${amount} --private-key ${privateKey} --rpc ${rpc} --chain-id ${chainId} --yes`
  try {
    const output = execSync(command).toString()
    console.log(`Deposit and Call Output: ${output}`)
    return output
  } catch (error) {
    console.error(`Error with deposit-and-call: ${error}`)
    throw error
  }
}
