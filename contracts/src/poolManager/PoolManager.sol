// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../protocol/BaseContract.sol";
import "../interfaces/IPoolManager.sol";
import "../vaults/ERC4626Reserve.sol"; // Your ERC4626 vault wrapper
import "../interestBearingToken/xERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Pool Manager Contract
/// @notice Manages the creation and configuration of ERC4626 vaults (reserves) per supported asset
contract PoolManager is IPoolManager, BaseContract {
    address public lendingPool;

    /// @dev Mapping of asset address to whether it can be used as collateral
    mapping(address => bool) public assetCollateralStatus;

    /// @dev Mapping of asset address to its deployed ERC4626 reserve vault
    mapping(address => address) public assetToVault;

    /// @dev Mapping of asset to corresponding xERC20 token
    mapping(address => address) public assetToXToken;

    /// @dev List of all registered assets
    address[] public allAssets;

    mapping(address => uint256) private _liquidityIndex;
    mapping(address => uint40) private _lastUpdateTimestamp;

    event PoolCreated(address indexed asset, address indexed vault, address indexed xERC20);
    event CollateralStatusUpdated(address indexed asset, bool isEnabled);

    constructor(address _acm) BaseContract(_acm) {}

    modifier onlyLendingPool() {
        require(msg.sender == lendingPool, "Only lending pool");
        _;
    }

    /// @notice Deploys a new ERC4626 vault and xERC20 token for an asset and registers them
    function createVault(address asset) external onlyPoolManager returns (address vaultAddr, address xTokenAddr) {
        require(asset != address(0), "Invalid asset address");
        require(assetToVault[asset] == address(0), "Pool already exists");
        require(lendingPool != address(0), "Pool is not set in the manager");

        // Deploy the xERC20 token with a custom name and symbol
        string memory name = string(abi.encodePacked("x", ERC20(asset).name()));
        string memory symbol = string(abi.encodePacked("x", ERC20(asset).symbol()));
        xERC20 xToken = new xERC20(name, symbol, lendingPool);
        xTokenAddr = address(xToken);

        // Deploy the vault (ERC4626)
        ERC4626Reserve vault = new ERC4626Reserve(IERC20(xToken));
        vaultAddr = address(vault);

        // Register vault and xERC20 token
        assetToVault[asset] = vaultAddr;
        assetToXToken[asset] = xTokenAddr;
        allAssets.push(asset);

        emit PoolCreated(asset, vaultAddr, xTokenAddr);
    }

    function setLendingPool(address _lendingPool) external onlyPoolManager {
        require(_lendingPool != address(0), "Invalid lendingPool");
        lendingPool = _lendingPool;
    }

    /// @notice Enables or disables collateral status for a registered asset
    function setCollateralStatus(address asset, bool isEnabled) external onlyPoolManager {
        require(asset != address(0), "Invalid asset address");
        require(assetToVault[asset] != address(0), "Pool does not exist");

        assetCollateralStatus[asset] = isEnabled;
        emit CollateralStatusUpdated(asset, isEnabled);
    }

    /// @notice Returns whether the given asset is enabled as collateral
    function isCollateralEnabled(address asset) external view returns (bool) {
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

    /// @notice Returns the xToken address for a registered asset, or address(0) if none
    function getAssetToXToken(address asset) external view returns (address) {
        return assetToXToken[asset];
    }

    function getLiquidityIndex(address asset) external view returns (uint256) {
        return _liquidityIndex[asset];
    }

    function getLastUpdateTimestamp(address asset) external view returns (uint40) {
        return _lastUpdateTimestamp[asset];
    }

    function setLiquidityIndex(address asset, uint256 newIndex) external onlyLendingPool {
        _liquidityIndex[asset] = newIndex;
    }

    function setLastUpdateTimestamp(address asset, uint40 timestamp) external onlyLendingPool {
        _lastUpdateTimestamp[asset] = timestamp;
    }
}
