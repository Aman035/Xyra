// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/accessControl/AccessControlManager.sol";
import "../src/pool/LendingPool.sol";
import "../src/poolManager/PoolManager.sol";
import "../src/collateral/CollateralManager.sol";
import "../src/interestRate/InterestRateManager.sol";
import "../src/mocks/PriceOracle.sol";
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
        priceOracle = new PriceOracle(address(acm));
        interestRateModel = new InterestRateManager(
            address(acm),
            0.01e27, // baseRate (1%)
            0.1e27, // rateMultiplier (10%)
            0.8e27, // optimalUtilization (80%)
            2e27 // jumpMultiplier (200%)
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

        vm.stopPrank();

        // Setup tokens and pools
        _setupPool(usdc);
        _setupPool(dai);

        // Fund test accounts
        usdc.mint(alice, 10000 * 1e6); // 10,000 USDC
        dai.mint(alice, 10000 * 1e18); // 10,000 DAI
        usdc.mint(bob, 10000 * 1e6); // 10,000 USDC
        dai.mint(bob, 10000 * 1e18); // 10,000 DAI

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

    //     function _supplyUSDC() internal {
    //     uint256 supplyAmount = 1000 * 1e6; // 1000 USDC

    //     vm.startPrank(alice);
    //     lendingPool.supply(address(usdc), supplyAmount, alice);
    //     vm.stopPrank();

    //     vm.startPrank(bob);
    //     lendingPool.supply(address(usdc), supplyAmount, bob);
    //     vm.stopPrank();
    // }

    function _supplyUSDC(address user, uint256 amount) internal {
        vm.startPrank(user);
        lendingPool.supply(address(usdc), amount, user);
        vm.stopPrank();
    }

    function _supplyDAI(address user, uint256 amount) internal {
        vm.startPrank(user);
        lendingPool.supply(address(dai), amount, user);
        vm.stopPrank();
    }

    function _borrowDAI(address user, uint256 amount) internal {
        vm.startPrank(user);
        lendingPool.borrow(address(dai), amount, user);
        vm.stopPrank();
    }

    function _setupAliceUSDCandBobDAI() internal {
        _supplyUSDC(alice, 1000 * 1e6);
        _supplyDAI(bob, 1000 * 1e18);

        vm.startPrank(charlie);
        priceOracle.setAssetPrice(address(usdc), 1e18);
        priceOracle.setAssetPrice(address(dai), 1e18);
        collateralManager.setCollateralConfig(
            address(usdc),
            0.75e18,
            0.85e18,
            1e18,
            true
        );
        collateralManager.setCollateralConfig(
            address(dai),
            0.75e18,
            0.85e18,
            1e18,
            true
        );
        vm.stopPrank();
    }

    function testSupply() public {
        address vaultAddr = poolManager.getVault(address(usdc));
        uint256 supplyAmount = 1000 * 1e6; // 1000 USDC

        // Check initial balances
        assertEq(usdc.balanceOf(alice), 10000 * 1e6);

        // Supply USDC
        _supplyUSDC(alice, supplyAmount);

        // Supply USDC
        _supplyUSDC(bob, supplyAmount);
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

    function testRepay() public {
        address asset = address(usdc);
        uint256 supplyAmount = 1000 * 1e6;
        uint256 borrowAmount = 400 * 1e6;
        uint256 repayAmount = 200 * 1e6;

        testSupply();

        // Set price for collateral
        vm.startPrank(charlie);
        priceOracle.setAssetPrice(asset, 1e18); // $1
        priceOracle.setAssetPrice(address(dai), 1e18); // $1
        collateralManager.setCollateralConfig(
            asset,
            0.75e18,
            0.85e18,
            1e18,
            true
        ); // ✅ New (1e18)
        vm.stopPrank();

        uint256 aliceBorrowAssetBalanceBefore = usdc.balanceOf(alice);

        // Borrow against collateral
        vm.startPrank(alice);
        lendingPool.borrow(asset, borrowAmount, alice);
        vm.stopPrank();

        uint256 aliceBorrowAssetBalanceAfter = usdc.balanceOf(alice);

        assertEq(
            aliceBorrowAssetBalanceAfter,
            aliceBorrowAssetBalanceBefore + borrowAmount
        );
        assertEq(lendingPool.getUserTotalDebt(alice), borrowAmount * 1e12); // scaled to 18 decimals

        // Repay half
        vm.startPrank(alice);
        lendingPool.repay(asset, repayAmount, alice);
        vm.stopPrank();

        // Check updated debt
        uint256 expectedDebt = (borrowAmount - repayAmount) * 1e12;
        assertEq(lendingPool.getUserTotalDebt(alice), expectedDebt);
    }

    function testWithdrawFailsDueToHealthFactor() public {
        address asset = address(usdc);
        uint256 supplyAmount = 1000 * 1e6;
        uint256 borrowAmount = 700 * 1e6;

        testSupply();

        vm.startPrank(charlie);
        priceOracle.setAssetPrice(asset, 1e18);
        collateralManager.setCollateralConfig(
            asset,
            0.75e18,
            0.85e18,
            1e18,
            true
        ); // ✅ New (1e18)
        vm.stopPrank();

        // Borrow 700 USDC
        vm.startPrank(alice);
        lendingPool.borrow(asset, borrowAmount, alice);
        vm.stopPrank();

        // Attempt to withdraw 500 USDC (should fail because it would drop HF < 1)
        vm.startPrank(alice);
        vm.expectRevert("LendingPool: withdraw would lower health factor");
        lendingPool.withdraw(asset, 500 * 1e6, alice);
        vm.stopPrank();
    }

    function testWithdrawAfterRepay() public {
        address asset = address(usdc);
        uint256 supplyAmount = 1000 * 1e6;
        uint256 borrowAmount = 600 * 1e6;
        uint256 repayAmount = 600 * 1e6;

        testSupply();

        vm.startPrank(charlie);
        priceOracle.setAssetPrice(asset, 1e18);
        collateralManager.setCollateralConfig(
            asset,
            0.75e18,
            0.85e18,
            1e18,
            true
        ); // ✅ New (1e18)
        vm.stopPrank();

        vm.startPrank(alice);
        lendingPool.borrow(asset, borrowAmount, alice);
        lendingPool.repay(asset, repayAmount, alice);
        uint256 aliceAssetBalanceBeforeWithdraw = usdc.balanceOf(alice);
        lendingPool.withdraw(asset, 500 * 1e6, alice);
        vm.stopPrank();

        uint256 aliceAssetBalanceAfterWithdraw = usdc.balanceOf(alice);

        // Confirm user got tokens back
        assertGe(
            aliceAssetBalanceAfterWithdraw,
            aliceAssetBalanceBeforeWithdraw + 500 * 1e6
        );
    }

    function testBorrowFailsAboveLTV() public {
        address asset = address(usdc);
        uint256 supplyAmount = 1000 * 1e6;

        testSupply();

        vm.startPrank(charlie);
        priceOracle.setAssetPrice(asset, 1e18); // $1
        collateralManager.setCollateralConfig(
            asset,
            0.75e18,
            0.85e18,
            1e18,
            true
        ); // ✅ New (1e18) // LTV: 75%
        vm.stopPrank();

        uint256 borrowAmount = 800 * 1e6; // >75% of $1000 collateral

        vm.startPrank(alice);
        vm.expectRevert("LendingPool: borrow exceeds LTV");
        lendingPool.borrow(asset, borrowAmount, alice);
        vm.stopPrank();
    }

    function testBorrowAtLTVLimit() public {
        address asset = address(usdc);
        uint256 supplyAmount = 1000 * 1e6;
        uint256 borrowAmount = 750 * 1e6; // Exactly 75%

        testSupply();

        vm.startPrank(charlie);
        priceOracle.setAssetPrice(asset, 1e18);
        collateralManager.setCollateralConfig(
            asset,
            0.75e18,
            0.85e18,
            1e18,
            true
        ); // ✅ New (1e18) // 75% LTV, 85% liq
        vm.stopPrank();

        vm.startPrank(alice);
        lendingPool.borrow(asset, borrowAmount, alice); // Should succeed
        vm.stopPrank();
    }

    function testWithdrawFailsDueToLiqThreshold() public {
        address asset = address(usdc);
        testSupply();

        vm.startPrank(charlie);
        priceOracle.setAssetPrice(asset, 1e18); // $1
        collateralManager.setCollateralConfig(
            asset,
            0.75e18,
            0.85e18,
            1e18,
            true
        ); // ✅ New (1e18) // 75% LTV, 85% liq
        vm.stopPrank();

        // Borrow 740 USDC (just under 75%)
        vm.startPrank(alice);
        lendingPool.borrow(asset, 740 * 1e6, alice);
        vm.stopPrank();

        // Try to withdraw 200 USDC → should drop health factor below 1
        vm.startPrank(alice);
        vm.expectRevert("LendingPool: withdraw would lower health factor");
        lendingPool.withdraw(asset, 200 * 1e6, alice);
        vm.stopPrank();
    }

    function testWithdrawSucceedsJustBeforeHF1() public {
        address asset = address(usdc);
        testSupply();

        vm.startPrank(charlie);
        priceOracle.setAssetPrice(asset, 1e18);
        collateralManager.setCollateralConfig(
            asset,
            0.75e18,
            0.85e18,
            1e18,
            true
        ); // ✅ New (1e18)
        vm.stopPrank();

        // Borrow 600 USDC
        vm.startPrank(alice);
        lendingPool.borrow(asset, 600 * 1e6, alice);
        vm.stopPrank();

        // Withdraw 200 USDC → keeps HF slightly above 1
        vm.startPrank(alice);
        lendingPool.withdraw(asset, 200 * 1e6, alice);
        vm.stopPrank();
    }

    function testAliceSuppliesUSDC_BobSuppliesDAI() public {
        _supplyUSDC(alice, 1000 * 1e6);
        _supplyDAI(bob, 1000 * 1e18);

        assertEq(usdc.balanceOf(alice), 9000 * 1e6);
        assertEq(dai.balanceOf(bob), 9000 * 1e18);
    }

    function testAliceBorrowsDAI() public {
        _setupAliceUSDCandBobDAI();

        uint256 aliceDaiBalanceBeforeWithdraw = dai.balanceOf(alice);

        // Alice borrows DAI against USDC collateral
        uint256 borrowAmount = 400 * 1e18;
        _borrowDAI(alice, borrowAmount);

        assertEq(
            dai.balanceOf(alice),
            aliceDaiBalanceBeforeWithdraw + borrowAmount
        );
        uint256 aliceDebt = lendingPool.getUserTotalDebt(alice);
        assertGt(aliceDebt, 0);
    }

    function testAliceBorrowRepayWithdraw() public {
        _setupAliceUSDCandBobDAI();

        // Alice borrows DAI
        uint256 borrowAmount = 400 * 1e18;
        _borrowDAI(alice, borrowAmount);

        // Alice repays part of DAI
        uint256 repayAmount = 150 * 1e18;
        dai.approve(address(lendingPool), repayAmount);
        vm.startPrank(alice);
        lendingPool.repay(address(dai), repayAmount, alice);
        vm.stopPrank();

        uint256 remainingDebt = lendingPool.getUserTotalDebt(alice);
        assertLt(remainingDebt, borrowAmount);

        // Alice withdraws part of USDC collateral
        uint256 withdrawAmount = 200 * 1e6;
        vm.startPrank(alice);
        lendingPool.withdraw(address(usdc), withdrawAmount, alice);
        vm.stopPrank();

        assertEq(
            usdc.balanceOf(alice),
            10000 * 1e6 - 1000 * 1e6 + withdrawAmount
        ); // started with 10000, supplied 1000, withdrew 200
    }

    function testAliceBorrowsDAIAgainstUSDC() public {
        _setupAliceUSDCandBobDAI();
        uint256 aliceDaiBalanceBeforeWithdraw = dai.balanceOf(alice);

        uint256 daiBorrowAmount = 700 * 1e18; // 70% of collateral

        vm.startPrank(alice);
        lendingPool.borrow(address(dai), daiBorrowAmount, alice);
        vm.stopPrank();

        // Check DAI balance increased
        assertEq(
            dai.balanceOf(alice),
            aliceDaiBalanceBeforeWithdraw + daiBorrowAmount
        );

        // Check debt accounting (scaled to 18 decimals)
        assertEq(lendingPool.getUserTotalDebt(alice), daiBorrowAmount);

        // Health factor should be >= 1 since borrow <= LTV
        uint256 hf = lendingPool.getHealthFactor(alice);
        assertGe(hf, 1e18);
    }

    function testAliceBorrowDAIExceedLTVReverts() public {
        _setupAliceUSDCandBobDAI();

        uint256 daiBorrowAmount = 800 * 1e18; // 80% of collateral > 75% LTV

        vm.startPrank(alice);
        vm.expectRevert("LendingPool: borrow exceeds LTV");
        lendingPool.borrow(address(dai), daiBorrowAmount, alice);
        vm.stopPrank();
    }

    function testAliceRepaysPartialDAIDebt() public {
        _setupAliceUSDCandBobDAI();

        uint256 daiBorrowAmount = 700 * 1e18;

        vm.startPrank(alice);
        lendingPool.borrow(address(dai), daiBorrowAmount, alice);
        vm.stopPrank();

        uint256 repayAmount = 300 * 1e18;

        // Alice approves DAI to lendingPool for repayment
        vm.startPrank(alice);
        dai.approve(address(lendingPool), repayAmount);
        lendingPool.repay(address(dai), repayAmount, alice);
        vm.stopPrank();

        uint256 expectedDebt = daiBorrowAmount - repayAmount;
        assertEq(lendingPool.getUserTotalDebt(alice), expectedDebt);
    }

    function testAliceWithdrawUSDCCollateralMaintainsHealthFactor() public {
        _setupAliceUSDCandBobDAI();

        uint256 daiBorrowAmount = 700 * 1e18;
        vm.startPrank(alice);
        lendingPool.borrow(address(dai), daiBorrowAmount, alice);
        vm.stopPrank();

        // Alice tries to withdraw 150 USDC
        uint256 withdrawAmount = 150 * 1e6;

        vm.startPrank(alice);
        lendingPool.withdraw(address(usdc), withdrawAmount, alice);
        vm.stopPrank();

        // Health factor still above 1
        uint256 hf = lendingPool.getHealthFactor(alice);
        assertGe(hf, 1e18);
    }

    function testAliceWithdrawTooMuchUSDCReverts() public {
        _setupAliceUSDCandBobDAI();

        uint256 daiBorrowAmount = 700 * 1e18;
        vm.startPrank(alice);
        lendingPool.borrow(address(dai), daiBorrowAmount, alice);
        vm.stopPrank();

        // Withdraw amount too large
        uint256 withdrawAmount = 800 * 1e6;

        vm.startPrank(alice);
        vm.expectRevert("LendingPool: withdraw would lower health factor");
        lendingPool.withdraw(address(usdc), withdrawAmount, alice);
        vm.stopPrank();
    }
}
