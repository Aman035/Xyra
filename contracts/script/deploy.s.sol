// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/accessControl/AccessControlManager.sol";
import "../src/pool/LendingPool.sol";
import "../src/poolManager/PoolManager.sol";
import "../src/collateral/CollateralManager.sol";
import "../src/interestRate/InterestRateManager.sol";
import "../src/oracle/PriceOracle.sol";

contract Deploy is Script {
    AccessControlManager public acm;
    LendingPool public lendingPool;
    PoolManager public poolManager;
    CollateralManager public collateralManager;
    InterestRateManager public interestRateModel;
    PriceOracle public priceOracle;

    // Add supported tokens here
    address[] public tokens = [
        0x0000000000000000000000000000000000000001, // Example token 1
        0x0000000000000000000000000000000000000002  // Example token 2
    ];

    address public pyth = 0x0000000000000000000000000000000000000003; // TODO: Update pyth address

    function run() external {
        vm.startBroadcast();

        // Deploy core contracts
        acm = new AccessControlManager();
        //TODO: update
        priceOracle = new PriceOracle(address(acm), pyth);
        interestRateModel = new InterestRateManager(
            address(acm),
            0.01e27, // baseRate (1%)
            0.1e27, // rateMultiplier (10%)
            0.8e27, // optimalUtilization (80%)
            2e27    // jumpMultiplier (200%)
        );
        collateralManager = new CollateralManager(address(acm));
        poolManager = new PoolManager(address(acm));

        // Deploy main lending pool
        lendingPool = new LendingPool(
            address(acm),
            address(poolManager),
            address(interestRateModel),
            address(priceOracle),
            address(collateralManager)
        );

        poolManager.setLendingPool(address(lendingPool));

        // Setup each token in the pool
        for (uint256 i = 0; i < tokens.length; i++) {
            _setupPool(tokens[i]);
        }

        vm.stopBroadcast();
    }

    function _setupPool(address token) internal {
        poolManager.createVault(token);

        // Enable token as collateral
        poolManager.setCollateralStatus(token, true);

        // Set collateral config
        collateralManager.setCollateralConfig(
            token,
            0.75e18, // ltv
            0.85e18, // liquidation threshold
            1e18,    // liquidation bonus
            true     // isActive
        ); 
    }
}
