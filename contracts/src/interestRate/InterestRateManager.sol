// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../protocol/BaseContract.sol";
import "../interfaces/IInterestRateModel.sol";

/// @title Interest Rate Manager for Dynamic Borrow/Supply Rate Calculations Across Pools
/// @author
/// @notice Calculates the current borrow and supply interest rates based on pool utilization.
/// @dev This contract is modular and supports various interest rate models (e.g., linear, kinked, exponential).
/// Can be upgraded by the admin to switch models per pool.
/// Utilization is defined as borrowed / total liquidity, and rates are derived accordingly.
contract InterestRateManager is IInterestRateModel, BaseContract {
    // RAY = 1e27 for precision
    uint256 private constant RAY = 1e27;

    // Interest model parameters
    uint256 public baseRate; // Base borrow rate when utilization = 0
    uint256 public rateMultiplier; // Slope up to optimal utilization
    uint256 public optimalUtilization; // Kink point
    uint256 public jumpMultiplier; // Slope after optimal utilization
    uint256 public reserveFactor; // % of interest kept as reserves (scaled by RAY)

    // Events
    event BaseRateUpdated(uint256 newRate);
    event RateMultiplierUpdated(uint256 newMultiplier);
    event OptimalUtilizationUpdated(uint256 newUtilization);
    event JumpMultiplierUpdated(uint256 newMultiplier);
    event ReserveFactorUpdated(uint256 newReserveFactor);

    constructor(
        address _acm,
        uint256 _baseRate,
        uint256 _rateMultiplier,
        uint256 _optimalUtilization,
        uint256 _jumpMultiplier,
        uint256 _reserveFactor
    ) BaseContract(_acm) {
        require(_baseRate < RAY, "Base rate too high");
        require(_optimalUtilization < RAY, "Optimal utilization too high");
        require(_reserveFactor <= RAY, "Reserve factor too high");

        baseRate = _baseRate;
        rateMultiplier = _rateMultiplier;
        optimalUtilization = _optimalUtilization;
        jumpMultiplier = _jumpMultiplier;
        reserveFactor = _reserveFactor;
    }

    /// @notice Returns the borrow rate (per second, ray) given a utilization rate
    function getBorrowRate(uint256 utilization) external view override returns (uint256) {
        return _calculateBorrowRate(utilization);
    }

    /// @notice Returns the supply rate based on borrow rate and utilization
    function getSupplyRate(uint256 utilization, uint256 borrowRate) external view override returns (uint256) {
        uint256 rate = (borrowRate * utilization) / RAY;
        return rate * (RAY - reserveFactor) / RAY;
    }

    /// INTERNAL ///

    function _calculateBorrowRate(uint256 utilization) internal view returns (uint256) {
        if (utilization <= optimalUtilization) {
            return baseRate + (utilization * rateMultiplier) / RAY;
        } else {
            uint256 normalRate = baseRate + (optimalUtilization * rateMultiplier) / RAY;
            uint256 excessUtilization = utilization - optimalUtilization;
            return normalRate + (excessUtilization * jumpMultiplier) / RAY;
        }
    }

    /// ADMIN SETTERS ///

    function setBaseRate(uint256 newBaseRate) external onlyRiskAdmin {
        require(newBaseRate < RAY, "Base rate too high");
        baseRate = newBaseRate;
        emit BaseRateUpdated(newBaseRate);
    }

    function setRateMultiplier(uint256 newMultiplier) external onlyRiskAdmin {
        rateMultiplier = newMultiplier;
        emit RateMultiplierUpdated(newMultiplier);
    }

    function setOptimalUtilization(uint256 newOptimalUtilization) external onlyRiskAdmin {
        require(newOptimalUtilization < RAY, "Optimal utilization too high");
        optimalUtilization = newOptimalUtilization;
        emit OptimalUtilizationUpdated(newOptimalUtilization);
    }

    function setJumpMultiplier(uint256 newJumpMultiplier) external onlyRiskAdmin {
        jumpMultiplier = newJumpMultiplier;
        emit JumpMultiplierUpdated(newJumpMultiplier);
    }

    function setReserveFactor(uint256 newReserveFactor) external onlyRiskAdmin {
        require(newReserveFactor <= RAY, "Reserve factor too high");
        reserveFactor = newReserveFactor;
        emit ReserveFactorUpdated(newReserveFactor);
    }
}
