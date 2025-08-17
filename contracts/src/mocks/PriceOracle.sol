// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

import "../interfaces/IPriceOracle.sol";
import '../protocol/BaseContract.sol';

/// @title Price Oracle for Asset Valuation using Pyth
/// @author
/// @notice Provides USD price feeds for supported assets using Pyth
contract PriceOracle is IPriceOracle, BaseContract {
    IPyth public immutable pyth;

    /// @notice Maps ERC20 token address to Pyth price feed ID
    mapping(address => bytes32) public assetToPythId;
    mapping (address => uint256) public assetPrice;

    /// @dev Normalization factor: Pyth prices use 10^exponent; we normalize to 18 decimals
    uint8 internal constant TARGET_DECIMALS = 18;

    constructor(address _acm) BaseContract(_acm)  {}

    /// @notice Admin function to set the Pyth price feed ID for an ERC20 asset
    function setAssetFeedId(address asset, bytes32 feedId) external onlyEmergencyAdmin(){
        assetToPythId[asset] = feedId;
    }

    /// @notice Returns the latest price of an asset in USD with 18 decimals
    /// @param asset ERC20 token address
    /// @return price Asset price in base units (USD) with 18 decimals
    function getAssetPrice(address asset) external view override returns (uint256 price) {
        price = assetPrice[asset];
    }

    function setAssetPrice(address asset, uint256 price) external {
        assetPrice[asset] = price;
    }
}
