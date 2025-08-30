// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {MessageContext, RevertContext} from "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";

interface ISwap {
    struct Params {
        address target;
        bytes to;
        bool withdraw;
    }

    event TokenSwap(
        address sender,
        address indexed recipient,
        address indexed inputToken,
        address indexed targetToken,
        uint256 inputAmount,
        uint256 outputAmount
    );

    error InvalidAddress();
    error Unauthorized();
    error ApprovalFailed();
    error TransferFailed(string);
    error InsufficientAmount(string);

    /// @notice Returns the uniswap router address
    function uniswapRouter() external view returns (address);

    /// @notice Returns the gateway contract address
    function gateway() external view returns (address);

    /// @notice Returns the gas limit for cross-chain transactions
    function gasLimit() external view returns (uint256);

    /**
     * @notice Swap zrc20 tokens
     * @param inputToken The address of the input token
     * @param amount The amount of input tokens to swap
     * @param targetToken The address of the target token
     * @param recipient The address that will receive the swapped tokens
     * @return The amount of tokens received after the swap
     */
    function swap(
        address inputToken,
        uint256 amount,
        address targetToken,
        address recipient
    ) external returns (uint256);

    /**
     * @notice Swap zrc20 tokens and withdraw to destination chain
     * @param sender The address initiating the swap
     * @param inputToken The address of the input token
     * @param amount The amount of input tokens to swap
     * @param targetToken The address of the target token
     * @param to The recipient address on the destination chain
     */
    function swapAndWithdraw(
        address sender,
        address inputToken,
        uint256 amount,
        address targetToken,
        bytes memory to
    ) external;

    /**
     * @notice Withdraws tokens to a connected chain
     * @param sender The address initiating the withdrawal
     * @param to The recipient address on the destination chain
     * @param targetToken The token to withdraw
     * @param gasFee The gas fee for the withdrawal
     * @param gasZRC20 The token used for gas payment
     * @param out The amount to withdraw
     * @param inputToken The original input token
     */
    function withdraw(
        address sender,
        bytes memory to,
        address targetToken,
        uint256 gasFee,
        address gasZRC20,
        uint256 out,
        address inputToken
    ) external;
}
