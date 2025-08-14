// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/accessControl/AccessControlManager.sol";
import "../src/pool/LendingPool.sol";
import "../src/poolManager/PoolManager.sol";
import "../src/collateral/CollateralManager.sol";
import "../src/interestRate/InterestRateManager.sol";
import "../src/oracle/PriceOracle.sol";
import "../src/mocks/MockToken.sol";

contract LendingPoolTest is Test {
    AccessControlManager public acm;
    LendingPool public lendingPool;
    PoolManager public poolManager;
    CollateralManager public collateralManager;
    InterestRateManager public interestRateModel;
    PriceOracle public priceOracle;

    MockToken public usdc;
    MockToken public dai;

    address public alice = address(0x1);
    address public bob = address(0x2);
    address public charlie = address(0x3);

    function setUp() public {
        vm.startPrank(charlie);
        // Deploy mock tokens
        usdc = new MockToken("USD Coin", "USDC", 6);
        dai = new MockToken("DAI Stablecoin", "DAI", 18);

        // Deploy core contracts
        acm = new AccessControlManager();
        priceOracle = new PriceOracle();
        interestRateModel = new InterestRateManager(
            address(acm),
            0.01e27,     // baseRate (1%)
            0.1e27,      // rateMultiplier (10%)
            0.8e27,      // optimalUtilization (80%)
            2e27         // jumpMultiplier (200%)
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

        vm.stopPrank();

        // Setup tokens and pools
        _setupPool(usdc);
        _setupPool(dai);

        // Fund test accounts
        usdc.mint(alice, 10000 * 1e6);  // 10,000 USDC
        dai.mint(alice, 10000 * 1e18);   // 10,000 DAI
        usdc.mint(bob, 10000 * 1e6);    // 10,000 USDC
        dai.mint(bob, 10000 * 1e18);     // 10,000 DAI

        

        // Approve lending pool
        vm.startPrank(alice);
        usdc.approve(address(lendingPool), type(uint256).max);
        dai.approve(address(lendingPool), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(lendingPool), type(uint256).max);
        dai.approve(address(lendingPool), type(uint256).max);
        vm.stopPrank();
    }

    function _setupPool(MockToken token) internal {
        console.log(acm.isPoolManager(charlie));
        vm.startPrank(charlie);
        poolManager.createVault(address(token));

        // Enable token as collateral
        poolManager.setCollateralStatus(address(token), true);

        // Set price in oracle (1 USD)
        // priceOracle.setAssetPrice(address(token), 1e18);
        vm.stopPrank();
    }

    function testSupply() public {
        address vaultAddr = poolManager.getVault(address(usdc));
        uint256 supplyAmount = 1000 * 1e6; // 1000 USDC

        // Check initial balances
        assertEq(usdc.balanceOf(alice), 10000 * 1e6);

        // Supply USDC
        vm.startPrank(alice);
        lendingPool.supply(address(usdc), supplyAmount, alice);
        usdc.transfer(address(vaultAddr), supplyAmount/10); // just to elevate the price of one share
        vm.stopPrank();

        // Supply USDC
        vm.startPrank(bob);
        lendingPool.supply(address(usdc), supplyAmount, bob);
        vm.stopPrank();
    }

    function testWithdraw() public {
        address vaultAddr = poolManager.getVault(address(usdc));
        uint256 withdrawAmount = 500 * 1e6; // 500 USDC

        // First supply
        testSupply();

        // Then withdraw half
        vm.startPrank(alice);
        lendingPool.withdraw(address(usdc), withdrawAmount, alice);
        vm.stopPrank();

        // Check final balances
        console.log(usdc.balanceOf(alice)); // 9500 USDC (10000 - 1000 + 500)
        console.log(usdc.balanceOf(vaultAddr));
    }
}
