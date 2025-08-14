// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ILendingPool Interface for User-Facing Lending Operations
/// @notice Provides core lending/borrowing interactions: supply, withdraw, borrow, and repay
interface ILendingPool {
    /// @notice Supplies an asset to the lending pool
    /// @param asset The address of the underlying ERC20 token
    /// @param amount The amount of the asset to supply
    /// @param onBehalfOf The address receiving the aToken representation
    function supply(address asset, uint256 amount, address onBehalfOf) external;

    /// @notice Withdraws an asset from the pool
    /// @param asset The token to withdraw
    /// @param amount The amount to withdraw (use type(uint256).max for full balance)
    /// @param to The address receiving the withdrawn tokens
    /// @return withdrawnAmount The actual amount withdrawn
    function withdraw(address asset, uint256 amount, address to) external returns (uint256 withdrawnAmount);

    /// @notice Repays a borrowed asset to the pool
    /// @param asset The borrowed token
    /// @param amount The amount to repay (type(uint256).max = full repayment)
    /// @param onBehalfOf The borrower address
    /// @return repaidAmount The actual amount repaid
    function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256 repaidAmount);

    /// @notice Borrows an asset from the pool using collateral
    /// @param asset The token to borrow
    /// @param amount The amount to borrow
    /// @param onBehalfOf The recipient of the borrowed asset and debt responsibility
    function borrow(address asset, uint256 amount, address onBehalfOf) external;
}
