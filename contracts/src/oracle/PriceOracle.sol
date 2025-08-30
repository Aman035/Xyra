// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

import "../interfaces/IPriceOracle.sol";
import "../protocol/BaseContract.sol";

/// @title Price Oracle for Asset Valuation using Pyth
/// @author
/// @notice Provides USD price feeds for supported assets using Pyth
contract PriceOracle is IPriceOracle, BaseContract {
    IPyth public immutable pyth;

    /// @notice Maps ERC20 token address to Pyth price feed ID
    mapping(address => bytes32) public assetToPythId;

    /// @dev Normalization factor: Pyth prices use 10^exponent; we normalize to 18 decimals
    uint8 internal constant TARGET_DECIMALS = 18;

    address sol = 0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501;

    constructor(address _acm, address _pyth) BaseContract(_acm) {
        pyth = IPyth(_pyth);
    }

    /// @notice Admin function to set the Pyth price feed ID for an ERC20 asset
    function setAssetFeedId(address asset, bytes32 feedId) external onlyEmergencyAdmin {
        assetToPythId[asset] = feedId;
    }

    /// @notice Returns the latest price of an asset in USD with 18 decimals
    /// @param asset ERC20 token address
    /// @return price Asset price in base units (USD) with 18 decimals
    function getAssetPrice(address asset) external view override returns (uint256 price) {
        // @dev: pyth solana feeds have never been added on zeta, so shortcircuiting with hardcoded to resolve issues with solana price feed
        if (asset == sol) {
            return 200e18;
        }

        bytes32 feedId = assetToPythId[asset];
        require(feedId != bytes32(0), "Unsupported asset");

        // Require price to be not older than 60s
        PythStructs.Price memory p = pyth.getPriceNoOlderThan(feedId, 60*60);
        require(p.price > 0, "Invalid price");

        // Pyth prices are in int64 and use an exponent (e.g., -8 = 1e8)
        int256 priceInt = int256(p.price);
        int32 expo = p.expo;

        // Convert to uint256 with 18 decimals
        // Adjust for exponent to normalize to 18 decimals
        if (expo < -int32(uint32(TARGET_DECIMALS))) {
            price = uint256(priceInt) * 10 ** TARGET_DECIMALS / (10 ** uint32(uint32(-expo)));
        } else {
            price = uint256(priceInt) * 10 ** uint32(int32(uint32(TARGET_DECIMALS)) + expo);
        }
    }
}
