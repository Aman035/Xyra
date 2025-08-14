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
    // All rates are in ray (1e27)
    uint256 private constant RAY = 1e27;
    
    // Base rate when utilization is 0
    uint256 public baseRate;
    
    // Rate multiplier for utilization
    uint256 public rateMultiplier;
    
    // Optimal utilization point
    uint256 public optimalUtilization;
    
    // Jump multiplier when utilization > optimal
    uint256 public jumpMultiplier;

    event BaseRateUpdated(uint256 newRate);
    event RateMultiplierUpdated(uint256 newMultiplier);
    event OptimalUtilizationUpdated(uint256 newUtilization);
    event JumpMultiplierUpdated(uint256 newMultiplier);

    constructor(
        address _acm,
        uint256 _baseRate,
        uint256 _rateMultiplier,
        uint256 _optimalUtilization,
        uint256 _jumpMultiplier
    ) BaseContract(_acm) {
        require(_baseRate < RAY, "Base rate too high");
        require(_optimalUtilization < RAY, "Optimal utilization too high");
        
        baseRate = _baseRate;
        rateMultiplier = _rateMultiplier;
        optimalUtilization = _optimalUtilization;
        jumpMultiplier = _jumpMultiplier;
    }

    function getBorrowRate(uint256 utilization) 
        external 
        view 
        override 
        returns (uint256) 
    {
        if (utilization <= optimalUtilization) {
            // Normal rate curve below optimal utilization
            return baseRate + (utilization * rateMultiplier) / RAY;
        } else {
            // Jump rate curve above optimal utilization
            uint256 normalRate = baseRate + (optimalUtilization * rateMultiplier) / RAY;
            uint256 excessUtilization = utilization - optimalUtilization;
            return normalRate + (excessUtilization * jumpMultiplier) / RAY;
        }
    }

    function getSupplyRate(uint256 utilization, uint256 borrowRate) 
        external 
        view 
        override 
        returns (uint256) 
    {
        // Supply rate = borrowRate * utilization * (1 - reserveFactor)
        // For simplicity, we're using 90% of the borrow rate (10% reserve factor)
        return (borrowRate * utilization * 9) / (10 * RAY);
    }

    /// @notice Updates the base interest rate
    /// @param newBaseRate New base rate (in ray)
    function setBaseRate(uint256 newBaseRate) external onlyRiskAdmin {
        require(newBaseRate < RAY, "Base rate too high");
        baseRate = newBaseRate;
        emit BaseRateUpdated(newBaseRate);
    }

    /// @notice Updates the rate multiplier
    /// @param newMultiplier New multiplier (in ray)
    function setRateMultiplier(uint256 newMultiplier) external onlyRiskAdmin {
        rateMultiplier = newMultiplier;
        emit RateMultiplierUpdated(newMultiplier);
    }

    /// @notice Updates the optimal utilization point
    /// @param newOptimalUtilization New optimal utilization (in ray)
    function setOptimalUtilization(uint256 newOptimalUtilization) external onlyRiskAdmin {
        require(newOptimalUtilization < RAY, "Optimal utilization too high");
        optimalUtilization = newOptimalUtilization;
        emit OptimalUtilizationUpdated(newOptimalUtilization);
    }

    /// @notice Updates the jump multiplier
    /// @param newJumpMultiplier New jump multiplier (in ray)
    function setJumpMultiplier(uint256 newJumpMultiplier) external onlyRiskAdmin {
        jumpMultiplier = newJumpMultiplier;
        emit JumpMultiplierUpdated(newJumpMultiplier);
    }
}
