// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ZetaChain types for revert context and revert routing
import {RevertContext, RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";

// Base interface for all Universal ZetaChain-compatible contracts
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";

// ZetaChain Gateway contract for message routing
import "@zetachain/protocol-contracts/contracts/zevm/GatewayZEVM.sol";

/// @title Universal
/// @notice Abstract base contract for cross-chain messaging via ZetaChain.
/// Inherit this to enable `withdraw`, `withdrawAndCall`, and custom `onCall` handling.
abstract contract Universal is UniversalContract {
    /// @notice Immutable ZetaChain gateway contract for sending/receiving messages.
    GatewayZEVM public immutable gateway;

    /// @notice Emitted when a message reverts on the destination chain.
    event RevertEvent(string reason, RevertContext context);

    /// @notice Error thrown when ZRC20 transfer or approval fails.
    error TransferFailed();

    /// @notice Error thrown when a function is called by a non-gateway address.
    error Unauthorized();

    /// @notice Restricts access to ZetaChain gateway contract.
    modifier onlyGateway() {
        if (msg.sender != address(gateway)) revert Unauthorized();
        _;
    }

    /// @param gatewayAddress The address of the deployed ZetaChain GatewayZEVM contract.
    constructor(address payable gatewayAddress) {
        gateway = GatewayZEVM(gatewayAddress);
    }

    /// @notice Sends ZRC20 tokens to another chain via ZetaChain Gateway.
    /// @param receiver Encoded address of the receiver on the destination chain.
    /// @param amount Amount of tokens to withdraw cross-chain.
    /// @param zrc20 ZRC20 token address to withdraw.
    /// @param revertOptions Options to configure how reverts are handled.
    function withdraw(bytes memory receiver, uint256 amount, address zrc20, RevertOptions memory revertOptions)
        external
    {
        (address gasZRC20, uint256 gasFee) = IZRC20(zrc20).withdrawGasFee();

        // If ZRC20 used for fee, add it to transfer amount
        uint256 target = zrc20 == gasZRC20 ? amount + gasFee : amount;

        // Pull target amount from user
        if (!IZRC20(zrc20).transferFrom(msg.sender, address(this), target)) {
            revert TransferFailed();
        }
        IZRC20(zrc20).approve(address(gateway), target);

        // If fee is in a separate ZRC20, handle separately
        if (zrc20 != gasZRC20) {
            if (!IZRC20(gasZRC20).transferFrom(msg.sender, address(this), gasFee)) {
                revert TransferFailed();
            }
            IZRC20(gasZRC20).approve(address(gateway), gasFee);
        }

        // Dispatch cross-chain withdrawal
        gateway.withdraw(receiver, amount, zrc20, revertOptions);
    }

    /// @notice Sends ZRC20 and executes function call on destination chain.
    /// @param receiver Encoded address of receiver on target chain.
    /// @param amount Tokens to transfer.
    /// @param zrc20 Token address.
    /// @param message Encoded calldata to pass to `onCall()` on destination.
    /// @param callOptions Call configuration (gas, destination chain ID, etc.).
    /// @param revertOptions Options to handle message failure cases.
    function withdrawAndCall(
        bytes memory receiver,
        uint256 amount,
        address zrc20,
        bytes calldata message,
        CallOptions memory callOptions,
        RevertOptions memory revertOptions
    ) external {
        (address gasZRC20, uint256 gasFee) = IZRC20(zrc20).withdrawGasFeeWithGasLimit(callOptions.gasLimit);
        uint256 target = zrc20 == gasZRC20 ? amount + gasFee : amount;

        if (!IZRC20(zrc20).transferFrom(msg.sender, address(this), target)) {
            revert TransferFailed();
        }
        IZRC20(zrc20).approve(address(gateway), target);

        if (zrc20 != gasZRC20) {
            if (!IZRC20(gasZRC20).transferFrom(msg.sender, address(this), gasFee)) {
                revert TransferFailed();
            }
            IZRC20(gasZRC20).approve(address(gateway), gasFee);
        }

        // Send tokens + message to destination chain
        gateway.withdrawAndCall(receiver, amount, zrc20, message, callOptions, revertOptions);
    }

    /// @notice Must be implemented in child contracts.
    /// This function is triggered on the destination chain after a successful call.
    /// @param context Message metadata (sender, origin chain, etc.)
    /// @param zrc20 Token used in the call.
    /// @param amount Amount received.
    /// @param message Encoded custom message data (to be decoded by child).
    function onCall(MessageContext calldata context, address zrc20, uint256 amount, bytes calldata message)
        external
        virtual
        override
        onlyGateway
    {
        // Must be implemented in child contracts
        revert("onCall must be implemented by child contract");
    }

    /// @notice Handles message revert cases. Can be overridden by child.
    /// @param revertContext Context about the failed cross-chain message.
    function onRevert(RevertContext calldata revertContext) external virtual onlyGateway {
        emit RevertEvent("Revert on ZetaChain", revertContext);
    }
}
