// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseContract.sol";
import "../interfaces/IPoolManager.sol";
import "../interfaces/IInterestRateModel.sol";
import "../interfaces/IPriceOracle.sol";
import "../interfaces/ICollateralManager.sol";

/// @title Configuration Provider for Protocol Settings
/// @notice Stores and provides access to protocol-wide configuration
abstract contract PoolConfigurationProvider is BaseContract {
    IPoolManager public immutable POOL_MANAGER;
    IInterestRateModel public immutable INTEREST_RATE_MODEL;
    IPriceOracle public immutable PRICE_ORACLE;
    ICollateralManager public immutable COLLATERAL_MANAGER;

    /// @dev Health factor below which a position can be liquidated
    uint256 public constant LIQUIDATION_THRESHOLD = 1e18; // 1.0 in ray

    /// @dev Maximum percentage of a position that can be liquidated at once
    uint256 public constant MAX_LIQUIDATION_CLOSE_FACTOR = 0.5e18; // 50%

    constructor(
        address _acm,
        address _poolManager,
        address _interestRateModel,
        address _priceOracle,
        address _collateralManager
    ) BaseContract(_acm) {
        require(_poolManager != address(0), "Invalid pool manager");
        require(_interestRateModel != address(0), "Invalid interest rate model");
        require(_priceOracle != address(0), "Invalid price oracle");
        require(_collateralManager != address(0), "Invalid collateral manager");

        POOL_MANAGER = IPoolManager(_poolManager);
        INTEREST_RATE_MODEL = IInterestRateModel(_interestRateModel);
        PRICE_ORACLE = IPriceOracle(_priceOracle);
        COLLATERAL_MANAGER = ICollateralManager(_collateralManager);
    }
}
