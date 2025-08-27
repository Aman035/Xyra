// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../protocol/BaseContract.sol";
import "../interfaces/ICollateralManager.sol";
import "../interfaces/IPriceOracle.sol";

/// @title Collateral Manager for Tracking and Validating Collateral Deposits in Lending Pools
/// @author
/// @notice Handles collateral tracking, LTV calculations, and health factor checks for users.
/// @dev Called during borrow/withdraw to enforce solvency. Stores mapping of user => collateral => amount.
/// Supports enabling/disabling collateral assets per pool via PoolManager.
/// Exposes read-only functions to fetch user health metrics for frontend/liquidation.
contract CollateralManager is ICollateralManager, BaseContract {
    struct CollateralConfig {
        uint256 ltv; // Loan to Value ratio, e.g. 7500 = 75% (scale 1e4)
        uint256 liquidationThreshold; // Liquidation threshold, e.g. 8500 = 85% (scale 1e4)
        uint256 liquidationBonus; // Liquidation bonus, e.g. 10500 = 105% (scale 1e4)
        bool enabled; // Is asset enabled as collateral globally
    }

    /// @dev asset => CollateralConfig
    mapping(address => CollateralConfig) private collateralConfigs;

    /// @dev user => asset => is collateral enabled by user
    mapping(address => mapping(address => bool)) private userCollateralEnabled;

    /// @notice Emitted when collateral config for an asset is updated
    event CollateralConfigUpdated(
        address indexed asset, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, bool enabled
    );

    /// @notice Emitted when user enables/disables collateral for an asset
    event UserCollateralStatusChanged(address indexed user, address indexed asset, bool enabled);

    constructor(address _acm) BaseContract(_acm) {}

    /// @notice Admin function to set collateral config for an asset
    function setCollateralConfig(
        address asset,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus,
        bool enabled
    ) external onlyPoolManager {
        require(asset != address(0), "CollateralManager: zero asset");
        require(
            ltv <= 1e18 && liquidationThreshold <= 1e18 && liquidationBonus >= 1e18, "CollateralManager: invalid ratios"
        );

        collateralConfigs[asset] = CollateralConfig({
            ltv: ltv,
            liquidationThreshold: liquidationThreshold,
            liquidationBonus: liquidationBonus,
            enabled: enabled
        });

        emit CollateralConfigUpdated(asset, ltv, liquidationThreshold, liquidationBonus, enabled);
    }

    /// @notice Admin function to enable or disable an asset globally as collateral
    function setCollateralEnabledGlobally(address asset, bool enabled) external onlyPoolManager {
        require(asset != address(0), "CollateralManager: zero asset");
        collateralConfigs[asset].enabled = enabled;

        emit CollateralConfigUpdated(
            asset,
            collateralConfigs[asset].ltv,
            collateralConfigs[asset].liquidationThreshold,
            collateralConfigs[asset].liquidationBonus,
            enabled
        );
    }

    /// @notice User enables or disables collateral usage for a given asset
    function setUserCollateralEnabled(address asset, bool enabled) external {
        require(collateralConfigs[asset].enabled, "CollateralManager: asset not enabled globally");
        userCollateralEnabled[msg.sender][asset] = enabled;

        emit UserCollateralStatusChanged(msg.sender, asset, enabled);
    }

    /// @notice Returns true if asset is enabled globally and user enabled it as collateral
    function isCollateralEnabled(address user, address asset) external view returns (bool) {
        CollateralConfig memory config = collateralConfigs[asset];
        return config.enabled && userCollateralEnabled[user][asset];
    }

    /// @notice Get collateral config for an asset
    function getCollateralConfig(address asset) external view returns (CollateralConfig memory) {
        return collateralConfigs[asset];
    }

    /// @notice Get LTV for an asset
    function getLTV(address asset) external view returns (uint256) {
        return collateralConfigs[asset].ltv;
    }

    /// @notice Get liquidation threshold for an asset
    function getLiquidationThreshold(address asset) external view returns (uint256) {
        return collateralConfigs[asset].liquidationThreshold;
    }

    /// @notice Get liquidation bonus for an asset
    function getLiquidationBonus(address asset) external view returns (uint256) {
        return collateralConfigs[asset].liquidationBonus;
    }

    /// @notice Returns true if asset is enabled globally as collateral
    function isAssetEnabledGlobally(address asset) external view returns (bool) {
        return collateralConfigs[asset].enabled;
    }
}
