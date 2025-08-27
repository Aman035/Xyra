// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ILiquidationManager Interface for Liquidating Undercollateralized Borrowers
/// @notice Executes liquidation logic and determines eligibility for liquidation
interface ILiquidationManager {
    /// @notice Liquidates a borrower's position
    /// @param user The borrower to liquidate
    /// @param repayAsset The asset being repaid
    /// @param repayAmount The amount of debt to repay
    /// @param collateralAsset The asset to be seized
    function liquidate(address user, address repayAsset, uint256 repayAmount, address collateralAsset) external;

    /// @notice Returns whether a user is eligible for liquidation
    /// @param user The borrower address
    /// @return isEligible true if the user’s health factor is below the minimum
    function isLiquidatable(address user) external view returns (bool isEligible);
}
