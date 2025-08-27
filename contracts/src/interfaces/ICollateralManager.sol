// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ICollateralManager Interface for Tracking and Enforcing Collateralization Rules
/// @notice Handles all user collateral accounting, LTV checks, and health factor evaluations
interface ICollateralManager {
    function getLiquidationThreshold(address asset) external view returns (uint256);
    function getLTV(address asset) external view returns (uint256);
    function setCollateralConfig(
        address asset,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus,
        bool enabled
    ) external;
}
