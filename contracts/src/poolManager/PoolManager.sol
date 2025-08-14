// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../protocol/BaseContract.sol";
import "../interfaces/IPoolManager.sol";
import "../vaults/ERC4626Reserve.sol"; // Your ERC4626 vault wrapper
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Pool Manager Contract
/// @notice Manages the creation and configuration of ERC4626 vaults (reserves) per supported asset
contract PoolManager is IPoolManager, BaseContract {
    /// @dev Mapping of asset address to whether it can be used as collateral
    mapping(address => bool) public assetCollateralStatus;

    /// @dev Mapping of asset address to its deployed ERC4626 reserve vault
    mapping(address => address) public assetToVault;

    /// @dev List of all registered assets
    address[] public allAssets;

    event PoolCreated(address indexed asset, address indexed vault);
    event CollateralStatusUpdated(address indexed asset, bool isEnabled);

    constructor(address _acm) BaseContract(_acm) {}

    /// @notice Deploys a new ERC4626 vault for an asset and registers it
    function createVault(address asset)
        external
        onlyPoolManager
        returns (address)
    {
        require(asset != address(0), "Invalid asset address");
        require(assetToVault[asset] == address(0), "Pool already exists");

        ERC4626Reserve vault = new ERC4626Reserve(IERC20(asset));
        address vaultAddr = address(vault);

        assetToVault[asset] = vaultAddr;
        allAssets.push(asset);

        emit PoolCreated(asset, vaultAddr);
        return vaultAddr;
    }

    /// @notice Enables or disables collateral status for a registered asset
    function setCollateralStatus(address asset, bool isEnabled)
        external
        onlyPoolManager
    {
        require(asset != address(0), "Invalid asset address");
        require(assetToVault[asset] != address(0), "Pool does not exist");

        assetCollateralStatus[asset] = isEnabled;
        emit CollateralStatusUpdated(asset, isEnabled);
    }

    /// @notice Returns whether the given asset is enabled as collateral
    function isCollateralEnabled(address asset)
        external
        view
        returns (bool)
    {
        return assetCollateralStatus[asset];
    }

    /// @notice Returns list of all registered asset addresses
    function getAllAssets() external view returns (address[] memory) {
        return allAssets;
    }

        /// @notice Returns true if the asset is registered and supported
    function isAssetSupported(address asset) external view returns (bool) {
        return assetToVault[asset] != address(0);
    }

    /// @notice Returns the vault address for a registered asset, or address(0) if none
    function getVault(address asset) external view returns (address) {
        return assetToVault[asset];
    }
}
