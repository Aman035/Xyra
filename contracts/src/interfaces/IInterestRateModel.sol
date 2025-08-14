// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IInterestRateModel Interface for Utilization-Based Dynamic Rate Calculations
/// @notice Defines the functions for calculating borrow and supply rates using the current pool utilization
interface IInterestRateModel {
    /// @notice Calculates the borrow rate based on utilization
    /// @param utilization Utilization of the pool, scaled to 1e18
    /// @return borrowRate Borrow APR in 1e18 format
    function getBorrowRate(uint256 utilization) external view returns (uint256 borrowRate);

    /// @notice Calculates the supply rate given the utilization and borrow rate
    /// @param utilization Pool utilization (1e18 scale)
    /// @param borrowRate Current borrow APR (1e18 scale)
    /// @return supplyRate Current supply APR (1e18 scale)
    function getSupplyRate(uint256 utilization, uint256 borrowRate) external view returns (uint256 supplyRate);
}
