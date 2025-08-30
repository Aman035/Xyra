// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/accessControl/AccessControlManager.sol";
import "../src/pool/LendingPool.sol";
import "../src/poolManager/PoolManager.sol";
import "../src/collateral/CollateralManager.sol";
import "../src/interestRate/InterestRateManager.sol";
import "../src/oracle/PriceOracle.sol";
import { Swap } from "../src/swapZrc20/Swap.sol";

contract DeployScript is Script {
    AccessControlManager public acm;
    LendingPool public lendingPool;
    PoolManager public poolManager;
    CollateralManager public collateralManager;
    InterestRateManager public interestRateModel;
    PriceOracle public priceOracle;
    Swap public swapZRC20;

    /**
     * @notice Gateway address for Zetachain testnet - https://www.zetachain.com/docs/reference/network/contracts/
     * @dev This is the address of the gateway contract that will be used to interact with the lending pool
     */
    address payable public gateway = payable(0x6c533f7fE93fAE114d0954697069Df33C9B74fD7);

    address public uniswapRouter = 0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe;

    /**
     * @notice Oracle details for Zetachain testnet - https://docs.pyth.network/price-feeds/contract-addresses/evm
     */
    address public pyth = 0x0708325268dF9F66270F1401206434524814508b;

    // Add supported tokens here
    // https://www.zetachain.com/docs/reference/network/contracts/
    address[] public tokens = [
        0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0 // zrc20	sETH.SEPOLIA
    ];

    // Example price feed IDs as bytes32 (hex-encoded)
    // https://docs.pyth.network/price-feeds/price-feeds#feed-ids
    bytes32[] public priceFeeds = [
        bytes32(0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace) // ETH/USD
    ];

    function run() external {
        vm.startBroadcast();

        // Deploy core contracts
        acm = new AccessControlManager();
        priceOracle = new PriceOracle(address(acm), pyth);
        interestRateModel = new InterestRateManager(
            address(acm),
            0.01e27, // baseRate (1%)
            0.1e27, // rateMultiplier (10%)
            0.8e27, // optimalUtilization (80%)
            2e27, // jumpMultiplier (200%)
            1e26 // reserveFactor (10%)
        );
        collateralManager = new CollateralManager(address(acm));
        poolManager = new PoolManager(address(acm));
        swapZRC20 = new Swap(gateway, uniswapRouter, 1000000);

        // Deploy main lending pool
        lendingPool = new LendingPool(
            address(acm),
            address(poolManager),
            address(interestRateModel),
            address(priceOracle),
            address(collateralManager),
            gateway,
            address(swapZRC20)
        );

        poolManager.setLendingPool(address(lendingPool));

        // Setup each token in the pool
        // for (uint256 i = 0; i < tokens.length; i++) {
        //     _setupPool(tokens[i], priceFeeds[i]);
        // }

        vm.stopBroadcast();
    }

    function _setupPool(address token, bytes32 priceFeed) internal {
        poolManager.createVault(token);

        // Enable token as collateral
        poolManager.setCollateralStatus(token, true);

        // Set collateral config
        collateralManager.setCollateralConfig(
            token,
            0.75e18, // ltv
            0.85e18, // liquidation threshold
            1e18, // liquidation bonus
            true // isActive
        );

        // Set price feed
        priceOracle.setAssetFeedId(token, priceFeed);
    }
}
