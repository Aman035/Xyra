// Function to extract txHash from the CLI output
export const extractTxHash = (cliOutput: string): string => {
  const match = cliOutput.match(/Transaction hash:\s+(\w+)/)
  if (match) {
    return match[1]
  } else {
    throw new Error('Transaction hash not found in the output')
  }
}
