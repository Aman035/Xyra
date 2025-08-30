// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/poolManager/PoolManager.sol";
import "../src/collateral/CollateralManager.sol";
import "../src/oracle/PriceOracle.sol";

contract CreateVaultScript is Script {
    PoolManager public poolManager;
    CollateralManager public collateralManager;
    PriceOracle public priceOracle;

    // Add supported tokens here
    // https://www.zetachain.com/docs/reference/network/contracts/
    address[] public tokens = [
        0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0, // zrc20	sETH.SEPOLIA
        0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501, // zrc20    SOL.SOLANA - devnet
        0xcC683A782f4B30c138787CB5576a86AF66fdc31d // zrc20    USDC.SEPOLIA         
    ];

    // Example price feed IDs as bytes32 (hex-encoded)
    // https://docs.pyth.network/price-feeds/price-feeds#feed-ids
    bytes32[] public priceFeeds = [
        bytes32(0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace), // ETH/USD
        bytes32(0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d), // SOL/USD
        bytes32(0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a)  // USDC/USD
    ];

    uint256[] public ltvs = [0.75e18, 0.75e18, 0.90e18];
    uint256[] public liqthresholds = [0.85e18, 0.85e18, 0.95e18];

    function run() external {
        vm.startBroadcast();

        priceOracle = PriceOracle(0x9B76DC7305698B67f48D9D5a9948A9f06F8c99Ff);
        collateralManager = CollateralManager(0xBa7674d7837f0Db9D40DB4b91d85697d044269B9);
        poolManager = PoolManager(0x8e386e671a3c3f75cC8a0803eEb207876F7b8FeE);

        // Setup each token in the pool
        for (uint256 i = 0; i < tokens.length; i++) {
            _setupPool(tokens[i], priceFeeds[i], ltvs[i], liqthresholds[i]);
        }

        vm.stopBroadcast();
    }

    function _setupPool(address token, bytes32 priceFeed, uint256 ltv, uint256 liqThreshold) internal {
        poolManager.createVault(token);

        // Enable token as collateral
        poolManager.setCollateralStatus(token, true);

        // Set collateral config
        collateralManager.setCollateralConfig(
            token,
            ltv, // ltv
            liqThreshold, // liquidation threshold
            1e18, // liquidation bonus
            true // isActive
        );

        // Set price feed
        priceOracle.setAssetFeedId(token, priceFeed);
    }
}
