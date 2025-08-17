// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IPoolManager Interface for Admin-Controlled Pool Configuration and Deployment
/// @notice Defines the functions for creating lending pools and managing collateral settings
/// @dev Used by the protocol admin or factory to manage core pool-level configuration
interface IPoolManager {
    /// @notice Creates a new lending pool for a given asset
    /// @param asset The ERC20 token address to create a pool for
    function createVault(address asset) external returns (address vaultAddr, address xTokenAddr);

    /// @notice Enables or disables the use of an asset as collateral
    /// @param asset The token to configure
    /// @param isEnabled true = enabled as collateral, false = disabled
    function setCollateralStatus(address asset, bool isEnabled) external;

    /// @notice Returns whether a token is currently allowed as collateral
    /// @param asset The token to check
    /// @return isCollateral true if the asset can be used as collateral
    function isCollateralEnabled(address asset) external view returns (bool isCollateral);

    /// @notice Returns the vault address for a registered asset, or address(0) if none
    function getVault(address asset) external view returns (address);

     /// @notice Returns the xToken address for a registered asset, or address(0) if none
    function getAssetToXToken(address asset) external view returns (address);

    /// @notice Returns list of all registered asset addresses
    function getAllAssets() external view returns (address[] memory);
}
