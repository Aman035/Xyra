// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IPriceOracle Interface for Asset Pricing Data Feeds
/// @notice Supplies asset prices to determine LTVs, health factors, and liquidation thresholds
interface IPriceOracle {
    /// @notice Gets the latest price of an asset
    /// @param asset ERC20 token address
    /// @return price Asset price in base units (e.g. ETH/USD) with 18 decimals
    function getAssetPrice(address asset) external view returns (uint256 price);
}
