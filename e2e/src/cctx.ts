import { spawnSync } from 'child_process'

// Function to query transaction status using Zetachain CLI
export const getTxStatus = (txHash: string) => {
  try {
    // Spawn the zetachain cctx query process synchronously
    const result = spawnSync('zetachain', ['query', 'cctx', '-h', txHash], {
      stdio: 'inherit', // Inherit the stdio to show the output in real time
      encoding: 'utf-8', // Ensure the output is in string format
    })

    // Since we're using stdio: 'inherit', we don't need to manually log the result
    if (result.error) {
      console.error('Error executing the command:', result.error)
    }
  } catch (error) {
    console.error('Error querying transaction:', error)
  }
}
